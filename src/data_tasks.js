/* ============================================================
   交通任務教材（把對話走完）
   ------------------------------------------------------------
   格式說明（新增情境時照這個寫）：
   - 句塊 K(id, 日文, 羅馬拼音, 中文, 類別, 補充說明?)
       日文裡的漢字用 {漢字|かな} 標讀音，App 會顯示成振假名。
       類別：concl 結論 / neg 否定 / dir 方向 / place 地點 / time 時間 / num 號碼數字
             cond 條件 / advice 建議 / next 下一步 / reason 理由 / topic 主題 / filler 語氣開場
             ask 問句 / polite 回應 / q 對方在問（生活情境）
   - 一句話 = 句塊 id 的陣列（c），加上整句中文（zh）。日文、拼音由句塊自動組成。
   - 節點（node）：
       say  你先開口：intent 要說的意思、skel 骨架、c 參考答案
       hear 對方回答：c、zh、easy（簡單說法，關鍵資訊必須保留）、q 題目、learn 已確認、todo 下一步、fig 圖卡、point 手勢線索
       act  你怎麼接：o 選項，g = ok 能繼續 / part 需要補充 / bad 會造成錯誤行動；沒有 next 的選項會讓使用者重選
       end  結果：res = ok / slow（到了但慢）/ late（走錯後補救）
   - 題目 Q：o 第一個是正確答案；k = 答案所在句塊；ke = 簡單說法裡對應的句塊（沒有就代表簡單說法不考這題）
   - 變體 tr:true = 遷移檢查（換了沒聽過的說法），練過同級其他變體後才會出現。
   - 每一級主要只增加一個面向（axis）。
   ============================================================ */
const CK = {};
function K(id, jp, ro, zh, cat, note) {
  if (CK[id]) throw new Error('duplicate chunk ' + id);
  CK[id] = {id, jp, ro, zh, cat, note:note || ''};
  return id;
}
const CAT = {concl:'結論', neg:'否定', dir:'方向', place:'地點', time:'時間', num:'號碼・數字', cond:'條件', advice:'建議', next:'下一步', reason:'理由', topic:'主題', filler:'語氣・開場', ask:'問句', polite:'回應', q:'對方在問'};
const CRIT = new Set(['concl', 'neg', 'dir', 'place', 'time', 'num', 'advice', 'next', 'q']);
const SKEL = {
  iku_ka:{f:'この［車］は［目的地］に行きますか', zh:'這台［車］會到［目的地］嗎？'},
  ne:{f:'［重點］ですね', zh:'確認：是［重點］對吧？'},
  mae_ka:{f:'［地標］の前ですか', zh:'在［地標］前面嗎？'},
  nanban:{f:'何番の［車］ですか／何番線ですか', zh:'是幾號［車］？／幾號月台？'},
  doko:{f:'［地方］はどこですか', zh:'［地方］在哪裡？'},
  made:{f:'［目的地］まで何分くらいですか', zh:'到［目的地］大約幾分鐘？'},
  again:{f:'もう一度お願いします／ゆっくりお願いします', zh:'請再說一次／請說慢一點'},
};
const TASKS = [];
const TASK = {};
function T(def) { def.levels = def.levels || 5; def.v = {}; for (let i = 1; i <= def.levels; i++) def.v[i] = []; TASKS.push(def); TASK[def.id] = def; return def; }
function V(tid, lv, id, meta, nodes) {
  const n = {}; nodes.forEach(x => { if (n[x.id]) throw new Error('dup node ' + id + x.id); n[x.id] = x; });
  const v = Object.assign({id, tid, lv, start:nodes[0].id, nodes:n}, meta);
  TASK[tid].v[lv].push(v);
  return v;
}
const Q = (q, o, k, ke) => ({q, o, k, ke});
const O = (c, zh, g, why, next, extra) => Object.assign({c, zh, g, why, next}, extra || {});

/* ---------- 共用句塊 ---------- */
K('sumimasen', 'すみません、', 'sumimasen', '不好意思', 'polite');
K('arigatou', 'ありがとうございます。', 'arigatō gozaimasu', '謝謝', 'polite');
K('hai', 'はい、', 'hai', '是', 'concl');
K('iie', 'いいえ、', 'iie', '不', 'neg');
K('ikimasu', '{行|い}きます。', 'ikimasu', '會去（會到）', 'concl');
K('ikimasu_yo', '{行|い}きますよ。', 'ikimasu yo', '會去喔（よ＝告訴你新資訊）', 'concl');
K('ikimasuka', '{行|い}きますか。', 'ikimasu ka', '會去嗎？', 'ask');
K('hai_sou', 'はい、そうです。', 'hai, sō desu', '對，沒錯', 'concl');
K('mouichido', 'もう{一度|いちど}お{願|ねが}いします。', 'mō ichido onegai shimasu', '請再說一次', 'ask');
K('yukkuri', 'ゆっくりお{願|ねが}いします。', 'yukkuri onegai shimasu', '請說慢一點', 'ask');
K('jaa_norimasu', 'じゃあ、{乗|の}ります。', 'jā, norimasu', '那我上車', 'ask');
K('kore_ni_norimasu', 'これに{乗|の}ります。', 'kore ni norimasu', '我搭這班', 'ask');
K('sousou', 'そうそう。', 'sō sō', '對對', 'concl');

/* ============================================================
   任務一：巴士・方向對嗎（公車方向優先完成）
   查核：京都市巴士 205 系統由京都駅前開往金閣寺（京都市交通局時刻表）；
        市巴士後門上車、前門下車、下車時付錢（京都市交通局「市バスの乗り方」）。
   其他車號、班距、乘車處位置為模擬。票價正在調整，對話不放金額。
   ============================================================ */
T({id:'bus', name:'巴士・方向對嗎', place:'京都・巴士站', dest:'金閣寺', setup:'你要去金閣寺。站牌前剛好停著一台巴士，你問司機或旁邊的人。',
  sim:'模擬情境：205 系統往金閣寺、後門上前門下、下車付錢已查核；其他車號、班距、位置是練習用。',
  axis:{1:'短的禮貌回答', 2:'句子變長：多一個資訊', 3:'新詞：條件和建議', 4:'口語縮略、說得比較快', 5:'資訊量大：長回答抓重點、多輪補問'}});
K('b_kono', 'このバスは', 'kono basu wa', '這台巴士（主題）', 'topic');
K('b_kinkaku_ni', '{金閣寺|きんかくじ}に', 'Kinkakuji ni', '到金閣寺', 'place');
const B_OPEN = {id:'n1', t:'say', intent:'問：這台巴士會到金閣寺嗎？', skel:'iku_ka', c:['sumimasen', 'b_kono', 'b_kinkaku_ni', 'ikimasuka'], zh:'不好意思，這台巴士會到金閣寺嗎？', next:'n2'};
const bOpen = () => Object.assign({}, B_OPEN);

K('oriru_toki_ni', '{降|お}りる{時|とき}に', 'oriru toki ni', '下車的時候', 'time');
K('haratte', '{払|はら}ってください。', 'haratte kudasai', '請付錢', 'next');
K('okane_wa', 'お{金|かね}は', 'okane wa', '錢呢（主題）', 'topic');
K('oriru_toki_desu', '{降|お}りる{時|とき}です。', 'oriru toki desu', '是下車的時候', 'time');
K('kinkaku_iku_basu', '{金閣寺|きんかくじ}に{行|い}くバスは', 'Kinkakuji ni iku basu wa', '去金閣寺的巴士', 'topic');
K('doko_desuka', 'どこですか。', 'doko desu ka', '在哪裡？', 'ask');
K('nanban_basu', '{何番|なんばん}のバスですか。', 'nan-ban no basu desu ka', '是幾號巴士？', 'ask');
K('b205_desu', '205{番|ばん}です。', 'nihyaku-go-ban desu', '是 205 號', 'num');
K('mukou_no', '{向|む}こうの', 'mukō no', '對面的', 'place');
K('basutei_desu', 'バス{停|てい}です。', 'basutei desu', '公車站', 'place');
K('hai_kinkaku', 'はい、{金閣寺|きんかくじ}に{行|い}きます。', 'hai, Kinkakuji ni ikimasu', '是，會到金閣寺', 'concl');

V('bus', 1, 'b1a', {who:'司機', note:'這台會到'}, [bOpen(),
  {id:'n2', t:'hear', c:['hai', 'ikimasu_yo'], zh:'是，會到喔。', q:[Q('這台會到金閣寺嗎？', ['會', '不會', '要換車'], 'ikimasu_yo')], learn:['這台巴士會到金閣寺'], todo:'上車', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼做？', o:[
    O(['arigatou'], '謝謝。（上車）', 'ok', '確認會到就上車。', 'n4', {do:'上車'}),
    O(['sumimasen', 'mouichido'], '不好意思，請再說一次。', 'ok', '不確定就請他再說一次，完全沒問題。', 'n2r', {fix:true}),
    O(['jaa_norimasu'], '那我上車。', 'ok', '也可以，直接表示要搭。', 'n4', {do:'上車'})]},
  {id:'n2r', t:'hear', c:['hai_kinkaku'], zh:'是，會到金閣寺。', q:[], next:'n3'},
  {id:'n4', t:'hear', c:['oriru_toki_ni', 'haratte'], zh:'下車的時候請付錢。', q:[Q('什麼時候付錢？', ['下車的時候', '上車的時候', '不用付'], 'oriru_toki_ni')], learn:['下車時付錢'], todo:'坐到金閣寺附近下車', next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你上了車，也知道下車時再付錢。'}]);

K('ikimasen2', '{行|い}きません。', 'ikimasen', '不會去', 'neg');
V('bus', 1, 'b1b', {who:'司機', note:'這台不到'}, [bOpen(),
  {id:'n2', t:'hear', c:['iie', 'ikimasen2'], zh:'不，不會到。', q:[Q('這台會到金閣寺嗎？', ['不會', '會', '會，但要換車'], 'ikimasen2')], learn:['這台不會到'], todo:'找會到的巴士', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['kinkaku_iku_basu', 'doko_desuka'], '去金閣寺的巴士在哪裡？', 'ok', '這台不到，就問會到的那台在哪裡搭。', 'n4', {skel:'doko'}),
    O(['nanban_basu'], '是幾號巴士？', 'part', '問號碼很好，但還不知道去哪裡搭，等一下要再補問。', 'n4b', {skel:'nanban'}),
    O(['jaa_norimasu'], '那我上車。', 'bad', '他說「行きません」，上車就會坐錯方向。', null)]},
  {id:'n4b', t:'hear', c:['b205_desu'], zh:'205 號。', q:[Q('要搭幾號？', ['205 號', '25 號', '250 號'], 'b205_desu')], learn:['要搭 205 號'], todo:'問在哪裡搭', next:'n3b'},
  {id:'n3b', t:'act', q:'還差什麼？', o:[
    O(['kinkaku_iku_basu', 'doko_desuka'], '去金閣寺的巴士在哪裡？', 'ok', '號碼知道了，再問在哪裡搭。', 'n4', {skel:'doko'}),
    O(['arigatou'], '謝謝。（在這裡等）', 'part', '這裡不一定有停 205，先問清楚在哪裡搭比較保險。', null)]},
  {id:'n4', t:'hear', c:['mukou_no', 'basutei_desu'], zh:'在對面的公車站。', q:[Q('要去哪裡搭？', ['對面的公車站', '這個公車站', '車站裡面'], 'mukou_no')], learn:['在對面的公車站搭'], todo:'過馬路到對面', fig:{type:'cross', a:'你在這一側', b:'對面的公車站'}, next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你走到對面的公車站，方向對了。'}]);

K('ee_ikimasu_yo', 'ええ、{行|い}きますよ。', 'ee, ikimasu yo', '嗯，會到喔', 'concl');
V('bus', 1, 'b1t', {who:'司機', tr:true, note:'換說法：ええ／お金は'}, [bOpen(),
  {id:'n2', t:'hear', c:['ee_ikimasu_yo'], zh:'嗯，會到喔。', q:[Q('這台會到金閣寺嗎？', ['會', '不會', '他不確定'], 'ee_ikimasu_yo')], learn:['這台巴士會到金閣寺'], todo:'上車', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼做？', o:[
    O(['arigatou'], '謝謝。（上車）', 'ok', '確認會到就上車。', 'n4', {do:'上車'}),
    O(['kinkaku_iku_basu', 'doko_desuka'], '去金閣寺的巴士在哪裡？', 'bad', '他已經說這台就會到，再去找別台就錯過了。', null)]},
  {id:'n4', t:'hear', c:['okane_wa', 'oriru_toki_desu'], zh:'錢是下車的時候付。', q:[Q('什麼時候付錢？', ['下車的時候', '上車的時候', '不用付'], 'oriru_toki_desu')], learn:['下車時付錢'], todo:'坐到金閣寺附近下車', next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你上了車，知道下車時再付錢。'}]);

/* L2 句子變長 */
K('kore_wa', 'これは', 'kore wa', '這台（主題）', 'topic');
K('hantai_houkou', '{反対方向|はんたいほうこう}です。', 'hantai-hōkō desu', '是反方向', 'dir');
K('mukougawa_kara', '{向|む}こう{側|がわ}から', 'mukō-gawa kara', '從對面那一側', 'place');
K('notte_kudasai', '{乗|の}ってください。', 'notte kudasai', '請搭乘', 'next');
K('mukougawa_desune', '{向|む}こう{側|がわ}ですね。', 'mukō-gawa desu ne', '是對面那一側對吧？', 'ask');
K('mukougawa_desu', '{向|む}こう{側|がわ}です。', 'mukō-gawa desu', '是對面那一側', 'place');
K('b205_no_basu', '205{番|ばん}のバスです。', 'nihyaku-go-ban no basu desu', '是 205 號巴士', 'num');
K('hantai_jaa', '{反対|はんたい}ですか。じゃあ、{乗|の}ります。', 'hantai desu ka. jā, norimasu', '反方向嗎？那我上車', 'ask');
K('okyakusan', 'お{客|きゃく}さん、', 'okyaku-san', '這位客人（司機在叫你）', 'filler');
K('kinkaku_niwa', '{金閣寺|きんかくじ}には', 'Kinkakuji ni wa', '金閣寺的話（は＝強調）', 'place');
K('ikimasen_yo', '{行|い}きませんよ。', 'ikimasen yo', '不會去喔', 'neg');
K('tsugi_de_orite', '{次|つぎ}で{降|お}りて、', 'tsugi de orite', '在下一站下車，', 'next');
K('hantaigawa_kara_notte', '{反対側|はんたいがわ}から{乗|の}ってください。', 'hantai-gawa kara notte kudasai', '請從反方向那一側搭', 'dir');
V('bus', 2, 'b2a', {who:'司機', note:'反方向'}, [bOpen(),
  {id:'n2', t:'hear', c:['iie', 'kore_wa', 'hantai_houkou', 'mukougawa_kara', 'notte_kudasai'], zh:'不，這台是反方向。請從對面那一側搭。',
    q:[Q('這台車怎麼了？', ['方向相反', '已經客滿', '今天停駛'], 'hantai_houkou'), Q('你該去哪裡搭？', ['對面那一側', '同一站等下一班', '車站裡面'], 'mukougawa_kara')],
    learn:['這台是反方向', '要到對面那一側搭'], todo:'確認車號', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['nanban_basu'], '是幾號巴士？', 'ok', '對面會停很多台，知道號碼才不會又搭錯。', 'n4', {skel:'nanban'}),
    O(['mukougawa_desune'], '是對面那一側對吧？', 'ok', '先確認方向也很好，他會再補一句號碼。', 'n4c', {skel:'ne', fix:true}),
    O(['hantai_jaa'], '反方向嗎？那我上車。', 'bad', '知道是反方向還上車，會越坐越遠。', 'nx')]},
  {id:'n4c', t:'hear', c:['hai', 'mukougawa_desu', 'b205_no_basu'], zh:'對，是對面那一側。205 號巴士。', q:[Q('要搭幾號？', ['205 號', '25 號', '205 分鐘後'], 'b205_no_basu')], learn:['要搭 205 號'], todo:'過馬路到對面搭 205', next:'n5'},
  {id:'n4', t:'hear', c:['b205_no_basu'], zh:'是 205 號巴士。', q:[Q('要搭幾號？', ['205 號', '25 號', '250 號'], 'b205_no_basu')], learn:['要搭 205 號'], todo:'過馬路到對面搭 205', next:'n5'},
  {id:'nx', t:'hear', who:'司機（車開了一站後）', c:['okyakusan', 'b_kono', 'kinkaku_niwa', 'ikimasen_yo', 'tsugi_de_orite', 'hantaigawa_kara_notte'], zh:'這位客人，這台不會到金閣寺喔。請在下一站下車，從反方向那一側搭。',
    q:[Q('司機要你怎麼做？', ['下一站下車，到反方向搭', '坐到終點', '留在車上付錢'], 'tsugi_de_orite')], learn:['坐錯了：下一站下車', '到反方向那一側搭'], todo:'下車後到對面搭', next:'n6'},
  {id:'n5', t:'end', res:'ok', text:'你過馬路到對面，等 205 號。'},
  {id:'n6', t:'end', res:'late', text:'雖然先搭錯，但你聽懂司機的話，下一站下車，從反方向重新搭。'}]);

K('kinkakujimichi_de', '{金閣寺道|きんかくじみち}で', 'Kinkakuji-michi de', '在「金閣寺道」站', 'place', '站名是「金閣寺道」（きんかくじみち），不是「金閣寺」。');
K('orite_kudasai', '{降|お}りてください。', 'orite kudasai', '請下車', 'next');
K('kinkakujimichi_desune', '{金閣寺道|きんかくじみち}ですね。', 'Kinkakuji-michi desu ne', '是金閣寺道對吧？', 'ask');
K('anaunsu_ga', 'アナウンスがありますよ。', 'anaunsu ga arimasu yo', '會有廣播喔', 'next');
K('kinkaku_de_orimasu', '{金閣寺|きんかくじ}で{降|お}ります。', 'Kinkakuji de orimasu', '我在金閣寺下車', 'ask');
K('kinkakujimichi_desuyo', '{金閣寺道|きんかくじみち}ですよ。', 'Kinkakuji-michi desu yo', '是金閣寺道喔', 'place');
K('kinkaku_no_chikaku', '{金閣寺|きんかくじ}の{近|ちか}くです。', 'Kinkakuji no chikaku desu', '在金閣寺附近', 'place');
V('bus', 2, 'b2b', {who:'司機', note:'會到，但站名不同'}, [bOpen(),
  {id:'n2', t:'hear', c:['hai', 'ikimasu_yo', 'kinkakujimichi_de', 'orite_kudasai'], zh:'是，會到喔。請在「金閣寺道」下車。',
    q:[Q('這台會到嗎？', ['會', '不會', '要換車'], 'ikimasu_yo'), Q('要在哪一站下車？', ['金閣寺道', '金閣寺前', '終點站'], 'kinkakujimichi_de')],
    learn:['這台會到', '在「金閣寺道」下車'], todo:'上車，聽廣播', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['kinkakujimichi_desune'], '是金閣寺道對吧？', 'ok', '站名跟景點名不一樣，確認一次最保險。', 'n4', {skel:'ne', fix:true}),
    O(['arigatou'], '謝謝。（上車）', 'ok', '也可以直接上車，記住站名「金閣寺道」就好。', 'n5', {do:'上車'}),
    O(['kinkaku_de_orimasu'], '我在金閣寺下車。', 'part', '站名是「金閣寺道」，不是「金閣寺」。他會再糾正你一次。', 'n4x')]},
  {id:'n4', t:'hear', c:['hai_sou', 'anaunsu_ga'], zh:'對，沒錯。會有廣播喔。', q:[Q('怎麼知道要下車了？', ['會有廣播', '司機會叫你', '看不到站名'], 'anaunsu_ga')], learn:['到站會有廣播'], next:'n5'},
  {id:'n4x', t:'hear', c:['kinkakujimichi_desuyo', 'kinkaku_no_chikaku'], zh:'是金閣寺道喔。在金閣寺附近。', q:[Q('要在哪一站下？', ['金閣寺道', '金閣寺', '終點站'], 'kinkakujimichi_desuyo')], learn:['站名是金閣寺道，在金閣寺附近'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你上了車，在「金閣寺道」下車就到了。'}]);

K('kore_ikanai', 'これは{行|い}かないですね。', 'kore wa ikanai desu ne', '這台不會去喔', 'neg');
K('hantaigawa_basutei_kara', '{反対側|はんたいがわ}のバス{停|てい}から', 'hantai-gawa no basutei kara', '從另一側的公車站', 'place');
K('b205_ni_notte', '205{番|ばん}に{乗|の}ってください。', 'nihyaku-go-ban ni notte kudasai', '請搭 205 號', 'num');
V('bus', 2, 'b2t', {who:'司機', tr:true, note:'換說法：行かないですね／反対側のバス停'}, [bOpen(),
  {id:'n2', t:'hear', c:['kore_ikanai', 'hantaigawa_basutei_kara', 'notte_kudasai'], zh:'這台不會去喔。請從另一側的公車站搭。',
    q:[Q('這台會到嗎？', ['不會', '會', '會，但很慢'], 'kore_ikanai'), Q('要去哪裡搭？', ['另一側的公車站', '同一個公車站', '車站裡面'], 'hantaigawa_basutei_kara')],
    learn:['這台不會到', '要到另一側的公車站搭'], todo:'確認車號', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['nanban_basu'], '是幾號巴士？', 'ok', '知道號碼才不會搭錯。', 'n4', {skel:'nanban'}),
    O(['jaa_norimasu'], '那我上車。', 'bad', '他說這台不會去。', null)]},
  {id:'n4', t:'hear', c:['b205_ni_notte'], zh:'請搭 205 號。', q:[Q('要搭幾號？', ['205 號', '25 號', '205 分鐘後'], 'b205_ni_notte')], learn:['要搭 205 號'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你到另一側的公車站等 205 號。'}]);

/* L3 新詞：條件、建議 */
K('tomarimasen', '{止|と}まりません。', 'tomarimasen', '不停靠', 'neg', '止まる＝（車）停下來。止まりません：這台不停那一站。');
K('tsugi_no_205', '{次|つぎ}の205{番|ばん}に', 'tsugi no nihyaku-go-ban ni', '下一班 205 號', 'num');
K('onaji_basutei', '{同|おな}じバス{停|てい}です。', 'onaji basutei desu', '同一個公車站', 'place');
K('tsugi_205_nanpungo', '{次|つぎ}の205{番|ばん}は{何分後|なんぷんご}ですか。', 'tsugi no nihyaku-go-ban wa nanpun-go desu ka', '下一班 205 是幾分鐘後？', 'ask');
K('juppungo_kimasu', '10{分後|ぷんご}に{来|き}ますよ。', 'juppun-go ni kimasu yo', '10 分鐘後會來', 'time');
K('koko_de_mateba', 'ここで{待|ま}てばいいですか。', 'koko de mateba ii desu ka', '在這裡等就可以嗎？', 'ask');
K('koko_de_daijoubu', 'ここで{大丈夫|だいじょうぶ}です。', 'koko de daijōbu desu', '在這裡就可以', 'place');
K('jaa_kono_basu', 'じゃあ、このバスに{乗|の}ります。', 'jā, kono basu ni norimasu', '那我搭這台', 'ask');
K('kinkaku_nara', '{金閣寺|きんかくじ}なら、', 'Kinkakuji nara', '去金閣寺的話', 'cond', 'なら＝如果是…的話，後面是建議。');
K('koko_de_orite', 'ここで{降|お}りて、', 'koko de orite', '在這裡下車，', 'next');
K('norikaete', '205{番|ばん}に{乗|の}り{換|か}えてください。', 'nihyaku-go-ban ni norikaete kudasai', '請換搭 205 號', 'num', '乗り換える＝換車。');
V('bus', 3, 'b3a', {who:'司機', note:'這台不停金閣寺'}, [bOpen(),
  {id:'n2', t:'hear', c:['b_kono', 'kinkaku_niwa', 'tomarimasen', 'tsugi_no_205', 'notte_kudasai', 'onaji_basutei'], zh:'這台巴士不停金閣寺。請搭下一班 205 號，在同一個公車站。',
    q:[Q('這台怎麼了？', ['不停金閣寺', '方向相反', '已經客滿'], 'tomarimasen'), Q('他建議你怎麼做？', ['在同一站等下一班 205', '到對面搭', '搭計程車'], 'tsugi_no_205')],
    learn:['這台不停金閣寺', '在同一站等下一班 205'], todo:'確認下一班什麼時候來', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['tsugi_205_nanpungo'], '下一班 205 是幾分鐘後？', 'ok', '知道要等多久，就能決定要不要等。', 'n4'),
    O(['koko_de_mateba'], '在這裡等就可以嗎？', 'ok', '確認等車的位置也很實用。', 'n4b', {fix:true}),
    O(['jaa_kono_basu'], '那我搭這台。', 'bad', '他說這台「止まりません」，搭了會錯過金閣寺。', 'nx')]},
  {id:'n4', t:'hear', c:['juppungo_kimasu'], zh:'10 分鐘後會來。', q:[Q('下一班 205 什麼時候來？', ['10 分鐘後', '10 點整', '要坐 10 分鐘'], 'juppungo_kimasu')], learn:['205 大約 10 分鐘後來'], next:'n5'},
  {id:'n4b', t:'hear', c:['hai', 'koko_de_daijoubu'], zh:'對，在這裡就可以。', q:[Q('要在哪裡等？', ['這個公車站', '對面', '車站裡面'], 'koko_de_daijoubu')], learn:['在這裡等 205'], next:'n5'},
  {id:'nx', t:'hear', who:'司機（車開了一站後）', c:['okyakusan', 'kinkaku_nara', 'koko_de_orite', 'norikaete'], zh:'這位客人，去金閣寺的話，請在這裡下車，換搭 205 號。',
    q:[Q('司機要你怎麼做？', ['在這裡下車，換搭 205', '坐到終點', '付錢後留在車上'], 'koko_de_orite')], learn:['在這站下車換 205'], next:'n6'},
  {id:'n5', t:'end', res:'ok', text:'你在同一個公車站等下一班 205 號。'},
  {id:'n6', t:'end', res:'late', text:'雖然先搭了不停的車，但你聽懂司機的話，下車換搭 205。'}]);

K('a_gyaku', 'あ、これは{逆方向|ぎゃくほうこう}ですね。', 'a, kore wa gyaku-hōkō desu ne', '啊，這台是反方向', 'dir', '逆方向＝反方向（和 反対方向 意思一樣）。');
K('michi_wo_watatte', '{道|みち}を{渡|わた}って、', 'michi o watatte', '過馬路，', 'dir');
K('mukou_basutei_kara_notte', '{向|む}こうのバス{停|てい}から{乗|の}ってください。', 'mukō no basutei kara notte kudasai', '請從對面的公車站搭', 'place');
K('michi_205_ne', '{道|みち}を{渡|わた}って、205{番|ばん}ですね。', 'michi o watatte, nihyaku-go-ban desu ne', '過馬路，205 號對吧？', 'ask');
K('ushiro_kara', '{後|うし}ろから{乗|の}って、', 'ushiro kara notte', '從後門上車，', 'dir');
K('mae_kara', '{前|まえ}から{降|お}りてくださいね。', 'mae kara orite kudasai ne', '從前門下車喔', 'dir');
K('michi_no_mukou_desu', '{道|みち}の{向|む}こうです。', 'michi no mukō desu', '在馬路對面', 'place');
K('b205_short', '205{番|ばん}。', 'nihyaku-go-ban', '205 號', 'num');
K('gyaku_ni_norimasu', '{逆方向|ぎゃくほうこう}に{乗|の}ります。', 'gyaku-hōkō ni norimasu', '我要搭反方向的', 'ask');
V('bus', 3, 'b3b', {who:'司機', note:'反方向＋怎麼上下車'}, [bOpen(),
  {id:'n2', t:'hear', c:['a_gyaku', 'kinkaku_nara', 'michi_wo_watatte', 'mukou_basutei_kara_notte', 'b205_desu'], zh:'啊，這台是反方向喔。去金閣寺的話，請過馬路，從對面的公車站搭。205 號。',
    easy:{c:['a_gyaku', 'michi_wo_watatte', 'mukou_basutei_kara_notte', 'b205_desu'], zh:'這台是反方向。過馬路，從對面的公車站搭。205 號。'},
    q:[Q('這台方向對嗎？', ['反方向', '方向對', '他沒說'], 'a_gyaku'), Q('你要先做什麼？', ['過馬路', '上這台車', '走回車站'], 'michi_wo_watatte')],
    learn:['這台是反方向', '過馬路到對面'], todo:'確認車號', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['michi_205_ne'], '過馬路，205 號對吧？', 'ok', '把「要做的事＋號碼」確認一次，就不會搭錯。', 'n4', {skel:'ne', fix:true}),
    O(['sumimasen', 'mouichido'], '不好意思，請再說一次。', 'ok', '沒聽清楚就請他再說，他會說得更短。', 'n2r', {fix:true}),
    O(['gyaku_ni_norimasu'], '我要搭反方向的。', 'bad', '逆方向 是他告訴你「這台不對」，不是叫你搭它。', null)]},
  {id:'n2r', t:'hear', c:['michi_no_mukou_desu', 'b205_short'], zh:'在馬路對面。205 號。', q:[Q('要搭幾號？在哪？', ['205，馬路對面', '205，這裡', '25，馬路對面'], 'b205_short')], learn:['馬路對面搭 205'], next:'n3'},
  {id:'n4', t:'hear', c:['sousou', 'ushiro_kara', 'mae_kara'], zh:'對對。從後門上車，從前門下車喔。',
    q:[Q('怎麼上下車？', ['後門上車、前門下車', '前門上車、後門下車', '都從前門'], 'ushiro_kara')], learn:['後門上、前門下'], fig:{type:'steps', s:[['↑', '過馬路'], ['■', '對面公車站：205'], ['↗', '後門上車'], ['↙', '前門下車']]}, next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你過馬路搭 205 號，後門上車，下車時從前門下。'}]);

K('toranai', 'これ、{金閣寺|きんかくじ}は{通|とお}らないんですよ。', 'kore, Kinkakuji wa tōranai n desu yo', '這台不經過金閣寺', 'neg', '通る＝經過。通らない＝不經過。');
K('b205_wo_matte', '205{番|ばん}を{待|ま}ってください。', 'nihyaku-go-ban o matte kudasai', '請等 205 號', 'num');
K('b205_yoku', '205{番|ばん}はよく{来|き}ますか。', 'nihyaku-go-ban wa yoku kimasu ka', '205 號常來嗎？', 'ask');
K('juppun_oki', 'だいたい10{分|ぷん}おきに{来|き}ます。', 'daitai juppun-oki ni kimasu', '大約每 10 分鐘來一班', 'time', '〜おきに＝每隔…。和「10分後」（10 分鐘後）不同。');
V('bus', 3, 'b3t', {who:'司機', tr:true, note:'換說法：通らない／おきに'}, [bOpen(),
  {id:'n2', t:'hear', c:['toranai', 'b205_wo_matte'], zh:'這台不經過金閣寺喔。請等 205 號。',
    q:[Q('這台會到嗎？', ['不經過金閣寺', '會到', '要在中途換車'], 'toranai'), Q('他要你怎麼做？', ['等 205 號', '搭這台', '到對面搭'], 'b205_wo_matte')],
    learn:['這台不經過金閣寺', '等 205 號'], todo:'確認多久來一班', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['b205_yoku'], '205 號常來嗎？', 'ok', '知道多久一班，就知道要不要等。', 'n4'),
    O(['jaa_kono_basu'], '那我搭這台。', 'bad', '他說這台「通らない」（不經過）。', null)]},
  {id:'n4', t:'hear', c:['juppun_oki'], zh:'大約每 10 分鐘來一班。', q:[Q('205 號多久來一班？', ['大約每 10 分鐘', '10 分鐘後只有一班', '要坐 10 分鐘'], 'juppun_oki')], learn:['205 大約每 10 分鐘一班'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你在站牌等 205 號，大約 10 分鐘就有一班。'}]);

/* L4 口語縮略、比較快 */
K('e_kinkaku', 'え、{金閣寺|きんかくじ}？', 'e, Kinkakuji?', '欸，金閣寺？（重複你的目的地＝在確認）', 'filler');
K('gyaku_ssu', 'これ{逆|ぎゃく}っすよ。', 'kore gyaku ssu yo', '這台是反的啦', 'dir', 'っす＝です 的年輕人說法。逆＝相反。');
K('acchi_ssu', 'あっちっす、あっち。', 'atchi ssu, atchi', '那邊、那邊', 'place', 'あっち＝あちら 的口語。對方通常會用手指。');
K('watatta_toko', '{道|みち}{渡|わた}ったとこのバス{停|てい}。', 'michi watatta toko no basutei', '過了馬路那裡的公車站', 'place', 'とこ＝ところ。口語常省略「を」。');
K('kono_basu_hantai', 'このバスは{反対方向|はんたいほうこう}です。', 'kono basu wa hantai-hōkō desu', '這台巴士是反方向', 'dir');
K('mukou_no_basutei', '{向|む}こうのバス{停|てい}です。', 'mukō no basutei desu', '是對面的公車站', 'place');
K('nanban_noreba', '{何番|なんばん}のバスに{乗|の}ればいいですか。', 'nan-ban no basu ni noreba ii desu ka', '我該搭幾號巴士？', 'ask');
K('gyaku_daijoubu', '{逆|ぎゃく}ですか。じゃあ、このバスで{大丈夫|だいじょうぶ}ですね。', 'gyaku desu ka. jā, kono basu de daijōbu desu ne', '反的嗎？那這台沒問題吧', 'ask');
K('acchi_mukou_ka', 'あっちって、{道|みち}の{向|む}こうですか。', 'atchi tte, michi no mukō desu ka', '你說那邊，是馬路對面嗎？', 'ask');
K('sousou_michi', 'そうそう、{道|みち}の{向|む}こう。', 'sō sō, michi no mukō', '對對，馬路對面', 'place');
K('eeto', 'えーと、', 'ēto', '嗯…（在想）', 'filler');
K('b205_ka_iya', '205か…いや、', 'nihyaku-go ka… iya', '205 吧…不對，', 'num');
K('wakannai', 'ちょっと{分|わ}かんないっす。', 'chotto wakannai ssu', '我不太確定', 'concl', '分かんない＝分からない（不知道）。他不確定，資訊不能直接當真。');
K('kaite_aru_to', 'バス{停|てい}に{書|か}いてあると{思|おも}いますよ。', 'basutei ni kaite aru to omoimasu yo', '公車站牌上應該有寫', 'next');
K('b205_ni_norimasu', 'じゃあ、205{番|ばん}に{乗|の}ります。', 'jā, nihyaku-go-ban ni norimasu', '那我搭 205 號', 'ask');
V('bus', 4, 'b4a', {who:'路人（年輕人）', note:'口語＋對方不確定'}, [bOpen(),
  {id:'n2', t:'hear', c:['e_kinkaku', 'gyaku_ssu', 'acchi_ssu', 'watatta_toko'], zh:'欸，金閣寺？這台是反的啦。那邊、那邊。過了馬路那裡的公車站。',
    easy:{c:['kono_basu_hantai', 'michi_wo_watatte', 'mukou_no_basutei'], zh:'這台巴士是反方向。過馬路，是對面的公車站。'},
    point:'他一邊說一邊用手指著馬路對面的公車站。',
    q:[Q('結論是？', ['這台方向相反', '這台會到', '金閣寺今天沒開'], 'gyaku_ssu', 'kono_basu_hantai'), Q('他叫你去哪？', ['過馬路後的公車站', '走回車站', '就在這裡等'], 'watatta_toko', 'mukou_no_basutei')],
    learn:['這台是反方向', '過馬路到對面的公車站'], todo:'確認車號', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['sumimasen', 'nanban_noreba'], '請問我該搭幾號巴士？', 'ok', '對方講得很快，你用自己會的禮貌說法問下一步就好。', 'n4', {skel:'nanban'}),
    O(['acchi_mukou_ka'], '你說那邊，是馬路對面嗎？', 'ok', '「あっち」很模糊，用看得到的東西確認，非常好。', 'n3b', {fix:true}),
    O(['gyaku_daijoubu'], '反的嗎？那這台沒問題吧。', 'bad', '逆＝相反，他是說這台「不行」。', null)]},
  {id:'n3b', t:'hear', c:['sousou_michi'], zh:'對對，馬路對面。', q:[], learn:['確認：是馬路對面'], next:'n3'},
  {id:'n4', t:'hear', c:['eeto', 'b205_ka_iya', 'wakannai', 'kaite_aru_to'], zh:'嗯…205 吧…不對，我不太確定。公車站牌上應該有寫。',
    q:[Q('他確定車號嗎？', ['不確定，叫你看站牌', '確定是 205', '確定是 25'], 'wakannai')], learn:['他不確定車號，要看站牌或問司機'], todo:'上車前跟司機確認', next:'n5'},
  {id:'n5', t:'act', q:'你走到對面的公車站，一台巴士進站。你要怎麼做？', o:[
    O(['sumimasen', 'b_kono', 'b_kinkaku_ni', 'ikimasuka'], '（問司機）這台巴士會到金閣寺嗎？', 'ok', '對方不確定時，上車前再問一次最保險。', 'n6', {skel:'iku_ka', fix:true}),
    O(['b205_ni_norimasu'], '那我搭 205 號。（直接上車）', 'part', '他說「205か…分かんない」，不確定。可以上車前再問一句。', 'n6b'),
    O(['arigatou'], '謝謝。（隨便上一台）', 'bad', '還不知道這台到不到，可能又搭錯。', null)]},
  {id:'n6', t:'hear', who:'司機', c:['hai', 'ikimasu_yo'], zh:'是，會到喔。', q:[Q('這台會到嗎？', ['會', '不會', '要換車'], 'ikimasu_yo')], learn:['司機確認：這台會到'], next:'n7'},
  {id:'n6b', t:'hear', who:'司機（你上車時順便問了一句）', c:['hai', 'ikimasu_yo'], zh:'是，會到喔。', q:[], learn:['司機確認：這台會到'], next:'n7'},
  {id:'n7', t:'end', res:'ok', text:'路人不太確定，你上車前跟司機確認，搭上會到金閣寺的巴士。'}]);

K('aa_kinkaku_ne', 'あー、{金閣寺|きんかくじ}ね。', 'ā, Kinkakuji ne', '啊，金閣寺啊', 'filler');
K('kore_de_ikemasu', 'これで{行|い}けますよ。', 'kore de ikemasu yo', '搭這台就能到', 'concl');
K('kedo_konderu', 'けど、{混|こ}んでるんで、', 'kedo, konderu n de', '不過很擠，所以…', 'reason', 'けど＝不過；〜んで＝〜ので（因為）的口語。');
K('tsugi_demo', '{次|つぎ}のでもいいかも。', 'tsugi no de mo ii kamo', '搭下一班也可以吧', 'advice');
K('sugu_kurunde', 'すぐ{来|く}るんで。', 'sugu kuru n de', '因為馬上就來', 'time');
K('tsugi_sugu', '{次|つぎ}のはすぐ{来|き}ますか。', 'tsugi no wa sugu kimasu ka', '下一班馬上會來嗎？', 'ask');
K('go_fun_kana', 'うん、5{分|ふん}ぐらいかな。', 'un, go-fun gurai ka na', '嗯，大概 5 分鐘吧', 'time', 'かな＝「…吧」，表示不太確定。');
K('konderu_q', '{混|こ}んでるんですか。', 'konderu n desu ka', '很擠嗎？', 'ask');
K('ima_ippai', 'はい、{今|いま}はいっぱいです。', 'hai, ima wa ippai desu', '對，現在很滿', 'reason');
V('bus', 4, 'b4b', {who:'站務人員', note:'這台會到，但建議等下一班'}, [bOpen(),
  {id:'n2', t:'hear', c:['aa_kinkaku_ne', 'kore_de_ikemasu', 'kedo_konderu', 'tsugi_demo', 'sugu_kurunde'], zh:'啊，金閣寺啊。搭這台就能到喔。不過很擠，搭下一班也可以吧，因為馬上就來。',
    easy:{c:['kore_de_ikemasu', 'tsugi_demo', 'sugu_kurunde'], zh:'搭這台就能到。下一班也可以，馬上就來。'},
    q:[Q('這台會到嗎？', ['會到', '不會到', '要換車'], 'kore_de_ikemasu'), Q('他建議什麼？', ['可以等下一班，很快就來', '一定要搭這班', '下一班要很久'], 'tsugi_demo')],
    learn:['這台會到，但很擠', '下一班很快來'], todo:'決定搭這班還是等', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼做？', o:[
    O(['tsugi_sugu'], '下一班馬上會來嗎？', 'ok', '想等的話，先確認要等多久。', 'n4'),
    O(['kore_ni_norimasu'], '我搭這班。', 'ok', '擠一點也能到，這也是合理的決定。', 'n5b', {do:'上車'}),
    O(['konderu_q'], '很擠嗎？', 'part', '可以，他會再說明一次；之後還是要決定搭哪班。', 'n3c')]},
  {id:'n3c', t:'hear', c:['ima_ippai'], zh:'對，現在很滿。', q:[], learn:['這班現在很滿'], next:'n3'},
  {id:'n4', t:'hear', c:['go_fun_kana'], zh:'嗯，大概 5 分鐘吧。', q:[Q('下一班多久來？', ['大約 5 分鐘（他不太確定）', '一定 5 分鐘後', '要坐 5 分鐘'], 'go_fun_kana')], learn:['下一班大約 5 分鐘（他說「かな」，不太確定）'], todo:'看站牌時刻表確認', next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你等下一班。他說「5分ぐらいかな」只是大概，站牌上的時刻表可以再確認。'},
  {id:'n5b', t:'end', res:'ok', text:'你擠上這班，也會到金閣寺。'}]);

K('aa_sore_hantai', 'ああ、それは{反対|はんたい}。', 'ā, sore wa hantai', '啊，那台是反的', 'dir');
K('kocchi_janakute', 'こっちじゃなくて、{向|む}こう。', 'kotchi ja nakute, mukō', '不是這邊，是對面', 'place', '〜じゃなくて＝不是…而是…');
K('shingou_watatte_sugu', '{信号|しんごう}{渡|わた}ってすぐ。', 'shingō watatte sugu', '過了紅綠燈就到', 'dir');
K('shingou_mukou', '{信号|しんごう}を{渡|わた}って、{向|む}こうのバス{停|てい}です。', 'shingō o watatte, mukō no basutei desu', '過紅綠燈，在對面的公車站', 'place');
K('yuki_noreba', '「{金閣寺行|きんかくじゆ}き」って{書|か}いてあるのに{乗|の}ればいいよ。', '“Kinkakuji-yuki” tte kaite aru no ni noreba ii yo', '搭寫著「金閣寺行き」的就好', 'advice', '〜行き＝開往…。車頭和車側會寫終點或主要方向。');
V('bus', 4, 'b4t', {who:'路人（阿伯）', tr:true, note:'換說法：こっちじゃなくて／〜行き'}, [bOpen(),
  {id:'n2', t:'hear', c:['aa_sore_hantai', 'kocchi_janakute', 'shingou_watatte_sugu'], zh:'啊，那台是反的。不是這邊，是對面。過了紅綠燈就到。',
    easy:{c:['kono_basu_hantai', 'shingou_mukou'], zh:'這台巴士是反方向。過紅綠燈，在對面的公車站。'},
    q:[Q('這台方向對嗎？', ['反方向', '方向對', '他不知道'], 'aa_sore_hantai', 'kono_basu_hantai'), Q('要去哪裡？', ['過紅綠燈到對面', '這邊等', '往回走'], 'shingou_watatte_sugu', 'shingou_mukou')],
    learn:['這台是反方向', '過紅綠燈到對面'], todo:'確認要搭哪台', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['mukougawa_desune'], '是對面那一側對吧？', 'ok', '確認方向，他會再補充要搭哪台。', 'n4', {skel:'ne', fix:true}),
    O(['sumimasen', 'yukkuri'], '不好意思，請說慢一點。', 'ok', '聽不清楚就請他慢一點。', 'n2s', {fix:true}),
    O(['gyaku_daijoubu'], '反的嗎？那這台沒問題吧。', 'bad', '反＝相反，這台不行。', null)]},
  {id:'n2s', t:'hear', c:['kono_basu_hantai', 'shingou_mukou'], zh:'這台巴士是反方向。過紅綠燈，在對面的公車站。', q:[], learn:['過紅綠燈，到對面的公車站'], next:'n3'},
  {id:'n4', t:'hear', c:['sousou', 'yuki_noreba'], zh:'對對。搭寫著「金閣寺行き」的就好。', q:[Q('該搭哪台？', ['車上寫「金閣寺行き」的', '寫「京都駅」的', '任何一台'], 'yuki_noreba')], learn:['找寫著「金閣寺行き」的車'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你過紅綠燈到對面，找寫著「金閣寺行き」的巴士。'}]);

/* L5 資訊量大、多輪 */
K('kinkaku_desuka', '{金閣寺|きんかくじ}ですか？', 'Kinkakuji desu ka?', '金閣寺嗎？（確認目的地）', 'filler');
K('iku_koto_wa', 'このバスも{行|い}くことは{行|い}くんですけど、', 'kono basu mo iku koto wa iku n desu kedo', '這台到是會到，但是…', 'concl', '〜ことは〜けど：「…是…沒錯，但是」，後面才是重點。');
K('toomawari', 'すごく{遠回|とおまわ}りなんですよ。', 'sugoku tōmawari nan desu yo', '繞很遠的路', 'reason');
K('mukou_205_hou', '{道|みち}の{向|む}こうから205{番|ばん}に{乗|の}ったほうが、', 'michi no mukō kara nihyaku-go-ban ni notta hō ga', '從馬路對面搭 205 號的話', 'advice', '〜たほうが＝…比較好。');
K('nijuppun_hayaku', '20{分|ぷん}くらい{早|はや}く{着|つ}きます。', 'nijuppun kurai hayaku tsukimasu', '大約早 20 分鐘到', 'time');
K('toomawari_desu', '{遠回|とおまわ}りです。', 'tōmawari desu', '是繞遠路', 'reason');
K('mukou_de_205', '{向|む}こうで205{番|ばん}に{乗|の}ると、', 'mukō de nihyaku-go-ban ni noru to', '在對面搭 205 號的話', 'advice');
K('mukou_205_ne', '{向|む}こうの205{番|ばん}ですね。', 'mukō no nihyaku-go-ban desu ne', '對面的 205 號對吧？', 'ask');
K('shingou_sugu', '{信号|しんごう}がすぐそこにあるので、', 'shingō ga sugu soko ni aru node', '紅綠燈就在那邊，所以…', 'place');
K('soko_de_watatte', 'そこで{渡|わた}ってくださいね。', 'soko de watatte kudasai ne', '請在那裡過馬路喔', 'dir');
K('ikimasu_ne_norimasu', '{行|い}きますね。じゃあ、{乗|の}ります。', 'ikimasu ne. jā, norimasu', '會到對吧，那我上車', 'ask');
K('nanban_desuka', 'すみません、{何番|なんばん}ですか。', 'sumimasen, nan-ban desu ka', '不好意思，是幾號？', 'ask');
K('b205_michi', '205{番|ばん}です。{道|みち}の{向|む}こうから。', 'nihyaku-go-ban desu. michi no mukō kara', '205 號，從馬路對面', 'num');
V('bus', 5, 'b5a', {who:'排隊的阿姨', note:'「會到，但是…」'}, [bOpen(),
  {id:'n2', t:'hear', c:['kinkaku_desuka', 'iku_koto_wa', 'toomawari', 'mukou_205_hou', 'nijuppun_hayaku'], zh:'金閣寺嗎？這台到是會到，可是繞很遠的路喔。從馬路對面搭 205 號，大概會早 20 分鐘到。',
    easy:{c:['b_kono', 'toomawari_desu', 'mukou_de_205', 'nijuppun_hayaku'], zh:'這台巴士是繞遠路。在對面搭 205 號的話，大約早 20 分鐘到。'},
    q:[Q('這台會到金閣寺嗎？', ['會，但繞很遠', '不會', '會，而且最快'], 'iku_koto_wa', 'toomawari_desu'), Q('她建議你怎麼做？', ['到對面搭 205', '就搭這台', '搭計程車'], 'mukou_205_hou', 'mukou_de_205'), Q('可以早多少？', ['大約 20 分鐘', '大約 2 分鐘', '20 分鐘後發車'], 'nijuppun_hayaku', 'nijuppun_hayaku')],
    learn:['這台會到，但繞很遠', '對面的 205 大約早 20 分鐘'], todo:'決定要不要過馬路搭 205', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼做？', o:[
    O(['mukou_205_ne'], '對面的 205 號對吧？', 'ok', '聽到「行く」不要馬上上車，けど 後面的建議才是重點。', 'n4', {skel:'ne', fix:true}),
    O(['ikimasu_ne_norimasu'], '會到對吧，那我上車。', 'part', '會到，但大約多花 20 分鐘。不是錯，只是比較慢。', 'n5s', {do:'上車'}),
    O(['nanban_desuka'], '不好意思，是幾號？', 'ok', '再問一次沒問題，她會再說一次。', 'n2r', {fix:true})]},
  {id:'n2r', t:'hear', c:['b205_michi'], zh:'205 號，從馬路對面。', q:[], learn:['205 號，在馬路對面'], next:'n3'},
  {id:'n4', t:'hear', c:['hai', 'shingou_sugu', 'soko_de_watatte'], zh:'對。紅綠燈就在那邊，請在那裡過馬路喔。',
    q:[Q('她要你在哪裡過馬路？', ['旁邊的紅綠燈', '地下道', '哪裡都可以'], 'shingou_sugu')], learn:['在旁邊的紅綠燈過馬路'], fig:{type:'cross', a:'你（紅綠燈旁）', b:'對面公車站：205'}, next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你從旁邊的紅綠燈過馬路，搭 205 號，早 20 分鐘到金閣寺。'},
  {id:'n5s', t:'end', res:'slow', text:'你搭了這台，會到金閣寺，但繞路大約多花 20 分鐘。'}]);

K('ikanain_desu', '{行|い}かないんです。', 'ikanai n desu', '不會去', 'neg');
K('demo', 'でも、', 'demo', '不過（後面是辦法）', 'cond');
K('tsugi_teiryuujo', '{次|つぎ}の{停留所|ていりゅうじょ}で{降|お}りて、', 'tsugi no teiryūjo de orite', '在下一個站牌下車，', 'next', '停留所＝公車站牌。');
K('norikaereba', '205{番|ばん}に{乗|の}り{換|か}えれば{行|い}けますよ。', 'nihyaku-go-ban ni norikaereba ikemasu yo', '換搭 205 號就能到', 'advice');
K('norikae_no_basutei', '{乗|の}り{換|か}えのバス{停|てい}は、', 'norikae no basutei wa', '轉乘的公車站呢', 'topic');
K('orita_tokoro', '{降|お}りたところと{同|おな}じです。', 'orita tokoro to onaji desu', '跟下車的地方一樣', 'place');
K('kono_basu_ikimasen', 'このバスは{行|い}きません。', 'kono basu wa ikimasen', '這台巴士不會去', 'neg');
K('tsugi_205_ne', '{次|つぎ}で{降|お}りて、205{番|ばん}ですね。', 'tsugi de orite, nihyaku-go-ban desu ne', '下一站下車，205 號對吧？', 'ask');
K('norikae_tte', '「{乗|の}り{換|か}え」って{何|なん}ですか。', '“norikae” tte nan desu ka', '「乗り換え」是什麼？', 'ask');
K('basu_kaeru', 'バスを{変|か}えることです。', 'basu o kaeru koto desu', '就是換一台巴士', 'concl');
K('shuuten_made', 'じゃあ、{終点|しゅうてん}まで{乗|の}ります。', 'jā, shūten made norimasu', '那我坐到終點', 'ask');
K('shuuten_desu', '{終点|しゅうてん}ですよ。', 'shūten desu yo', '終點站到了', 'place');
K('tooi_desu', '{金閣寺|きんかくじ}は、ここからだと{遠|とお}いですね。', 'Kinkakuji wa, koko kara da to tōi desu ne', '金閣寺從這裡過去很遠', 'place');
K('modotte', '{反対方向|はんたいほうこう}のバスで{戻|もど}ってください。', 'hantai-hōkō no basu de modotte kudasai', '請搭反方向的巴士回去', 'next');
V('bus', 5, 'b5b', {who:'司機', note:'不到，但可以轉乘'}, [bOpen(),
  {id:'n2', t:'hear', c:['b_kono', 'kinkaku_niwa', 'ikanain_desu', 'demo', 'tsugi_teiryuujo', 'norikaereba', 'norikae_no_basutei', 'orita_tokoro'], zh:'這台巴士不會到金閣寺。不過，在下一個站牌下車，換搭 205 號就能到。轉乘的公車站跟下車的地方一樣。',
    easy:{c:['kono_basu_ikimasen', 'demo', 'tsugi_teiryuujo', 'b205_ni_notte', 'onaji_basutei'], zh:'這台巴士不會去。不過，在下一個站牌下車，請搭 205 號。同一個公車站。'},
    q:[Q('這台會到金閣寺嗎？', ['不會，但可以轉乘', '會直接到', '完全到不了'], 'ikanain_desu', 'kono_basu_ikimasen'), Q('要在哪裡下車？', ['下一個站牌', '終點站', '金閣寺道'], 'tsugi_teiryuujo', 'tsugi_teiryuujo'), Q('轉乘的公車站在哪？', ['下車的同一個地方', '馬路對面', '車站裡面'], 'orita_tokoro', 'onaji_basutei')],
    learn:['這台不到，但下一站可以換 205', '在下車的同一個站牌換車'], todo:'上車，下一站下車', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼做？', o:[
    O(['tsugi_205_ne'], '下一站下車，205 號對吧？', 'ok', '長回答只挑「要做的事」確認一次。', 'n5', {skel:'ne', fix:true}),
    O(['norikae_tte'], '「乗り換え」是什麼？', 'ok', '聽不懂的關鍵詞直接問，是很好的求助。', 'n3b', {fix:true}),
    O(['shuuten_made'], '那我坐到終點。', 'bad', '他說的是「次の停留所で降りて」（下一站下車）。', 'nx')]},
  {id:'n3b', t:'hear', c:['basu_kaeru'], zh:'就是換一台巴士。', q:[], learn:['乗り換え＝換車'], next:'n3'},
  {id:'nx', t:'hear', who:'司機（到了終點）', c:['shuuten_desu', 'tooi_desu', 'modotte'], zh:'終點站到了。金閣寺從這裡過去很遠，請搭反方向的巴士回去。',
    q:[Q('現在該怎麼辦？', ['搭反方向的巴士回去', '在這裡等 205', '走路過去'], 'modotte')], learn:['坐過頭了，要搭反方向回去'], next:'n6'},
  {id:'n5', t:'end', res:'ok', text:'你上車，下一站下車，在同一個站牌換搭 205 號。'},
  {id:'n6', t:'end', res:'late', text:'你坐到終點，只好搭反方向回去。下次聽到「次の停留所で降りて」就要準備下車。'}]);

K('kinkaku_deshitara', '{金閣寺|きんかくじ}でしたら、', 'Kinkakuji deshitara', '如果是去金閣寺', 'cond', 'でしたら＝なら 的客氣說法。');
K('b205_desune', '205{番|ばん}ですね。', 'nihyaku-go-ban desu ne', '是 205 號', 'num');
K('noriba_wa', 'のりばは、', 'noriba wa', '乘車處呢', 'topic');
K('oudan_saki', '{向|む}こうの{横断歩道|おうだんほどう}を{渡|わた}った{先|さき}になります。', 'mukō no ōdan-hodō o watatta saki ni narimasu', '在過了那邊斑馬線之後的地方', 'place', '横断歩道＝斑馬線。');
K('chodo_dechatta', '{今|いま}ちょうど{出|で}ちゃったんで、', 'ima chōdo dechatta n de', '剛好剛開走，所以…', 'reason');
K('jugofungo', '{次|つぎ}は15{分後|ふんご}ですね。', 'tsugi wa jūgo-fun-go desu ne', '下一班是 15 分鐘後', 'time');
K('oudan_watatte', '{横断歩道|おうだんほどう}を{渡|わた}ってください。', 'ōdan-hodō o watatte kudasai', '請過斑馬線', 'dir');
K('oudan_mukou_ne', '{横断歩道|おうだんほどう}の{向|む}こうですね。', 'ōdan-hodō no mukō desu ne', '斑馬線對面對吧？', 'ask');
K('jugoban_ka', '15{番|ばん}のバスですか。', 'jūgo-ban no basu desu ka', '是 15 號巴士嗎？', 'ask');
K('ie_205_15fungo', 'いえ、205{番|ばん}です。15{分後|ふんご}に{来|き}ます。', 'ie, nihyaku-go-ban desu. jūgo-fun-go ni kimasu', '不，是 205 號。15 分鐘後來', 'num');
K('taxi', 'じゃあ、タクシーで{行|い}きます。', 'jā, takushī de ikimasu', '那我搭計程車去', 'ask');
V('bus', 5, 'b5t', {who:'巴士總站的服務人員', tr:true, note:'換說法：でしたら／〜分後', setup:'你在京都車站的巴士總站附近，要去金閣寺，問了服務人員。'}, [
  {id:'n1', t:'say', intent:'問：去金閣寺的巴士在哪裡？', skel:'doko', c:['sumimasen', 'kinkaku_iku_basu', 'doko_desuka'], zh:'不好意思，去金閣寺的巴士在哪裡？', next:'n2'},
  {id:'n2', t:'hear', c:['kinkaku_deshitara', 'b205_desune', 'noriba_wa', 'oudan_saki', 'chodo_dechatta', 'jugofungo'], zh:'如果是去金閣寺，是 205 號。乘車處在過了那邊斑馬線之後的地方。剛好剛開走，下一班是 15 分鐘後。',
    easy:{c:['b205_desune', 'oudan_watatte', 'jugofungo'], zh:'是 205 號。請過斑馬線。下一班是 15 分鐘後。'},
    q:[Q('要搭幾號？', ['205 號', '15 號', '25 號'], 'b205_desune', 'b205_desune'), Q('要去哪裡搭？', ['過了斑馬線那邊', '就在這裡', '地下道裡'], 'oudan_saki', 'oudan_watatte'), Q('下一班什麼時候？', ['15 分鐘後', '15 點', '要坐 15 分鐘'], 'jugofungo', 'jugofungo')],
    learn:['搭 205 號', '過斑馬線那邊搭', '下一班 15 分鐘後'], todo:'過斑馬線去等', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['oudan_mukou_ne'], '斑馬線對面對吧？', 'ok', '確認位置就可以出發了。', 'n5', {skel:'ne', fix:true}),
    O(['jugoban_ka'], '是 15 號巴士嗎？', 'part', '把「15分後」聽成「15番」很常見。用問句確認，對方會糾正你。', 'n3b', {fix:true}),
    O(['taxi'], '那我搭計程車去。', 'ok', '不想等 15 分鐘，搭計程車也是辦法，只是比較貴。', 'n5t', {do:'搭計程車'})]},
  {id:'n3b', t:'hear', c:['ie_205_15fungo'], zh:'不，是 205 號。15 分鐘後來。', q:[Q('他糾正了什麼？', ['是 205 號，15 分鐘後來', '是 15 號', '是 205 號，15 點來'], 'ie_205_15fungo')], learn:['糾正：205 號，15 分鐘後來'], next:'n3'},
  {id:'n5', t:'end', res:'ok', text:'你過斑馬線，在乘車處等 15 分鐘後的 205 號。'},
  {id:'n5t', t:'end', res:'ok', text:'你決定搭計程車去金閣寺，不用等車。'}]);

/* ============================================================
   任務二：電車・這班對嗎（模擬情境：月台號碼、時間、所需時間為練習用）
   ============================================================ */
T({id:'train', name:'電車・這班對嗎', place:'JR 新大阪站・月台', dest:'京都', setup:'你在新大阪站要去京都，眼前停著一班電車。你問站務員。',
  sim:'模擬情境：月台號碼、發車時間、所需時間都是練習用，不是實際時刻。',
  axis:{1:'短的禮貌回答', 2:'句子變長：多一個資訊', 3:'新詞：各站停和快速', 4:'口語縮略、說得比較快', 5:'資訊量大：長回答抓重點'}});
K('t_kono', 'この{電車|でんしゃ}は', 'kono densha wa', '這班電車（主題）', 'topic');
K('kyoto_ni', '{京都|きょうと}に', 'Kyōto ni', '到京都', 'place');
const tOpen = () => ({id:'n1', t:'say', intent:'問：這班電車會到京都嗎？', skel:'iku_ka', c:['sumimasen', 't_kono', 'kyoto_ni', 'ikimasuka'], zh:'不好意思，這班電車會到京都嗎？', next:'n2'});
K('kyoto_made_nanpun', '{京都|きょうと}まで{何分|なんぷん}くらいですか。', 'Kyōto made nanpun kurai desu ka', '到京都大約幾分鐘？', 'ask');
K('yonjuppun_kurai', '40{分|ぷん}くらいです。', 'yonjuppun kurai desu', '大約 40 分鐘', 'time', 'くらい＝大約（時間長度）。');
K('kyoto_doko', '{京都|きょうと}はどこですか。', 'Kyōto wa doko desu ka', '京都在哪裡？', 'ask');
V('train', 1, 'tr1a', {who:'站務員', note:'會到'}, [tOpen(),
  {id:'n2', t:'hear', c:['hai', 'ikimasu'], zh:'是，會到。', q:[Q('這班會到京都嗎？', ['會', '不會', '要換車'], 'ikimasu')], learn:['這班會到京都'], todo:'上車', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['kyoto_made_nanpun'], '到京都大約幾分鐘？', 'ok', '確認了會到，再問要多久，很自然。', 'n4', {skel:'made'}),
    O(['arigatou'], '謝謝。（上車）', 'ok', '確認會到就上車。', 'n5', {do:'上車'}),
    O(['kyoto_doko'], '京都在哪裡？', 'part', '他已經說會到了。想知道第幾站下車，可以問「京都はいくつ目ですか」。', null)]},
  {id:'n4', t:'hear', c:['yonjuppun_kurai'], zh:'大約 40 分鐘。', q:[Q('到京都要多久？', ['大約 40 分鐘', '40 分鐘後發車', '4 點 10 分'], 'yonjuppun_kurai')], learn:['到京都大約 40 分鐘'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你搭上這班，往京都出發。'}]);

K('kyoto_yuki_nanbansen', '{京都行|きょうとゆ}きは{何番線|なんばんせん}ですか。', 'Kyōto-yuki wa nan-bansen desu ka', '往京都的在幾號月台？', 'ask', '番線＝月台號碼。〜行き＝開往…');
K('go_bansen', '5{番線|ばんせん}です。', 'go-bansen desu', '5 號月台', 'num');
V('train', 1, 'tr1b', {who:'站務員', note:'不到'}, [tOpen(),
  {id:'n2', t:'hear', c:['iie', 'ikimasen2'], zh:'不，不會到。', q:[Q('這班會到京都嗎？', ['不會', '會', '會，但要換車'], 'ikimasen2')], learn:['這班不到京都'], todo:'問往京都的月台', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['kyoto_yuki_nanbansen'], '往京都的在幾號月台？', 'ok', '不到就問該去哪個月台。', 'n4', {skel:'nanban'}),
    O(['sumimasen', 'mouichido'], '不好意思，請再說一次。', 'ok', '沒把握就請他再說一次。', 'n2r', {fix:true}),
    O(['jaa_norimasu'], '那我上車。', 'bad', '他說「行きません」，上車就搭錯了。', null)]},
  {id:'n2r', t:'hear', c:['iie', 'ikimasen2'], zh:'不，不會到。', q:[], learn:['確認：這班不到'], next:'n3'},
  {id:'n4', t:'hear', c:['go_bansen'], zh:'5 號月台。', q:[Q('往京都在哪裡搭？', ['5 號月台', '5 分鐘後', '第 5 站'], 'go_bansen')], learn:['往京都在 5 號月台'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你走到 5 號月台搭往京都的車。'}]);

K('daitai_40', 'だいたい40{分|ぷん}です。', 'daitai yonjuppun desu', '大約 40 分鐘', 'time');
V('train', 1, 'tr1t', {who:'站務員', tr:true, note:'換說法：ええ／だいたい'}, [tOpen(),
  {id:'n2', t:'hear', c:['ee_ikimasu_yo'], zh:'嗯，會到喔。', q:[Q('這班會到京都嗎？', ['會', '不會', '他不確定'], 'ee_ikimasu_yo')], learn:['這班會到京都'], next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['kyoto_made_nanpun'], '到京都大約幾分鐘？', 'ok', '確認要多久。', 'n4', {skel:'made'}),
    O(['kyoto_yuki_nanbansen'], '往京都的在幾號月台？', 'bad', '他已經說這班就會到，不用再找別的月台。', null)]},
  {id:'n4', t:'hear', c:['daitai_40'], zh:'大約 40 分鐘。', q:[Q('到京都要多久？', ['大約 40 分鐘', '40 分鐘後發車', '4 點'], 'daitai_40')], learn:['大約 40 分鐘'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你搭上這班，大約 40 分鐘到京都。'}]);

K('kyoto_yottsume', '{京都|きょうと}は{四|よ}つ{目|め}です。', 'Kyōto wa yottsu-me desu', '京都是第四站', 'num', '四つ目＝第四個；四つ＝四個。');
K('yottsume_ne', '{四|よ}つ{目|め}ですね。', 'yottsu-me desu ne', '第四站對吧？', 'ask');
K('oriru_toki_anaunsu', '{降|お}りる{時|とき}は、アナウンスがありますよ。', 'oriru toki wa, anaunsu ga arimasu yo', '要下車時會有廣播', 'next');
K('yottsu_desuka', '{四|よっ}つですか。', 'yottsu desu ka', '四個嗎？', 'ask');
K('yottsume_no_eki', '{四|よ}つ{目|め}の{駅|えき}です。', 'yottsu-me no eki desu', '是第四個站', 'num');
V('train', 2, 'tr2a', {who:'站務員', note:'第幾站'}, [tOpen(),
  {id:'n2', t:'hear', c:['hai', 'ikimasu_yo', 'kyoto_yottsume'], zh:'是，會到喔。京都是第四站。',
    q:[Q('這班會到嗎？', ['會', '不會', '不知道'], 'ikimasu_yo'), Q('京都是第幾站？', ['第 4 站', '4 號月台', '4 分鐘後'], 'kyoto_yottsume')], learn:['會到', '京都是第四站'], next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['yottsume_ne'], '第四站對吧？', 'ok', '把重點重複一次＋ね，是最好用的確認。', 'n4', {skel:'ne', fix:true}),
    O(['sumimasen', 'mouichido'], '不好意思，請再說一次。', 'ok', '他會換個說法再說一次。', 'n2r', {fix:true}),
    O(['yottsu_desuka'], '四個嗎？', 'part', '四つ目＝第四個，四つ＝四個。用問句確認沒關係，他會糾正你。', 'n2r')]},
  {id:'n2r', t:'hear', c:['hai', 'yottsume_no_eki'], zh:'是，是第四個站。', q:[], learn:['第四個站'], next:'n3'},
  {id:'n4', t:'hear', c:['hai_sou', 'oriru_toki_anaunsu'], zh:'對，沒錯。要下車時會有廣播喔。', q:[Q('怎麼知道到了？', ['會有廣播', '站務員會叫你', '要自己數不到'], 'oriru_toki_anaunsu')], learn:['到站會有廣播'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你搭上車，數到第四站就是京都，也會有廣播。'}]);

K('mittsu_saki', '{三|みっ}つ{先|さき}が{京都|きょうと}です。', 'mittsu saki ga Kyōto desu', '再過三站就是京都', 'num', '三つ先＝往前數第三個。');
K('mittsu_saki_ne', '{三|みっ}つ{先|さき}ですね。', 'mittsu saki desu ne', '再過三站對吧？', 'ask');
V('train', 2, 'tr2t', {who:'站務員', tr:true, note:'換說法：三つ先'}, [tOpen(),
  {id:'n2', t:'hear', c:['ikimasu_yo', 'mittsu_saki'], zh:'會到喔。再過三站就是京都。', q:[Q('京都是哪一站？', ['再過 3 站', '3 號月台', '3 分鐘後'], 'mittsu_saki')], learn:['再過三站是京都'], next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['mittsu_saki_ne'], '再過三站對吧？', 'ok', '確認站數。', 'n5', {skel:'ne', fix:true}),
    O(['arigatou'], '謝謝。（上車）', 'ok', '記住「三つ先」就好。', 'n5', {do:'上車'})]},
  {id:'n5', t:'end', res:'ok', text:'你搭上車，再過三站在京都下車。'}]);

K('kakueki_nanode', 'これは{各駅停車|かくえきていしゃ}なので、', 'kore wa kakueki-teisha na node', '因為這班每站都停', 'reason', '各駅停車＝每站都停的車。なので＝因為。');
K('jikan_kakaru', '{時間|じかん}がかかりますよ。', 'jikan ga kakarimasu yo', '會花比較多時間', 'time', '時間がかかる＝要花時間。');
K('hayai_densha', '{速|はや}い{電車|でんしゃ}はありますか。', 'hayai densha wa arimasu ka', '有比較快的車嗎？', 'ask');
K('kaisoku_arimasu', '{快速|かいそく}がありますよ。', 'kaisoku ga arimasu yo', '有快速車', 'concl');
K('tonari_5', '{隣|となり}の5{番線|ばんせん}から、', 'tonari no go-bansen kara', '從隔壁的 5 號月台', 'num');
K('juppungo_demasu', '10{分後|ぷんご}に{出|で}ます。', 'juppun-go ni demasu', '10 分鐘後發車', 'time', '〜分後＝…分鐘之後。和「10時」（10 點）、「10分かかる」（要 10 分鐘）不同。');
K('jikan_arimasuka', '{時間|じかん}はありますか。', 'jikan wa arimasu ka', '你有時間嗎？', 'ask');
V('train', 3, 'tr3a', {who:'站務員', note:'各站停，快速比較快'}, [tOpen(),
  {id:'n2', t:'hear', c:['hai', 'ikimasu', 'demo', 'kakueki_nanode', 'jikan_kakaru'], zh:'會到。不過這班每站都停，會花比較多時間喔。',
    q:[Q('這班會到京都嗎？', ['會，但比較慢', '不會', '會，而且最快'], 'jikan_kakaru')], learn:['這班會到，但每站停比較慢'], todo:'問有沒有快的車', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['hayai_densha'], '有比較快的車嗎？', 'ok', '聽懂「這班慢」，接著問快的車，對話就往下走了。', 'n4'),
    O(['kore_ni_norimasu'], '我搭這班。', 'ok', '慢一點也會到，這也是合理的決定。', 'n5s', {do:'上車'}),
    O(['jikan_arimasuka'], '你有時間嗎？', 'part', '時間がかかる＝要花時間；時間はありますか 是問對方有沒有空。再選一次。', null)]},
  {id:'n4', t:'hear', c:['kaisoku_arimasu', 'tonari_5', 'juppungo_demasu'], zh:'有快速車喔。從隔壁的 5 號月台，10 分鐘後發車。',
    q:[Q('快速在幾號月台？', ['5 號', '10 號', '15 號'], 'tonari_5'), Q('快速什麼時候發車？', ['10 分鐘後', '10 點整', '要坐 10 分鐘'], 'juppungo_demasu')],
    learn:['快速在隔壁 5 號月台', '10 分鐘後發車'], fig:{type:'steps', s:[['■', '你在這個月台'], ['→', '走到隔壁'], ['■', '5 號月台：快速'], ['⏱', '10 分鐘後發車']]}, next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你走到隔壁 5 號月台，搭 10 分鐘後的快速。'},
  {id:'n5s', t:'end', res:'slow', text:'你搭了各站停，會到京都，只是比較慢。'}]);

K('kaisoku_nanode', 'これは{快速|かいそく}なので、', 'kore wa kaisoku na node', '這班是快速車，所以…', 'reason');
K('kyoto_hayai', '{京都|きょうと}まで{早|はや}いですよ。', 'Kyōto made hayai desu yo', '到京都很快', 'concl');
K('kakueki_doko', '{各駅停車|かくえきていしゃ}はどこですか。', 'kakueki-teisha wa doko desu ka', '每站停的車在哪？', 'ask');
V('train', 3, 'tr3t', {who:'站務員', tr:true, note:'這次快速就是對的'}, [tOpen(),
  {id:'n2', t:'hear', c:['hai', 'kaisoku_nanode', 'kyoto_hayai'], zh:'是。這班是快速，到京都很快喔。', q:[Q('這班怎麼樣？', ['就是快的，搭它', '太慢要換車', '不會到京都'], 'kyoto_hayai')], learn:['這班是快速，會到京都'], next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼做？', o:[
    O(['kore_ni_norimasu'], '我搭這班。', 'ok', '快速會到，直接搭。', 'n5', {do:'上車'}),
    O(['kakueki_doko'], '每站停的車在哪？', 'bad', '他說這班就是快的，去找各站停反而更慢。', null)]},
  {id:'n5', t:'end', res:'ok', text:'你搭上快速，很快就到京都。'}]);

K('a_kyoto', 'あ、{京都|きょうと}ですか？', 'a, Kyōto desu ka?', '啊，京都嗎？（確認目的地）', 'filler');
K('kakueki_nande', 'これ{各駅|かくえき}なんで、', 'kore kakueki nan de', '這班每站停，所以…', 'reason', 'なんで＝なので 的口語（因為），這裡不是「為什麼」。');
K('tsugi_kaisoku_hou', '{次|つぎ}の{快速|かいそく}のほうが', 'tsugi no kaisoku no hō ga', '下一班快速比較…', 'advice', '〜のほうが＝…比較。');
K('hayai_desu_yo', '{早|はや}いですよ。', 'hayai desu yo', '快喔', 'advice');
K('densha_osoi', 'この{電車|でんしゃ}は{遅|おそ}いです。', 'kono densha wa osoi desu', '這班電車很慢', 'reason');
K('hayai_desu', '{早|はや}いです。', 'hayai desu', '比較快', 'advice');
K('tsugi_kaisoku_nanbansen', '{次|つぎ}の{快速|かいそく}は{何番線|なんばんせん}ですか。', 'tsugi no kaisoku wa nan-bansen desu ka', '下一班快速在幾號月台？', 'ask');
K('onaji_home', '{同|おな}じホームです。', 'onaji hōmu desu', '同一個月台', 'place');
K('densha_detara', 'この{電車|でんしゃ}が{出|で}たら、', 'kono densha ga detara', '這班開走之後', 'time', '〜たら＝…之後。');
K('sugu_kimasu', 'すぐ{来|き}ますよ。', 'sugu kimasu yo', '馬上就來', 'time');
K('kaisoku_ikura', '{快速|かいそく}はいくらですか。', 'kaisoku wa ikura desu ka', '快速要多少錢？', 'ask');
K('tsuika_iranai', '{快速|かいそく}は{追加料金|ついかりょうきん}はいりませんよ。', 'kaisoku wa tsuika-ryōkin wa irimasen yo', '快速不用另外加錢', 'concl');
K('kakueki_doko2', '{各駅|かくえき}はどこですか。', 'kakueki wa doko desu ka', '每站停的在哪？', 'ask');
V('train', 4, 'tr4a', {who:'站務員', note:'口語：各駅なんで'}, [tOpen(),
  {id:'n2', t:'hear', c:['a_kyoto', 'kakueki_nande', 'tsugi_kaisoku_hou', 'hayai_desu_yo'], zh:'啊，京都嗎？這班每站停，下一班快速比較快喔。',
    easy:{c:['densha_osoi', 'tsugi_kaisoku_hou', 'hayai_desu'], zh:'這班電車很慢。下一班快速比較快。'},
    q:[Q('他建議你怎麼做？', ['等下一班快速', '就搭這班', '去別的車站'], 'tsugi_kaisoku_hou', 'tsugi_kaisoku_hou'), Q('這班怎麼了？', ['每站停，比較慢', '不會到京都', '已經客滿'], 'kakueki_nande', 'densha_osoi')],
    learn:['這班每站停', '下一班快速比較快'], todo:'問快速在哪裡搭', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['tsugi_kaisoku_nanbansen'], '下一班快速在幾號月台？', 'ok', '知道要換快速，下一個要知道的就是在哪裡搭。', 'n4', {skel:'nanban'}),
    O(['kaisoku_ikura'], '快速要多少錢？', 'part', '可以問，他會回答；不過接下來還是要知道在哪裡搭。', 'n3b'),
    O(['kakueki_doko2'], '每站停的在哪？', 'bad', '他是叫你「不要搭」各駅，不是叫你去找它。', null)]},
  {id:'n3b', t:'hear', c:['tsuika_iranai'], zh:'快速不用另外加錢。', q:[], learn:['快速不用加錢'], next:'n3'},
  {id:'n4', t:'hear', c:['onaji_home', 'densha_detara', 'sugu_kimasu'], zh:'同一個月台。這班開走之後，馬上就來了。',
    q:[Q('快速在哪裡搭？', ['同一個月台', '對面的月台', '樓下的月台'], 'onaji_home'), Q('什麼時候來？', ['這班開走後馬上來', '30 分鐘後', '1 小時後'], 'densha_detara')], learn:['同一個月台', '這班開走後馬上來'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你留在同一個月台，等這班開走，搭接著來的快速。'}]);

K('koredemo_ikeru', '{京都|きょうと}？あー、これでも{行|い}けるけど、', 'Kyōto? ā, kore demo ikeru kedo', '京都？這班也能到啦，不過…', 'concl');
K('osoi_ssu', '{遅|おそ}いっすよ。', 'osoi ssu yo', '很慢喔', 'reason', 'っす＝です 的年輕人說法。');
K('shinkaisoku_3', '{次|つぎ}の{新快速|しんかいそく}、3{分後|ぷんご}なんで、', 'tsugi no shin-kaisoku, sanpun-go nan de', '下一班新快速 3 分鐘後來，所以…', 'time');
K('matta_hou', 'それ{待|ま}ったほうがいいっす。', 'sore matta hō ga ii ssu', '等那班比較好', 'advice');
K('shinkaisoku_3e', '{次|つぎ}の{新快速|しんかいそく}は3{分後|ぷんご}です。', 'tsugi no shin-kaisoku wa sanpun-go desu', '下一班新快速 3 分鐘後', 'time');
K('sore_matte', 'それを{待|ま}ってください。', 'sore o matte kudasai', '請等那班', 'advice');
K('onaji_home_ka', '{同|おな}じホームですか。', 'onaji hōmu desu ka', '同一個月台嗎？', 'ask');
K('sou_ssu_koko', 'そうっす。ここで{待|ま}ってれば{来|き}ますよ。', 'sō ssu. koko de mattereba kimasu yo', '對，在這裡等就會來', 'place');
K('kore_de_ikemasu_ne', 'これで{行|い}けますね。{乗|の}ります。', 'kore de ikemasu ne. norimasu', '這班也能到吧，我上車', 'ask');
V('train', 4, 'tr4t', {who:'站務員（年輕人）', tr:true, note:'換說法：これでも行けるけど／っす'}, [tOpen(),
  {id:'n2', t:'hear', c:['koredemo_ikeru', 'osoi_ssu', 'shinkaisoku_3', 'matta_hou'], zh:'京都？這班也能到啦，不過很慢喔。下一班新快速 3 分鐘後來，等那班比較好。',
    easy:{c:['densha_osoi', 'shinkaisoku_3e', 'sore_matte'], zh:'這班電車很慢。下一班新快速 3 分鐘後。請等那班。'},
    q:[Q('這班會到京都嗎？', ['會到，但很慢', '不會到', '這班最快'], 'koredemo_ikeru', 'densha_osoi'), Q('新快速什麼時候來？', ['3 分鐘後', '3 點', '要坐 3 分鐘'], 'shinkaisoku_3', 'shinkaisoku_3e')],
    learn:['這班會到但很慢', '新快速 3 分鐘後來'], todo:'確認在哪裡等新快速', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['onaji_home_ka'], '同一個月台嗎？', 'ok', '確認要在哪裡等。', 'n4'),
    O(['kore_de_ikemasu_ne'], '這班也能到吧，我上車。', 'part', '會到，但比 3 分鐘後的新快速慢很多。', 'n5s', {do:'上車'})]},
  {id:'n4', t:'hear', c:['sou_ssu_koko'], zh:'對，在這裡等就會來。', q:[Q('要在哪裡等？', ['同一個月台', '對面月台', '樓下'], 'sou_ssu_koko')], learn:['在同一個月台等'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你在同一個月台等 3 分鐘後的新快速。'},
  {id:'n5s', t:'end', res:'slow', text:'你搭了這班，會到，但比新快速慢很多。'}]);

K('kyoto_deshitara', '{京都|きょうと}でしたら、', 'Kyōto deshitara', '如果是去京都', 'cond', 'でしたら＝なら 的客氣說法。');
K('notta_hou_hayai', '{次|つぎ}の{快速|かいそく}に{乗|の}ったほうが{早|はや}いですよ。', 'tsugi no kaisoku ni notta hō ga hayai desu yo', '搭下一班快速比較快', 'advice', '〜たほうが＝…比較好。');
K('yonjuppun_kakaru', '{京都|きょうと}まで40{分|ぷん}かかっちゃいます。', 'Kyōto made yonjuppun kakatchaimasu', '到京都要花 40 分鐘', 'time', '〜かかる＝要花（時間）。〜ちゃう 帶有「可惜」的語氣。');
K('kaisoku_5', '{快速|かいそく}は5{番線|ばんせん}から、', 'kaisoku wa go-bansen kara', '快速從 5 號月台', 'num');
K('h1020', '10{時|じ}20{分発|ぷんはつ}です。', 'jū-ji nijuppun hatsu desu', '10:20 發車', 'time', '〜発＝幾點出發。和「20分後」（20 分鐘後）、「20分かかる」（要花 20 分鐘）不同。');
K('kaisoku_notte', '{快速|かいそく}に{乗|の}ってください。', 'kaisoku ni notte kudasai', '請搭快速', 'advice');
K('go_1020_ne', '5{番線|ばんせん}の10{時|じ}20{分|ぷん}ですね。', 'go-bansen no jū-ji nijuppun desu ne', '5 號月台 10:20 對吧？', 'ask');
K('kaidan_mukai', '{階段|かいだん}で{向|む}かいのホームに{行|い}ってください。', 'kaidan de mukai no hōmu ni itte kudasai', '請走樓梯到對面月台', 'dir');
K('yonjuppun_ka', '40{分|ぷん}ですか。ありがとうございます。', 'yonjuppun desu ka. arigatō gozaimasu', '40 分鐘嗎？謝謝', 'ask');
V('train', 5, 'tr5a', {who:'站務員', note:'長回答：建議＋月台＋時間'}, [tOpen(),
  {id:'n2', t:'hear', c:['kyoto_deshitara', 'notta_hou_hayai', 'kakueki_nanode', 'yonjuppun_kakaru', 'kaisoku_5', 'h1020'], zh:'如果是去京都，搭下一班快速比較快喔。這班每站停，到京都要花 40 分鐘。快速從 5 號月台，10:20 發車。',
    easy:{c:['kaisoku_notte', 'kaisoku_5', 'h1020'], zh:'請搭快速。快速從 5 號月台，10:20 發車。'},
    q:[Q('你該搭眼前這班嗎？', ['不要，改搭快速', '要，搭這班', '不要，去別的車站'], 'notta_hou_hayai', 'kaisoku_notte'), Q('快速在幾號月台？', ['5 號', '4 號', '10 號'], 'kaisoku_5', 'kaisoku_5'), Q('快速什麼時候發車？', ['10:20 發車', '20 分鐘後發車', '要花 20 分鐘'], 'h1020', 'h1020')],
    learn:['改搭快速', '快速：5 號月台，10:20 發車'], todo:'去 5 號月台', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['go_1020_ne'], '5 號月台 10:20 對吧？', 'ok', '長回答裡只挑「你要行動的資訊」確認一次。', 'n4', {skel:'ne', fix:true}),
    O(['yonjuppun_ka'], '40 分鐘嗎？謝謝。（搭眼前這班）', 'part', '40 分鐘是這班慢車的時間。你搭了會到，但比較慢。', 'n5s', {do:'搭眼前這班'}),
    O(['sumimasen', 'yukkuri'], '不好意思，請說慢一點。', 'ok', '長回答聽不完很正常，請他慢一點。', 'n2s', {fix:true})]},
  {id:'n2s', t:'hear', c:['kaisoku_notte', 'kaisoku_5', 'h1020'], zh:'請搭快速。快速從 5 號月台，10:20 發車。', q:[], learn:['快速：5 號月台 10:20'], next:'n3'},
  {id:'n4', t:'hear', c:['hai_sou', 'kaidan_mukai'], zh:'對。請走樓梯到對面的月台。', q:[Q('5 號月台怎麼去？', ['走樓梯到對面月台', '就在這個月台', '搭電梯到 1 樓'], 'kaidan_mukai')], learn:['走樓梯到對面月台'],
    fig:{type:'steps', s:[['■', '你在這個月台'], ['↑', '走樓梯'], ['■', '對面：5 號月台'], ['⏱', '10:20 快速']]}, next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你走樓梯到對面的 5 號月台，搭 10:20 的快速。'},
  {id:'n5s', t:'end', res:'slow', text:'你搭了眼前的慢車，會到京都，但比快速慢。'}]);

K('kocchi_janai', '{京都|きょうと}は、こっちじゃないですね。', 'Kyōto wa, kotchi ja nai desu ne', '去京都不是這邊喔', 'dir');
K('osaka_houmen', 'このホームは{大阪方面|おおさかほうめん}なので、', 'kono hōmu wa Ōsaka hōmen na node', '這個月台是往大阪方向，所以…', 'dir', '方面＝方向。');
K('hantai_4', '{反対側|はんたいがわ}の4{番線|ばんせん}から{乗|の}ってください。', 'hantai-gawa no yon-bansen kara notte kudasai', '請從對面的 4 號月台搭', 'num');
K('h1005', '{次|つぎ}は10{時|じ}5{分発|ふんはつ}の{快速|かいそく}です。', 'tsugi wa jū-ji go-fun hatsu no kaisoku desu', '下一班是 10:05 發車的快速', 'time');
K('kocchi_osaka', 'こっちは{大阪行|おおさかゆ}きです。', 'kotchi wa Ōsaka-yuki desu', '這邊是往大阪', 'dir');
K('go_4', '4{番線|ばんせん}に{行|い}ってください。', 'yon-bansen ni itte kudasai', '請到 4 號月台', 'num');
K('yon_1005_ne', '4{番線|ばんせん}の10{時|じ}5{分|ふん}ですね。', 'yon-bansen no jū-ji go-fun desu ne', '4 號月台 10:05 對吧？', 'ask');
K('osaka_houmen_ne', '{大阪方面|おおさかほうめん}ですね。{乗|の}ります。', 'Ōsaka hōmen desu ne. norimasu', '往大阪方向對吧，我上車', 'ask');
K('tsugi_osaka', '{次|つぎ}は、{大阪|おおさか}です。', 'tsugi wa, Ōsaka desu', '下一站是大阪', 'place');
K('kyoto_yuki_k', 'すみません、{京都行|きょうとゆ}きは{何番線|なんばんせん}ですか。', 'sumimasen, Kyōto-yuki wa nan-bansen desu ka', '請問往京都的在幾號月台？', 'ask');
K('nana_bansen', '{京都行|きょうとゆ}きは7{番線|ばんせん}ですよ。', 'Kyōto-yuki wa nana-bansen desu yo', '往京都在 7 號月台', 'num');
V('train', 5, 'tr5t', {who:'站務員', tr:true, note:'月台方向搭錯＋補救'}, [tOpen(),
  {id:'n2', t:'hear', c:['kocchi_janai', 'osaka_houmen', 'hantai_4', 'h1005'], zh:'去京都不是這邊喔。這個月台是往大阪方向，請從對面的 4 號月台搭。下一班是 10:05 發車的快速。',
    easy:{c:['kocchi_osaka', 'go_4', 'h1005'], zh:'這邊是往大阪。請到 4 號月台。下一班是 10:05 發車的快速。'},
    q:[Q('這個月台方向對嗎？', ['不對，這邊往大阪', '對，往京都', '今天停駛'], 'kocchi_janai', 'kocchi_osaka'), Q('要去幾號月台？', ['4 號', '10 號', '5 號'], 'hantai_4', 'go_4'), Q('下一班什麼時候？', ['10:05 發車', '5 分鐘後發車', '要花 10 分鐘'], 'h1005', 'h1005')],
    learn:['這邊是往大阪（反方向）', '對面 4 號月台', '10:05 快速'], todo:'去對面 4 號月台', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['yon_1005_ne'], '4 號月台 10:05 對吧？', 'ok', '確認月台和時間。', 'n5', {skel:'ne', fix:true}),
    O(['osaka_houmen_ne'], '往大阪方向對吧，我上車。', 'bad', '大阪方面 是「這邊往大阪」，你要去的京都在反方向。', 'nx', {do:'上車'})]},
  {id:'nx', t:'hear', who:'車內廣播', c:['tsugi_osaka'], zh:'下一站是大阪。', q:[Q('發生什麼事？', ['坐反了，往大阪去了', '快到京都了', '電車停駛'], 'tsugi_osaka')], learn:['坐反了，下一站是大阪'], todo:'在大阪下車，問往京都的月台', next:'n6'},
  {id:'n6', t:'act', q:'到了大阪，你要怎麼做？', o:[
    O(['kyoto_yuki_k'], '（問站務員）往京都的在幾號月台？', 'ok', '坐錯不要慌，下車問往目的地的月台。', 'n7', {skel:'nanban', fix:true}),
    O(['arigatou'], '（留在車上）', 'bad', '再坐下去會離京都更遠。', null)]},
  {id:'n7', t:'hear', who:'大阪站站務員', c:['nana_bansen'], zh:'往京都在 7 號月台。', q:[Q('往京都在幾號月台？', ['7 號', '7 分鐘後', '第 7 站'], 'nana_bansen')], learn:['大阪站往京都：7 號月台'], next:'n8'},
  {id:'n5', t:'end', res:'ok', text:'你走到對面 4 號月台，搭 10:05 的快速。'},
  {id:'n8', t:'end', res:'late', text:'你先坐反到大阪，下車問了站務員，改到 7 號月台搭往京都的車。'}]);

/* ============================================================
   任務三：問路・找巴士搭乘處（模擬情境：建築、路線、乘車處編號為練習用）
   ============================================================ */
T({id:'way', name:'問路・找巴士搭乘處', place:'京都站・出口附近', dest:'巴士搭乘處', setup:'你要搭往金閣寺的巴士，但找不到巴士搭乘處。你問路人或站務員。',
  sim:'模擬情境：路線、地標、乘車處編號是練習用，實際位置請看現場標示。',
  axis:{1:'短的禮貌回答', 2:'句子變長：第幾個、左右', 3:'新詞：地標、轉彎', 4:'口語縮略、說得比較快', 5:'資訊量大：長的指路'}});
K('noriba_doko', 'バス{乗|の}り{場|ば}はどこですか。', 'basu noriba wa doko desu ka', '巴士搭乘處在哪裡？', 'ask', '乗り場＝搭乘處。');
const wOpen = () => ({id:'n1', t:'say', intent:'問：巴士搭乘處在哪裡？', skel:'doko', c:['sumimasen', 'noriba_doko'], zh:'不好意思，巴士搭乘處在哪裡？', next:'n2'});
K('asoko_desu', 'あそこです。', 'asoko desu', '在那裡（離你們都遠的地方）', 'place', 'あそこ＝那裡。對方通常會用手指。');
K('shiroi_mae', '{白|しろ}い{建物|たてもの}の{前|まえ}ですか。', 'shiroi tatemono no mae desu ka', '是白色建築前面嗎？', 'ask');
K('asoko_doko', 'あそこはどこですか。', 'asoko wa doko desu ka', '那裡是哪裡？', 'ask');
V('way', 1, 'w1a', {who:'路人', note:'あそこ＋手勢'}, [wOpen(),
  {id:'n2', t:'hear', c:['asoko_desu'], zh:'在那裡。', point:'他用手指著右前方：那棟白色建築前面，停著很多巴士。',
    q:[Q('搭乘處在哪？', ['他指的右前方那裡', '車站裡面', '他說沒有巴士'], 'asoko_desu')], learn:['在右前方，他指的那裡'], todo:'確認是哪一棟', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['shiroi_mae'], '是白色建築前面嗎？', 'ok', '「あそこ」很模糊，用看得到的東西確認最清楚。', 'n4', {skel:'mae_ka', fix:true}),
    O(['arigatou'], '謝謝。', 'ok', '看得到他指的地方，直接走過去也可以。', 'n5'),
    O(['asoko_doko'], '那裡是哪裡？', 'part', '對方已經用手指了。用看得到的東西確認更清楚：「［地標］の前ですか」。', null)]},
  {id:'n4', t:'hear', c:['hai_sou'], zh:'對，沒錯。', q:[], learn:['白色建築前面'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你走到那棟白色建築前面，找到巴士搭乘處。'}]);

K('massugu_itte', 'まっすぐ{行|い}って、', 'massugu itte', '直走', 'dir');
K('migi_desu', '{右|みぎ}です。', 'migi desu', '在右邊', 'dir');
K('massugu_migi_ne', 'まっすぐ、{右|みぎ}ですね。', 'massugu, migi desu ne', '直走、右邊，對吧？', 'ask');
K('aruite2', '{歩|ある}いて2{分|ふん}くらいですよ。', 'aruite ni-fun kurai desu yo', '走路大約 2 分鐘', 'time');
K('hidari_desuka', '{左|ひだり}ですか。', 'hidari desu ka', '左邊嗎？', 'ask');
K('iie_migi', 'いいえ、{右|みぎ}です。', 'iie, migi desu', '不，是右邊', 'dir');
V('way', 1, 'w1b', {who:'站務員', note:'直走、右邊'}, [wOpen(),
  {id:'n2', t:'hear', c:['massugu_itte', 'migi_desu'], zh:'直走，然後在右邊。', q:[Q('怎麼走？', ['直走，在右邊', '直走，在左邊', '先右轉再直走'], 'migi_desu')], learn:['直走，在右邊'], fig:{type:'steps', s:[['↑', '直走'], ['→', '右手邊就是']]}, next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['massugu_migi_ne'], '直走、右邊，對吧？', 'ok', '方向最容易聽反，重複一次最保險。', 'n4', {skel:'ne', fix:true}),
    O(['hidari_desuka'], '左邊嗎？', 'part', '用問句確認很好，不過他說的是「右」。他會糾正你。', 'n3b', {fix:true})]},
  {id:'n3b', t:'hear', c:['iie_migi'], zh:'不，是右邊。', q:[], learn:['是右邊'], next:'n3'},
  {id:'n4', t:'hear', c:['hai', 'aruite2'], zh:'對。走路大約 2 分鐘喔。', q:[Q('走路要多久？', ['大約 2 分鐘', '2 分鐘後有車', '2 號乘車處'], 'aruite2')], learn:['走路約 2 分鐘'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你直走，在右邊找到巴士搭乘處。'}]);

K('kono_michi_massugu', 'この{道|みち}をまっすぐです。', 'kono michi o massugu desu', '這條路直走', 'dir');
K('hidarigawa', '{左側|ひだりがわ}にありますよ。', 'hidari-gawa ni arimasu yo', '在左手邊', 'dir');
K('massugu_hidari_ne', 'まっすぐ、{左側|ひだりがわ}ですね。', 'massugu, hidari-gawa desu ne', '直走、左手邊對吧？', 'ask');
V('way', 1, 'w1t', {who:'路人', tr:true, note:'換說法：この道をまっすぐ／左側に'}, [wOpen(),
  {id:'n2', t:'hear', c:['kono_michi_massugu', 'hidarigawa'], zh:'這條路直走。在左手邊喔。', q:[Q('怎麼走？', ['直走，在左手邊', '直走，在右手邊', '左轉後直走'], 'hidarigawa')], learn:['直走，左手邊'], next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['massugu_hidari_ne'], '直走、左手邊對吧？', 'ok', '確認方向。', 'n5', {skel:'ne', fix:true}),
    O(['arigatou'], '謝謝。', 'ok', '聽懂了就出發。', 'n5')]},
  {id:'n5', t:'end', res:'ok', text:'你沿著這條路直走，在左手邊找到搭乘處。'}]);

K('michi_massugu_itte', 'この{道|みち}をまっすぐ{行|い}って、', 'kono michi o massugu itte', '這條路直走', 'dir');
K('futatsume_shingou', '{二|ふた}つ{目|め}の{信号|しんごう}を', 'futatsu-me no shingō o', '在第二個紅綠燈', 'num', '二つ目＝第二個。信号＝紅綠燈。');
K('hidari_desu', '{左|ひだり}です。', 'hidari desu', '左轉（左邊）', 'dir');
K('futatsume_hidari_ne', '{二|ふた}つ{目|め}の{信号|しんごう}を{左|ひだり}ですね。', 'futatsu-me no shingō o hidari desu ne', '第二個紅綠燈左轉，對吧？', 'ask');
K('yuubin_tonari_yo', '{郵便局|ゆうびんきょく}の{隣|となり}ですよ。', 'yūbinkyoku no tonari desu yo', '在郵局隔壁', 'place');
K('hitotsume_ka', '{一|ひと}つ{目|め}ですか。', 'hitotsu-me desu ka', '第一個嗎？', 'ask');
K('iie_futatsume', 'いいえ、{二|ふた}つ{目|め}です。', 'iie, futatsu-me desu', '不，是第二個', 'num');
V('way', 2, 'w2a', {who:'站務員', note:'第幾個紅綠燈'}, [wOpen(),
  {id:'n2', t:'hear', c:['michi_massugu_itte', 'futatsume_shingou', 'hidari_desu'], zh:'這條路直走，在第二個紅綠燈左轉。', q:[Q('在哪裡轉？往哪轉？', ['第二個紅綠燈左轉', '第一個紅綠燈右轉', '第二個紅綠燈右轉'], 'futatsume_shingou')], learn:['直走，第二個紅綠燈左轉'], todo:'確認到了怎麼認', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['futatsume_hidari_ne'], '第二個紅綠燈左轉，對吧？', 'ok', '「第幾個＋左右」最容易聽錯，確認這兩個就夠了。', 'n4', {skel:'ne', fix:true}),
    O(['hitotsume_ka'], '第一個嗎？', 'part', '用問句確認很好，不過他說的是 二つ目（第二個）。', 'n3b', {fix:true})]},
  {id:'n3b', t:'hear', c:['iie_futatsume'], zh:'不，是第二個。', q:[], learn:['是第二個'], next:'n3'},
  {id:'n4', t:'hear', c:['hai', 'yuubin_tonari_yo'], zh:'對。在郵局隔壁喔。', q:[Q('搭乘處在哪？', ['郵局隔壁', '郵局對面', '郵局裡面'], 'yuubin_tonari_yo')], learn:['郵局隔壁'],
    fig:{type:'steps', s:[['↑', '直走'], ['←', '第 2 個紅綠燈左轉'], ['■', '郵局隔壁']]}, next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你在第二個紅綠燈左轉，郵局隔壁就是搭乘處。'}]);

K('futatsume_kado', '{二|ふた}つ{目|め}の{角|かど}を', 'futatsu-me no kado o', '在第二個轉角', 'num', '角＝轉角。');
K('migi_magatte', '{右|みぎ}に{曲|ま}がってください。', 'migi ni magatte kudasai', '請右轉', 'dir', '曲がる＝轉彎。');
K('futatsume_kado_ne', '{二|ふた}つ{目|め}の{角|かど}を{右|みぎ}ですね。', 'futatsu-me no kado o migi desu ne', '第二個轉角右轉，對吧？', 'ask');
V('way', 2, 'w2t', {who:'路人', tr:true, note:'換說法：角を右に曲がって'}, [wOpen(),
  {id:'n2', t:'hear', c:['futatsume_kado', 'migi_magatte'], zh:'在第二個轉角右轉。', q:[Q('怎麼走？', ['第二個轉角右轉', '第二個轉角左轉', '第一個轉角右轉'], 'migi_magatte')], learn:['第二個轉角右轉'], next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['futatsume_kado_ne'], '第二個轉角右轉，對吧？', 'ok', '確認方向。', 'n5', {skel:'ne', fix:true}),
    O(['arigatou'], '謝謝。', 'ok', '聽懂就出發。', 'n5')]},
  {id:'n5', t:'end', res:'ok', text:'你在第二個轉角右轉，找到搭乘處。'}]);

K('hidari_magatte', '{左|ひだり}に{曲|ま}がってください。', 'hidari ni magatte kudasai', '請左轉', 'dir');
K('yuubin_tonari', '{郵便局|ゆうびんきょく}の{隣|となり}です。', 'yūbinkyoku no tonari desu', '在郵局隔壁', 'place', '隣＝隔壁；前＝前面；向かい＝對面。');
K('yuubin_mae_ka', '{郵便局|ゆうびんきょく}の{前|まえ}ですか。', 'yūbinkyoku no mae desu ka', '在郵局前面嗎？', 'ask');
K('ie_tonari', 'いえ、{隣|となり}です。', 'ie, tonari desu', '不，是隔壁', 'place');
K('kanban', 'バスの{看板|かんばん}が{見|み}えますよ。', 'basu no kanban ga miemasu yo', '會看到巴士的招牌', 'place');
K('yuubin_doko', '{郵便局|ゆうびんきょく}はどこですか。', 'yūbinkyoku wa doko desu ka', '郵局在哪裡？', 'ask');
V('way', 3, 'w3a', {who:'站務員', note:'地標：隔壁 vs 前面'}, [wOpen(),
  {id:'n2', t:'hear', c:['michi_massugu_itte', 'futatsume_shingou', 'hidari_magatte', 'yuubin_tonari'], zh:'這條路直走，在第二個紅綠燈左轉。在郵局隔壁。',
    q:[Q('在哪裡轉？往哪轉？', ['第二個紅綠燈左轉', '第一個紅綠燈右轉', '第二個紅綠燈右轉'], 'hidari_magatte'), Q('旁邊有什麼？', ['郵局', '便利商店', '銀行'], 'yuubin_tonari')],
    learn:['第二個紅綠燈左轉', '郵局隔壁'], next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['yuubin_mae_ka'], '在郵局前面嗎？', 'ok', '用地標確認是好方法。他會糾正你：是「隔壁」不是「前面」。', 'n4', {skel:'mae_ka', fix:true}),
    O(['futatsume_hidari_ne'], '第二個紅綠燈左轉，對吧？', 'ok', '確認轉彎的地方。', 'n4b', {skel:'ne', fix:true}),
    O(['yuubin_doko'], '郵局在哪裡？', 'part', '郵局只是用來認路的地標，不用另外找它。可以改確認轉彎的地方。', null)]},
  {id:'n4', t:'hear', c:['ie_tonari', 'kanban'], zh:'不，是隔壁。會看到巴士的招牌喔。', q:[Q('搭乘處正確的位置？', ['郵局隔壁，看得到巴士招牌', '郵局正前方', '郵局裡面'], 'ie_tonari')], learn:['糾正：是郵局隔壁', '看得到巴士招牌'], next:'n5'},
  {id:'n4b', t:'hear', c:['hai_sou', 'kanban'], zh:'對，沒錯。會看到巴士的招牌喔。', q:[Q('到了怎麼認？', ['看得到巴士招牌', '有紅色大門', '有車站時鐘'], 'kanban')], learn:['看得到巴士招牌'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你在第二個紅綠燈左轉，郵局隔壁看到巴士的招牌。'}]);

K('eki_detara', '{駅|えき}を{出|で}たら、', 'eki o detara', '出了車站之後', 'time');
K('migi_itte', '{右|みぎ}に{行|い}って、', 'migi ni itte', '往右走', 'dir');
K('hashi_watatta', '{橋|はし}を{渡|わた}ったところです。', 'hashi o watatta tokoro desu', '過了橋那裡', 'place');
K('konbini_mukai', 'コンビニの{向|む}かいですよ。', 'konbini no mukai desu yo', '在便利商店對面', 'place', '向かい＝對面。');
K('konbini_mae_ka', 'コンビニの{前|まえ}ですか。', 'konbini no mae desu ka', '在便利商店前面嗎？', 'ask');
K('mukai_hantai', 'いいえ、{向|む}かいです。{道|みち}の{反対側|はんたいがわ}。', 'iie, mukai desu. michi no hantai-gawa', '不，是對面，馬路的另一邊', 'place');
K('hashi_konbini_ne', '{橋|はし}を{渡|わた}って、コンビニの{向|む}かいですね。', 'hashi o watatte, konbini no mukai desu ne', '過橋，便利商店對面，對吧？', 'ask');
V('way', 3, 'w3t', {who:'路人', tr:true, note:'換說法：橋を渡った／向かい'}, [wOpen(),
  {id:'n2', t:'hear', c:['eki_detara', 'migi_itte', 'hashi_watatta', 'konbini_mukai'], zh:'出了車站，往右走，過了橋那裡。在便利商店對面喔。',
    q:[Q('路線是？', ['出站→往右→過橋', '出站→往左→過橋', '出站→往右→過馬路'], 'hashi_watatta'), Q('旁邊的地標？', ['便利商店對面', '便利商店隔壁', '便利商店裡面'], 'konbini_mukai')],
    learn:['出站往右，過橋', '便利商店對面'], next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['konbini_mae_ka'], '在便利商店前面嗎？', 'ok', '用地標確認。他會糾正：是「向かい」（對面）。', 'n4', {skel:'mae_ka', fix:true}),
    O(['hashi_konbini_ne'], '過橋，便利商店對面，對吧？', 'ok', '把路線確認一次。', 'n5', {skel:'ne', fix:true})]},
  {id:'n4', t:'hear', c:['mukai_hantai'], zh:'不，是對面，馬路的另一邊。', q:[Q('正確位置？', ['便利商店的馬路對面', '便利商店門口', '橋上'], 'mukai_hantai')], learn:['糾正：在便利商店的馬路對面'], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你出站往右，過橋，在便利商店的馬路對面找到搭乘處。'}]);

K('aa_noriba', 'あー、バス{乗|の}り{場|ば}ですね。', 'ā, basu noriba desu ne', '啊，巴士搭乘處啊', 'filler');
K('kaidan_orite', 'そこの{階段|かいだん}{降|お}りて、', 'soko no kaidan orite', '從那邊的樓梯下去', 'dir', '口語常省略「を」：階段（を）降りて。');
K('chika_tootte', '{地下|ちか}{通|とお}って、', 'chika tōtte', '走地下（通道）', 'dir', '地下＝地下（通道）；地下鉄＝地下鐵。通る＝經過。');
K('hantai_detara', '{反対側|はんたいがわ}に{出|で}たらすぐですよ。', 'hantai-gawa ni detara sugu desu yo', '從另一側出去就到了', 'place');
K('kaidan_orite_e', '{階段|かいだん}を{降|お}りてください。', 'kaidan o orite kudasai', '請下樓梯', 'dir');
K('chika_tootte_e', '{地下|ちか}を{通|とお}って、', 'chika o tōtte', '走地下通道', 'dir');
K('hantai_dete', '{反対側|はんたいがわ}に{出|で}てください。', 'hantai-gawa ni dete kudasai', '請從另一側出去', 'place');
K('sugu_desu', 'すぐです。', 'sugu desu', '馬上就到', 'place');
K('deguchi_namae', '{反対側|はんたいがわ}の{出口|でぐち}は{何|なん}という{名前|なまえ}ですか。', 'hantai-gawa no deguchi wa nan to iu namae desu ka', '另一側的出口叫什麼名字？', 'ask');
K('namae_oboete', '{名前|なまえ}は{覚|おぼ}えてないんですけど、', 'namae wa oboete nai n desu kedo', '名字我不記得，不過…', 'filler');
K('kaite_aru', '「バスのりば」って{書|か}いてあるので、', '“basu noriba” tte kaite aru node', '有寫「巴士搭乘處」，所以…', 'place');
K('mite_ikeba', 'それを{見|み}ていけば{大丈夫|だいじょうぶ}です。', 'sore o mite ikeba daijōbu desu', '跟著它走就沒問題', 'next');
K('chikatetsu_ka', '{地下鉄|ちかてつ}に{乗|の}りますか。', 'chikatetsu ni norimasu ka', '要搭地下鐵嗎？', 'ask');
K('aruite_ikemasu', 'いえいえ、{歩|ある}いて{行|い}けますよ。', 'ie ie, aruite ikemasu yo', '不不，走路就能到', 'concl');
V('way', 4, 'w4a', {who:'站務員', note:'口語：省略を、地下 vs 地下鉄'}, [wOpen(),
  {id:'n2', t:'hear', c:['aa_noriba', 'kaidan_orite', 'chika_tootte', 'hantai_detara'], zh:'啊，巴士搭乘處啊。從那邊的樓梯下去，走地下通道，從另一側出去就到了喔。',
    easy:{c:['kaidan_orite_e', 'chika_tootte_e', 'hantai_dete', 'sugu_desu'], zh:'請下樓梯。走地下通道，從另一側出去。馬上就到。'},
    q:[Q('路線順序？', ['下樓梯→走地下→另一側出去', '上樓梯→過天橋→右轉', '直走→過馬路→左轉'], 'chika_tootte', 'chika_tootte_e'), Q('出去之後還要走多遠？', ['出去就到了', '要再搭車', '要走 10 分鐘'], 'hantai_detara', 'sugu_desu')],
    learn:['下樓梯→走地下→另一側出去'], todo:'確認出口怎麼認', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['deguchi_namae'], '另一側的出口叫什麼名字？', 'ok', '日本車站出口很多，問出口名稱最實際。', 'n4'),
    O(['chikatetsu_ka'], '要搭地下鐵嗎？', 'ok', '不確定就問，他會說明「地下」只是通道。', 'n3b', {fix:true}),
    O(['sumimasen', 'yukkuri'], '不好意思，請說慢一點。', 'ok', '口語聽不清楚就請他慢一點。', 'n2s', {fix:true})]},
  {id:'n3b', t:'hear', c:['aruite_ikemasu'], zh:'不不，走路就能到。', q:[Q('要怎麼去？', ['走路就能到', '要搭地下鐵', '要搭計程車'], 'aruite_ikemasu')], learn:['走地下通道過去，不用搭車'], next:'n3'},
  {id:'n2s', t:'hear', c:['kaidan_orite_e', 'chika_tootte_e', 'hantai_dete', 'sugu_desu'], zh:'請下樓梯。走地下通道，從另一側出去。馬上就到。', q:[], learn:['下樓梯，走地下通道，另一側出去'], next:'n3'},
  {id:'n4', t:'hear', c:['namae_oboete', 'kaite_aru', 'mite_ikeba'], zh:'名字我不記得，不過有寫「巴士搭乘處」，跟著它走就沒問題。',
    q:[Q('要怎麼找到出口？', ['跟著「バスのりば」的標示', '找出口的名字', '再問下一個人'], 'kaite_aru')], learn:['跟著「バスのりば」標示'],
    fig:{type:'steps', s:[['↓', '下樓梯'], ['→', '走地下通道'], ['↑', '另一側出去'], ['■', '看「バスのりば」標示']]}, next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你下樓梯走地下通道，跟著「バスのりば」標示，從另一側出去就到了。'}]);

K('sore_nara', 'バス？あ、それなら、', 'basu? a, sore nara', '巴士？啊，那樣的話', 'cond');
K('kocchi_dete', 'こっち{出|で}て、', 'kotchi dete', '從這邊出去', 'dir');
K('mou_miemasu', 'まっすぐ{行|い}ったら、もう{見|み}えますよ。', 'massugu ittara, mō miemasu yo', '直走就看得到了', 'place');
K('kono_deguchi', 'この{出口|でぐち}を{出|で}てください。', 'kono deguchi o dete kudasai', '請從這個出口出去', 'dir');
K('massugu_mieru', 'まっすぐ{行|い}くと{見|み}えます。', 'massugu iku to miemasu', '直走就會看到', 'place');
K('kono_deguchi_ne', 'この{出口|でぐち}からまっすぐですね。', 'kono deguchi kara massugu desu ne', '從這個出口直走，對吧？', 'ask');
V('way', 4, 'w4t', {who:'路人', tr:true, note:'換說法：それなら／こっち出て'}, [wOpen(),
  {id:'n2', t:'hear', c:['sore_nara', 'kocchi_dete', 'mou_miemasu'], zh:'巴士？啊，那樣的話，從這邊出去，直走就看得到了。', point:'他指著你身後的出口。',
    easy:{c:['kono_deguchi', 'massugu_mieru'], zh:'請從這個出口出去。直走就會看到。'},
    q:[Q('怎麼去？', ['從這邊出去，直走就看得到', '要搭車', '往回走'], 'kocchi_dete', 'kono_deguchi')], learn:['從這個出口出去直走'], next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['kono_deguchi_ne'], '從這個出口直走，對吧？', 'ok', '確認方向。', 'n5', {skel:'ne', fix:true}),
    O(['arigatou'], '謝謝。', 'ok', '聽懂就出發。', 'n5')]},
  {id:'n5', t:'end', res:'ok', text:'你從這個出口出去，直走就看到搭乘處。'}]);

K('wakarinikui', 'バス{乗|の}り{場|ば}は、ここからだとちょっと{分|わ}かりにくいんですよ。', 'basu noriba wa, koko kara da to chotto wakarinikui n desu yo', '巴士搭乘處從這裡去有點難找', 'filler', '開場白，不是指路。後面才是重點。');
K('kaisatsu_dete', 'この{先|さき}の{改札|かいさつ}を{出|で}て、', 'kono saki no kaisatsu o dete', '從前面的剪票口出去', 'dir', '改札＝剪票口。');
K('hidari_zutto', '{左|ひだり}にずっと{行|い}くと、', 'hidari ni zutto iku to', '往左一直走的話', 'dir');
K('esuka', '{大|おお}きいエスカレーターがあるので、', 'ōkii esukarētā ga aru node', '會有大手扶梯，所以…', 'place');
K('ikkai_made', 'それで1{階|かい}まで{降|お}りてください。', 'sore de ikkai made orite kudasai', '搭它下到 1 樓', 'dir');
K('me_no_mae', '{降|お}りたら{目|め}の{前|まえ}です。', 'oritara me no mae desu', '下來就在眼前', 'place');
K('kaisatsu_hidari', '{改札|かいさつ}を{出|で}て、{左|ひだり}です。', 'kaisatsu o dete, hidari desu', '出剪票口，往左', 'dir');
K('esuka_1kai', 'エスカレーターで1{階|かい}に{降|お}りてください。', 'esukarētā de ikkai ni orite kudasai', '搭手扶梯下到 1 樓', 'dir');
K('kaisatsu_ne', '{改札|かいさつ}を{出|で}て、{左|ひだり}、エスカレーターで1{階|かい}ですね。', 'kaisatsu o dete, hidari, esukarētā de ikkai desu ne', '出剪票口、往左、搭手扶梯到 1 樓，對吧？', 'ask');
K('wakarinikui_ii', '{分|わ}かりにくいですか。じゃあ、いいです。', 'wakarinikui desu ka. jā, ii desu', '很難找嗎？那算了', 'ask');
K('nikai_ka', '2{階|かい}ですか。', 'nikai desu ka', '2 樓嗎？', 'ask');
K('ie_ikkai', 'いえ、1{階|かい}です。', 'ie, ikkai desu', '不，是 1 樓', 'num');
K('soudesu2', 'そうです、そうです。', 'sō desu, sō desu', '對對', 'concl');
K('ekiin', '{分|わ}からなかったら、また{駅員|えきいん}に{聞|き}いてくださいね。', 'wakaranakattara, mata ekiin ni kiite kudasai ne', '找不到的話再問站務員喔', 'next', '駅員＝站務員。');
V('way', 5, 'w5a', {who:'站務員', note:'長的指路：開場白＋路線'}, [wOpen(),
  {id:'n2', t:'hear', c:['wakarinikui', 'kaisatsu_dete', 'hidari_zutto', 'esuka', 'ikkai_made', 'me_no_mae'], zh:'巴士搭乘處從這裡去有點難找喔。從前面的剪票口出去，往左一直走，會有一個大手扶梯，請搭它下到 1 樓。下來就在眼前。',
    easy:{c:['kaisatsu_hidari', 'esuka_1kai'], zh:'出剪票口，往左。搭手扶梯下到 1 樓。'},
    q:[Q('第一句「分かりにくい」是什麼意思？', ['只是說有點難找', '搭乘處今天關閉', '要另外付錢'], 'wakarinikui'), Q('路線是？', ['出剪票口→往左→手扶梯下到 1 樓', '出剪票口→往右→樓梯上 2 樓', '不出剪票口→往左→電梯'], 'hidari_zutto', 'kaisatsu_hidari')],
    learn:['出剪票口→往左→手扶梯下到 1 樓'], next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['kaisatsu_ne'], '出剪票口、往左、搭手扶梯到 1 樓，對吧？', 'ok', '長的指路只挑「動作」確認：出去、往左、往下。', 'n4', {skel:'ne', fix:true}),
    O(['wakarinikui_ii'], '很難找嗎？那算了。', 'bad', '「有點難找」只是開場白，他後面就告訴你怎麼走了。', null),
    O(['nikai_ka'], '2 樓嗎？', 'part', '用問句確認沒關係，他會糾正你：是 1 樓。', 'n3b', {fix:true})]},
  {id:'n3b', t:'hear', c:['ie_ikkai'], zh:'不，是 1 樓。', q:[], learn:['是 1 樓'], next:'n3'},
  {id:'n4', t:'hear', c:['soudesu2', 'ekiin'], zh:'對對。找不到的話再問站務員喔。', q:[Q('他最後說什麼？', ['找不到就再問站務員', '搭計程車比較好', '今天沒有巴士'], 'ekiin')], learn:['找不到可以再問站務員'],
    fig:{type:'steps', s:[['■', '出剪票口'], ['←', '往左一直走'], ['↓', '大手扶梯下到 1 樓'], ['■', '眼前就是搭乘處']]}, next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你出剪票口往左，搭大手扶梯到 1 樓，巴士搭乘處就在眼前。'}]);

K('kinkakuyuki_deshitara', '{金閣寺行|きんかくじゆ}きのバスでしたら、', 'Kinkakuji-yuki no basu deshitara', '如果是往金閣寺的巴士', 'cond');
K('koko_janakute', 'ここじゃなくて、', 'koko ja nakute', '不是這裡，而是…', 'neg');
K('chuouguchi', '{中央口|ちゅうおうぐち}のほうのバスターミナルですね。', 'chūō-guchi no hō no basu tāminaru desu ne', '是中央口那邊的巴士總站', 'place');
K('tsuuro', 'この{通路|つうろ}をまっすぐ{行|い}って、', 'kono tsūro o massugu itte', '這條通道直走', 'dir');
K('tsukiatari', '{突|つ}き{当|あ}たりを{右|みぎ}、', 'tsukiatari o migi', '走到底右轉', 'dir', '突き当たり＝走到底（路的盡頭）。');
K('soto_mae', '{外|そと}に{出|で}たら{目|め}の{前|まえ}です。', 'soto ni detara me no mae desu', '出去就在眼前', 'place');
K('b3', '205{番|ばん}はB3っていうのりばです。', 'nihyaku-go-ban wa bī-surī tte iu noriba desu', '205 號是叫 B3 的乘車處', 'num');
K('chuouguchi_e', '{中央口|ちゅうおうぐち}のバスターミナルです。', 'chūō-guchi no basu tāminaru desu', '在中央口的巴士總站', 'place');
K('massugu_migi', 'まっすぐ{行|い}って、{右|みぎ}です。', 'massugu itte, migi desu', '直走，然後右轉', 'dir');
K('b3_ne', 'B3ですね。ありがとうございます。', 'bī-surī desu ne. arigatō gozaimasu', 'B3 對吧，謝謝', 'ask');
K('koko_de_machimasu', 'ここで{待|ま}ちます。', 'koko de machimasu', '我在這裡等', 'ask');
V('way', 5, 'w5t', {who:'站務員', tr:true, note:'換說法：ここじゃなくて／突き当たり'}, [wOpen(),
  {id:'n2', t:'hear', c:['kinkakuyuki_deshitara', 'koko_janakute', 'chuouguchi', 'tsuuro', 'tsukiatari', 'soto_mae', 'b3'], zh:'如果是往金閣寺的巴士，不是這裡，是中央口那邊的巴士總站。這條通道直走，走到底右轉，出去就在眼前。205 號是叫 B3 的乘車處。',
    easy:{c:['chuouguchi_e', 'massugu_migi', 'b3'], zh:'在中央口的巴士總站。直走，然後右轉。205 號是 B3 乘車處。'},
    q:[Q('要去哪裡？', ['中央口那邊的巴士總站', '這裡就是', '地下鐵站'], 'chuouguchi', 'chuouguchi_e'), Q('路線是？', ['通道直走→走到底右轉→出去就到', '通道直走→走到底左轉', '上樓→右轉'], 'tsukiatari', 'massugu_migi'), Q('205 號在哪個乘車處？', ['B3', 'B13', '3 號月台'], 'b3', 'b3')],
    learn:['不是這裡：中央口巴士總站', '直走到底右轉', '205 號在 B3'], next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['b3_ne'], 'B3 對吧，謝謝。', 'ok', '確認乘車處編號就能出發。', 'n5', {skel:'ne', fix:true}),
    O(['koko_de_machimasu'], '我在這裡等。', 'bad', '他說「ここじゃなくて」＝不是這裡。', null),
    O(['sumimasen', 'mouichido'], '不好意思，請再說一次。', 'ok', '長的指路請他再說，他會說得短一點。', 'n2r', {fix:true})]},
  {id:'n2r', t:'hear', c:['chuouguchi_e', 'massugu_migi', 'b3'], zh:'在中央口的巴士總站。直走，然後右轉。205 號是 B3 乘車處。', q:[], learn:['中央口，直走右轉，B3'], next:'n3'},
  {id:'n5', t:'end', res:'ok', text:'你走到中央口的巴士總站，在 B3 等 205 號。'}]);
