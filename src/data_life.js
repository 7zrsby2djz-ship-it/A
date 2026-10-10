/* ============================================================
   生活情境（非觀光地點最需要日文的場合）
   ------------------------------------------------------------
   格式和 data_tasks.js 一樣（K / T / V / Q / O），差別：
   - levels:3（每個情境 3 級，各有一般變體＋換說法變體）
   - group:'生活'，dk：任務板第一格的標題（不是目的地時用「目標」），todo0：任務板一開始的下一步
   - 類別 q：對方在問你（店員的問句）。聽懂「他在問什麼」就能回答，所以算關鍵資訊。
   - 很多情境是對方先開口（店員、廣播），所以第一個節點可以是 hear。
   - 廣播節點 bc:true：沒辦法請廣播重說，只提供「重播」「放慢」。
   - 關鍵字策略：一個關鍵字＋問的語氣（例如「洗濯機？」「全部普通で」「初めてです」）通常就夠，判定為 ok。
   - 金額、店名、月台號碼、各店流程都是模擬；免稅制度 2026 年 11 月起改成出境時退稅，店員說法會變，所以暫不做免稅對話。
   ============================================================ */
TASKS.forEach(t => { t.group = t.group || '交通'; });
const LIFE = '生活';

/* ---------- 生活共用句塊 ---------- */
K('l_onegai', 'お{願|ねが}いします。', 'onegai shimasu', '麻煩你（＝要）', 'polite', '回答「要不要〜」時＝要。加熱、袋子、筷子都能用這一句。');
K('l_daijoubu', '{大丈夫|だいじょうぶ}です。', 'daijōbu desu', '這裡用來婉拒：不用了', 'neg', '回應「要不要袋子／加熱」時常是婉拒；回答「還好嗎／這樣可以嗎」時也可表示沒事、可以。要連前一句與手勢一起判斷，「はい」不會固定翻轉意思。想拒絕得清楚，可說「袋はいりません」。');
K('l_hai', 'はい。', 'hai', '好／是', 'concl');
K('l_irasshai', 'いらっしゃいませ。', 'irasshaimase', '歡迎光臨', 'filler', '不用回答，點頭或微笑就好。');

/* ============================================================
   生活一：便利商店・結帳
   店員常見問法（袋子、加熱、筷子、集點卡、付款方式、年齡確認）參考便利商店接客用語整理。
   ============================================================ */
T({id:'conv', group:LIFE, levels:3, name:'便利商店・結帳', place:'東京／札幌・便利商店收銀台', dest:'結完帳、拿到要的東西', dk:'目標', todo0:'聽懂店員在問什麼',
  setup:'你拿著便當到收銀台。店員會連續問幾個「要不要」。',
  sim:'模擬情境：問法是便利商店常見說法；各店流程不同（很多店是店員刷條碼、你自己在畫面上付錢）。',
  axis:{1:'店員一句短問句：要不要', 2:'一次問兩件事、問付款方式', 3:'說得快，加上畫面操作'}});
K('cv_fukuro_goriyou', '{袋|ふくろ}はご{利用|りよう}ですか。', 'fukuro wa goriyō desu ka', '要袋子嗎？', 'q', 'ご利用ですか＝要使用嗎。袋子通常要另外付幾日圓。');
K('cv_atatame_masuka', '{温|あたた}めますか。', 'atatamemasu ka', '要加熱嗎？', 'q');
K('cv_fukuro_iru', '{袋|ふくろ}、いりますか。', 'fukuro, irimasu ka', '要袋子嗎？（比較隨意）', 'q', 'いる＝需要。');
K('cv_atatame_dou', '{温|あたた}めはどうされますか。', 'atatame wa dō saremasu ka', '要不要加熱？（加熱的部分怎麼處理）', 'q', 'どうされますか＝您要怎麼做？店員很常用。');

V('conv', 1, 'cv1a', {who:'店員', note:'袋子、加熱'}, [
  {id:'n1', t:'say', intent:'把東西放到櫃台，說一句：麻煩你', c:['l_onegai'], zh:'麻煩你。', next:'n2'},
  {id:'n2', t:'hear', c:['cv_fukuro_goriyou'], zh:'要袋子嗎？', q:[Q('店員在問什麼？', ['要不要袋子', '要不要加熱', '有沒有集點卡'], 'cv_fukuro_goriyou')], learn:['店員問要不要袋子'], todo:'回答要／不要', next:'n3'},
  {id:'n3', t:'act', q:'你有自己的購物袋，不需要袋子。怎麼回？', o:[
    O(['l_daijoubu'], '不用了。', 'ok', '「大丈夫です」＝不用，謝謝。便利商店最常用的拒絕。', 'n4'),
    O(['l_onegai'], '麻煩你（要袋子）。', 'part', '這樣是「要袋子」，會多付袋子錢。不需要就說「大丈夫です」。', null),
    O(null, '手掌在臉前輕輕揮一下', 'ok', '這個手勢店員看得懂＝不用。能加一句「大丈夫です」更清楚。', 'n4', {do:'手掌輕輕揮一下'})]},
  {id:'n4', t:'hear', c:['cv_atatame_masuka'], zh:'要加熱嗎？', q:[Q('店員在問什麼？', ['便當要不要加熱', '要不要筷子', '要不要袋子'], 'cv_atatame_masuka')], learn:['問便當要不要加熱'], todo:'回答要／不要', next:'n5'},
  {id:'n5', t:'act', q:'你想吃熱的。怎麼回？', o:[
    O(['l_onegai'], '麻煩你。', 'ok', '「お願いします」＝要。', 'n6'),
    O(['l_hai'], '好。', 'ok', '「はい」也通，店員會幫你加熱。', 'n6'),
    O(['l_daijoubu'], '不用了。', 'part', '這樣是「不用加熱」。想吃熱的就說「お願いします」。', null)]},
  {id:'n6', t:'end', res:'ok', text:'你拿到熱的便當，也沒有多買袋子。'}]);

V('conv', 1, 'cv1t', {who:'店員', tr:true, note:'換說法：いりますか／どうされますか', setup:'你買了飯糰和茶，想吃冷的。'}, [
  {id:'n1', t:'say', intent:'把東西放到櫃台，說一句：麻煩你', c:['l_onegai'], zh:'麻煩你。', next:'n2'},
  {id:'n2', t:'hear', c:['cv_fukuro_iru'], zh:'要袋子嗎？', q:[Q('店員在問什麼？', ['要不要袋子', '要不要收據', '要不要加熱'], 'cv_fukuro_iru')], learn:['店員問要不要袋子'], todo:'回答要／不要', next:'n3'},
  {id:'n3', t:'act', q:'你想要袋子。怎麼回？', o:[
    O(['l_onegai'], '麻煩你。', 'ok', '「お願いします」＝要。', 'n4'),
    O(['l_daijoubu'], '不用了。', 'part', '這樣是「不用」。想要袋子就說「お願いします」。', null)]},
  {id:'n4', t:'hear', c:['cv_atatame_dou'], zh:'要不要加熱？', q:[Q('店員在問什麼？', ['要不要加熱', '怎麼付錢', '要不要筷子'], 'cv_atatame_dou')], learn:['問要不要加熱'], todo:'回答要／不要', next:'n5'},
  {id:'n5', t:'act', q:'飯糰你想吃冷的。怎麼回？', o:[
    O(['l_daijoubu'], '不用了。', 'ok', '不用加熱就說「大丈夫です」。', 'n6'),
    O(['l_onegai'], '麻煩你。', 'part', '這樣店員會幫你加熱。你想吃冷的。', null)]},
  {id:'n6', t:'end', res:'ok', text:'你拿到袋子，飯糰沒有被加熱。'}]);

K('cv_fukuro_hashi', '{袋|ふくろ}とお{箸|はし}は、おつけしますか。', 'fukuro to ohashi wa, otsuke shimasu ka', '袋子和筷子要附嗎？', 'q', 'おつけしますか＝要幫您附上嗎。');
K('cv_fukuro_iranai', '{袋|ふくろ}はいらないです。', 'fukuro wa iranai desu', '袋子不用', 'neg');
K('cv_hashi_onegai', 'お{箸|はし}はお{願|ねが}いします。', 'ohashi wa onegai shimasu', '筷子要', 'ask');
K('cv_shiharai', 'お{支払|しはら}いはどうされますか。', 'oshiharai wa dō saremasu ka', '要怎麼付款？', 'q');
K('cv_suica_de', 'Suicaで。', 'suika de', '用 Suica', 'ask', '〜で＝用〜。付款只要說工具＋で。');
K('cv_card_de', 'カードで。', 'kādo de', '用信用卡', 'ask');
K('cv_genkin_de', '{現金|げんきん}で。', 'genkin de', '用現金', 'ask');
K('cv_kazashite', 'こちらにかざしてください。', 'kochira ni kazashite kudasai', '請靠在這裡（感應）', 'next', 'かざす＝把卡或手機靠近感應器。');
V('conv', 2, 'cv2a', {who:'店員', note:'兩件事一起問、付款', setup:'你買了杯麵和水，要回旅館吃，需要筷子；你有自己的購物袋。'}, [
  {id:'n1', t:'say', intent:'把東西放到櫃台，說一句：麻煩你', c:['l_onegai'], zh:'麻煩你。', next:'n2'},
  {id:'n2', t:'hear', c:['cv_fukuro_hashi'], zh:'袋子和筷子要附嗎？', q:[Q('店員問了哪兩樣？', ['袋子和筷子', '袋子和湯匙', '筷子和加熱'], 'cv_fukuro_hashi')], learn:['問袋子和筷子'], todo:'分開回答兩件事', next:'n3'},
  {id:'n3', t:'act', q:'袋子不用，筷子要。怎麼回？', o:[
    O(['cv_fukuro_iranai', 'cv_hashi_onegai'], '袋子不用，筷子要。', 'ok', '分開說最清楚：「〜はいらないです」「〜はお願いします」。', 'n4'),
    O(['l_daijoubu'], '不用了。', 'part', '這樣兩樣都不要了。吃杯麵沒有筷子會很麻煩。', null),
    O(['l_onegai'], '麻煩你。', 'part', '這樣兩樣都要了，會多一個袋子。可以分開說：袋子不用、筷子要。', 'n4')]},
  {id:'n4', t:'hear', c:['cv_shiharai'], zh:'要怎麼付款？', q:[Q('店員在問什麼？', ['怎麼付錢', '要不要收據', '有沒有集點卡'], 'cv_shiharai')], learn:['問付款方式'], todo:'說付款方式', next:'n5'},
  {id:'n5', t:'act', q:'你要用 Suica 付。怎麼說？', o:[
    O(['cv_suica_de'], '用 Suica。', 'ok', '工具＋で，就是付款方式。', 'n6'),
    O(['cv_card_de'], '用信用卡。', 'ok', '也可以，換成用卡付。', 'n6'),
    O(['l_onegai'], '麻煩你。', 'part', '店員問的是「怎麼付」，要說方式：「Suicaで」「カードで」。', null)]},
  {id:'n6', t:'hear', c:['cv_kazashite'], zh:'請靠在這裡。', q:[Q('要怎麼做？', ['把卡靠在感應器上', '把卡插進去', '把卡交給店員'], 'cv_kazashite')], learn:['卡靠在感應器上'], todo:'感應付款', next:'n7'},
  {id:'n7', t:'end', res:'ok', text:'你拿到筷子，沒多拿袋子，用 Suica 付好了。'}]);

K('cv_point', 'ポイントカードはお{持|も}ちですか。', 'pointo kādo wa omochi desu ka', '有集點卡嗎？', 'q', 'お持ちですか＝您有帶嗎。沒有就說「ないです」。');
K('cv_nai_desu', 'ないです。', 'nai desu', '沒有', 'neg');
K('cv_shiharai_houhou', 'お{支払|しはら}い{方法|ほうほう}は？', 'oshiharai hōhō wa?', '付款方式呢？', 'q', '話只說一半＋語尾上揚＝在問你。');
V('conv', 2, 'cv2t', {who:'店員', tr:true, note:'換說法：集點卡、方法は？', setup:'你買了一瓶水。'}, [
  {id:'n1', t:'say', intent:'把東西放到櫃台，說一句：麻煩你', c:['l_onegai'], zh:'麻煩你。', next:'n2'},
  {id:'n2', t:'hear', c:['cv_point'], zh:'有集點卡嗎？', q:[Q('店員在問什麼？', ['有沒有集點卡', '要不要袋子', '要不要收據'], 'cv_point')], learn:['問集點卡'], todo:'回答有／沒有', next:'n3'},
  {id:'n3', t:'act', q:'你沒有集點卡。怎麼回？', o:[
    O(['cv_nai_desu'], '沒有。', 'ok', '沒有就說「ないです」。', 'n4'),
    O(['l_daijoubu'], '不用了。', 'ok', '也很常見，店員懂你不需要。', 'n4'),
    O(['l_hai'], '是。', 'part', '「はい」＝有。店員會等你拿卡出來。', null)]},
  {id:'n4', t:'hear', c:['cv_shiharai_houhou'], zh:'付款方式呢？', q:[Q('店員在問什麼？', ['怎麼付錢', '要不要袋子', '要不要加熱'], 'cv_shiharai_houhou')], learn:['問付款方式'], todo:'說付款方式', next:'n5'},
  {id:'n5', t:'act', q:'你要付現金。怎麼說？', o:[
    O(['cv_genkin_de'], '用現金。', 'ok', '現金＋で。', 'n6'),
    O(null, '直接把錢放在收銀台的小托盤上', 'ok', '也行，店員會懂。日本習慣把錢放在托盤上，不直接交到手上。', 'n6', {do:'把錢放在托盤上'})]},
  {id:'n6', t:'end', res:'ok', text:'你用現金付好了。'}]);

K('cv_nenrei', '{年齢|ねんれい}{確認|かくにん}のため、', 'nenrei kakunin no tame,', '為了確認年齡', 'reason');
K('cv_gamen_touch', '{画面|がめん}のタッチをお{願|ねが}いします。', 'gamen no tatchi o onegai shimasu', '請按一下畫面', 'next', '買酒時畫面會問「你滿 20 歲了嗎」，按「はい」。');
K('cv_botan', 'ボタン、{押|お}してください。', 'botan, oshite kudasai', '請按按鈕', 'next');
K('cv_shiharai_gamen', 'お{支払|しはら}いは、そちらの{画面|がめん}からお{選|えら}びください。', 'oshiharai wa, sochira no gamen kara oerabi kudasai', '付款方式請在那個畫面上選', 'next', '很多店是「店員刷條碼、你自己在畫面上付錢」。');
K('cv_gamen_de', '{画面|がめん}で{選|えら}んでください。', 'gamen de erande kudasai', '請在畫面上選', 'next');
V('conv', 3, 'cv3a', {who:'店員', note:'買酒：年齡確認、畫面付款', setup:'你買了啤酒和飯糰。這家店是店員刷條碼，你自己在畫面上付錢。'}, [
  {id:'n1', t:'say', intent:'把東西放到櫃台，說一句：麻煩你', c:['l_onegai'], zh:'麻煩你。', next:'n2'},
  {id:'n2', t:'hear', c:['cv_nenrei', 'cv_gamen_touch'], zh:'為了確認年齡，請按一下畫面。',
    easy:{c:['cv_botan'], zh:'請按按鈕。'},
    q:[Q('店員要你做什麼？', ['按畫面上的按鈕', '拿出護照', '付現金'], 'cv_gamen_touch', 'cv_botan'), Q('為什麼？', ['確認年齡', '確認集點', '確認袋子'], 'cv_nenrei')],
    learn:['買酒要在畫面上確認年齡'], todo:'按畫面', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼做？', o:[
    O(null, '按畫面上的「はい」', 'ok', '畫面會問「你滿 20 歲了嗎」，按「はい」就好。', 'n4', {do:'按畫面上的「はい」'}),
    O(['sumimasen', 'mouichido'], '不好意思，請再說一次。', 'ok', '聽不清楚就請他再說，完全沒問題。', 'n2r', {fix:true}),
    O(null, '拿出護照給店員', 'part', '通常不用，按畫面就好。店員有疑問時才會看證件。', null, {do:'拿出護照'})]},
  {id:'n2r', t:'hear', c:['cv_botan'], zh:'請按按鈕。', q:[], next:'n3'},
  {id:'n4', t:'hear', c:['cv_shiharai_gamen'], zh:'付款方式請在那個畫面上選。',
    easy:{c:['cv_gamen_de'], zh:'請在畫面上選。'},
    q:[Q('付款方式在哪裡選？', ['在畫面上自己選', '跟店員說', '去另一台收銀機'], 'cv_shiharai_gamen', 'cv_gamen_de')],
    learn:['付款方式在畫面上自己選'], todo:'在畫面上選付款方式', next:'n5'},
  {id:'n5', t:'act', q:'你要用信用卡付：', o:[
    O(null, '在畫面上按「クレジット」，把卡靠上去', 'ok', '畫面上的付款按鈕常見：現金／クレジット（信用卡）／交通系（Suica 等）。', 'n6', {do:'在畫面上選信用卡'}),
    O(['cv_card_de'], '用信用卡。', 'part', '店員聽得懂，但還是會請你在畫面上選。直接按畫面最快。', 'n6'),
    O(null, '把卡交給店員', 'part', '這種收銀台要你自己操作，店員會指畫面給你看。', null, {do:'把卡交給店員'})]},
  {id:'n6', t:'end', res:'ok', text:'你按了年齡確認，也在畫面上付好錢。'}]);

K('cv_kochira_atatame', 'こちら{温|あたた}めますか。', 'kochira atatamemasu ka', '這個要加熱嗎？', 'q');
K('cv_ohashi_ichizen', 'お{箸|はし}は{一膳|いちぜん}でよろしいですか。', 'ohashi wa ichizen de yoroshii desu ka', '筷子一雙可以嗎？', 'num', '膳＝筷子的單位。一膳＝一雙。');
K('cv_ohashi', 'お{箸|はし}つけますか。', 'ohashi tsukemasu ka', '要筷子嗎？', 'q');
K('cv_atatame_onegai', '{温|あたた}めお{願|ねが}いします。', 'atatame onegai shimasu', '請幫我加熱', 'ask');
V('conv', 3, 'cv3t', {who:'店員', tr:true, note:'換說法：一口氣問兩件事', setup:'你買了一個便當。店員說得很快，一次問兩件事。你要加熱，也要筷子。'}, [
  {id:'n1', t:'say', intent:'把東西放到櫃台，說一句：麻煩你', c:['l_onegai'], zh:'麻煩你。', next:'n2'},
  {id:'n2', t:'hear', c:['cv_kochira_atatame', 'cv_ohashi_ichizen'], zh:'這個要加熱嗎？筷子一雙可以嗎？',
    easy:{c:['cv_atatame_masuka', 'cv_ohashi'], zh:'要加熱嗎？要筷子嗎？'},
    q:[Q('第一件問什麼？', ['要不要加熱', '要不要袋子', '怎麼付錢'], 'cv_kochira_atatame', 'cv_atatame_masuka'), Q('第二件問什麼？', ['筷子一雙可以嗎', '要不要湯匙', '有沒有集點卡'], 'cv_ohashi_ichizen', 'cv_ohashi')],
    learn:['問加熱，也問筷子一雙可以嗎'], todo:'兩件都回答', next:'n3'},
  {id:'n3', t:'act', q:'加熱要，筷子一雙就夠。怎麼回？', o:[
    O(['l_onegai'], '麻煩你。', 'ok', '兩件都「要」的時候，一句「お願いします」就都回答了。', 'n5'),
    O(['l_hai', 'cv_atatame_onegai'], '好，請幫我加熱。', 'ok', '先用「はい」回答筷子，再說加熱，很清楚。', 'n5'),
    O(['cv_atatame_onegai'], '請幫我加熱。', 'part', '加熱有回答到，筷子沒回答。店員多半會再問一次。', 'n4'),
    O(['l_daijoubu'], '不用了。', 'bad', '這樣兩件都變成「不用」，便當冷的、也沒有筷子。', 'n4b')]},
  {id:'n4', t:'hear', c:['cv_ohashi'], zh:'要筷子嗎？', q:[Q('他再問什麼？', ['要不要筷子', '要不要加熱', '要不要袋子'], 'cv_ohashi')], next:'n3b'},
  {id:'n3b', t:'act', q:'要筷子：', o:[
    O(['l_onegai'], '麻煩你。', 'ok', '補回答就好。', 'n5'),
    O(['l_daijoubu'], '不用了。', 'part', '這樣就沒有筷子了。', null)]},
  {id:'n4b', t:'hear', c:['cv_atatame_masuka', 'cv_ohashi'], zh:'要加熱嗎？要筷子嗎？', who:'店員（再確認一次）', q:[], next:'n3'},
  {id:'n5', t:'end', res:'ok', text:'便當加熱好了，也拿到一雙筷子。'}]);

/* ============================================================
   生活二：居酒屋
   使用者實際卡住的地方：點啤酒。最自然的點法「とりあえず生で」「生、ひとつ」。
   お通し（自動上的小菜、會收費）是居酒屋常見習慣。
   ============================================================ */
T({id:'izakaya', group:LIFE, levels:3, name:'居酒屋・一個人點啤酒', place:'東京／札幌・小居酒屋', dest:'坐下、點到喝的和吃的、結帳', dk:'目標', todo0:'進門，回答人數',
  setup:'你一個人推開一家小居酒屋的門。',
  sim:'模擬情境：流程（先問人數、先點飲料、お通し、最後點餐、櫃台結帳）是常見做法；菜色、金額、只收現金與否各店不同。',
  axis:{1:'進門＋點第一杯', 2:'店員多問一句（大小、推薦、等候）', 3:'最後點餐、結帳、只收現金'}});
K('iz_nanmei', '{何名様|なんめいさま}ですか。', 'nanmei-sama desu ka', '幾位？', 'q');
K('iz_hitori_desu', '{一人|ひとり}です。', 'hitori desu', '一個人', 'num', '人數：一人（ひとり）、二人（ふたり）。東西才用「ひとつ」。');
K('iz_hitotsu_desu', 'ひとつです。', 'hitotsu desu', '一個', 'num');
K('iz_counter_douzo', 'カウンターへどうぞ。', 'kauntā e dōzo', '請坐吧台', 'place');
K('iz_nomimono_saki', 'お{飲|の}み{物|もの}、{先|さき}にお{伺|うかが}いします。', 'onomimono, saki ni oukagai shimasu', '飲料先幫您點', 'next', '居酒屋入座後通常先點飲料，菜等一下再點。');
K('iz_nama_kudasai', '{生|なま}ビール、ひとつください。', 'nama bīru, hitotsu kudasai', '生啤酒一杯', 'ask');
K('iz_toriaezu', 'とりあえず{生|なま}で。', 'toriaezu nama de', '先來杯生啤', 'ask', '日本人最常說的開場。とりあえず＝先、暫且。');
K('iz_beer_onegai', 'ビール、お{願|ねが}いします。', 'bīru, onegai shimasu', '啤酒，麻煩你', 'ask');
V('izakaya', 1, 'iz1a', {who:'店員', note:'人數、第一杯'}, [
  {id:'n1', t:'hear', c:['l_irasshai', 'iz_nanmei'], zh:'歡迎光臨。幾位？', q:[Q('店員在問什麼？', ['幾位', '要喝什麼', '有沒有訂位'], 'iz_nanmei')], learn:['問幾位'], todo:'回答人數', next:'n2'},
  {id:'n2', t:'act', q:'你一個人。怎麼回？', o:[
    O(['iz_hitori_desu'], '一個人。', 'ok', '人數用「一人」。', 'n3'),
    O(null, '比出一根手指', 'ok', '門口比手指完全通用。能加一句「一人です」更好。', 'n3', {do:'比一根手指'}),
    O(['iz_hitotsu_desu'], '一個。', 'part', '店員聽得懂，但人數要說「一人」。「ひとつ」是數東西用的。', 'n3')]},
  {id:'n3', t:'hear', c:['iz_counter_douzo'], zh:'請坐吧台。', q:[Q('要坐哪裡？', ['吧台', '包廂', '外面等'], 'iz_counter_douzo')], learn:['坐吧台'], todo:'坐下', next:'n4'},
  {id:'n4', t:'hear', c:['iz_nomimono_saki'], zh:'飲料先幫您點。', q:[Q('店員要你先做什麼？', ['先點飲料', '先點菜', '先付錢'], 'iz_nomimono_saki')], learn:['先點飲料'], todo:'點一杯生啤', next:'n5'},
  {id:'n5', t:'act', q:'你想喝生啤酒。怎麼說？', o:[
    O(['iz_toriaezu'], '先來杯生啤。', 'ok', '最在地的說法，店員一聽就懂。', 'n6'),
    O(['iz_nama_kudasai'], '生啤酒一杯。', 'ok', '完整又清楚。', 'n6'),
    O(['iz_beer_onegai'], '啤酒，麻煩你。', 'ok', '也行，店員可能再問大小或牌子。', 'n6'),
    O(null, '低頭看菜單，不說話', 'part', '店員會一直等你。先點飲料是固定流程，不知道點什麼就說「とりあえず生で」。', null, {do:'看菜單不說話'})]},
  {id:'n6', t:'end', res:'ok', text:'啤酒很快就來了。第一杯點成功。'}]);

K('iz_hitori_sama', 'お{一人様|ひとりさま}ですか。', 'ohitori-sama desu ka', '一位嗎？', 'q');
K('iz_counter_ii', 'カウンター{席|せき}でもよろしいですか。', 'kauntā-seki demo yoroshii desu ka', '坐吧台可以嗎？', 'q');
K('iz_hai_daijoubu', 'はい、{大丈夫|だいじょうぶ}です。', 'hai, daijōbu desu', '這裡表示：好，沒問題', 'concl', '這裡回答「這樣可以嗎」，表示可以。意思取決於對方的問題與情境；加「はい」並不是通用的肯定／否定開關。');
K('iz_kimattara', 'お{飲|の}み{物|もの}、お{決|き}まりでしたらどうぞ。', 'onomimono, okimari deshitara dōzo', '飲料決定好了就請說', 'next');
K('iz_nama_hitotsu', '{生|なま}、ひとつ。', 'nama, hitotsu', '生啤一杯', 'ask', '最短的點法：東西＋數量。');
V('izakaya', 1, 'iz1t', {who:'店員', tr:true, note:'換說法：お一人様／カウンター席'}, [
  {id:'n1', t:'hear', c:['l_irasshai', 'iz_hitori_sama'], zh:'歡迎光臨。一位嗎？', q:[Q('店員在問什麼？', ['你是一個人嗎', '有訂位嗎', '要外帶嗎'], 'iz_hitori_sama')], learn:['問是不是一位'], todo:'回答', next:'n2'},
  {id:'n2', t:'act', q:'你一個人：', o:[
    O(['l_hai'], '是。', 'ok', '他已經猜到了，回「はい」就好。', 'n3'),
    O(['iz_hitori_desu'], '一個人。', 'ok', '也很清楚。', 'n3')]},
  {id:'n3', t:'hear', c:['iz_counter_ii'], zh:'坐吧台可以嗎？', q:[Q('店員在問什麼？', ['坐吧台可以嗎', '要等位嗎', '要禁菸席嗎'], 'iz_counter_ii')], learn:['問坐吧台可以嗎'], todo:'回答可以', next:'n4'},
  {id:'n4', t:'act', q:'吧台可以：', o:[
    O(['iz_hai_daijoubu'], '好，沒問題。', 'ok', '「はい、大丈夫です」＝可以。', 'n5'),
    O(['l_daijoubu'], '大丈夫です。', 'ok', '這裡是在確認安排可不可以，通常表示「可以、沒問題」。想更清楚可以完整回答「はい、大丈夫です」。', 'n5')]},
  {id:'n5', t:'hear', c:['iz_kimattara'], zh:'飲料決定好了就請說。', q:[Q('店員的意思？', ['飲料決定好就可以點', '飲料要先付錢', '飲料在外面拿'], 'iz_kimattara')], learn:['可以點飲料了'], todo:'點生啤', next:'n6'},
  {id:'n6', t:'act', q:'點一杯生啤：', o:[
    O(['iz_nama_hitotsu'], '生啤一杯。', 'ok', '東西＋數量，最短又自然。', 'n7'),
    O(['iz_toriaezu'], '先來杯生啤。', 'ok', '也很自然。', 'n7')]},
  {id:'n7', t:'end', res:'ok', text:'坐上吧台，生啤來了。'}]);

K('iz_chuu_dai', '{中|ちゅう}と{大|だい}がございますが。', 'chū to dai ga gozaimasu ga', '有中杯和大杯……', 'q', '句尾「が」沒說完＝在等你選。');
K('iz_chuu_de', '{中|ちゅう}で。', 'chū de', '中杯', 'ask');
K('iz_otooshi', 'こちら、お{通|とお}しです。', 'kochira, otōshi desu', '這是小菜（店家先上的，通常會收費）', 'concl', 'お通し：入座後自動上的小菜，通常幾百日圓算在帳單裡。是居酒屋的習慣，不是送錯。');
K('iz_tanondenai', '{頼|たの}んでないです。', 'tanonde nai desu', '我沒點這個', 'neg');
V('izakaya', 2, 'iz2a', {who:'店員', note:'大小、お通し', setup:'你已經坐在吧台。'}, [
  {id:'n1', t:'say', intent:'點一杯生啤酒', c:['iz_nama_kudasai'], zh:'生啤酒一杯。', next:'n2'},
  {id:'n2', t:'hear', c:['iz_chuu_dai'], zh:'有中杯和大杯……', q:[Q('店員在問什麼？', ['要中杯還是大杯', '要瓶裝還是生的', '要冰的還是常溫'], 'iz_chuu_dai')], learn:['有中杯和大杯'], todo:'選大小', next:'n3'},
  {id:'n3', t:'act', q:'你要中杯：', o:[
    O(['iz_chuu_de'], '中杯。', 'ok', '選項＋で，就是你的選擇。', 'n4'),
    O(['l_hai'], '是。', 'part', '店員問的是「哪一個」，「はい」沒有選。說「中で」。', null),
    O(null, '用手比一個中等的高度', 'ok', '手勢也能溝通，店員會再確認「中ですね」。', 'n4', {do:'用手比大小'})]},
  {id:'n4', t:'hear', c:['iz_otooshi'], zh:'這是小菜。', q:[Q('這盤小菜是？', ['店家先上的小菜，通常會收費', '送錯了', '免費招待'], 'iz_otooshi')], learn:['お通し：自動上的小菜，會算錢'], todo:'收下', next:'n5'},
  {id:'n5', t:'act', q:'你沒點這盤菜。怎麼辦？', o:[
    O(['arigatou'], '謝謝。', 'ok', 'お通し是習慣，收下就好。', 'n6'),
    O(['iz_tanondenai'], '我沒點這個。', 'part', '店員會解釋這是お通し。通常不能退，是座位費的一種。', 'n6')]},
  {id:'n6', t:'end', res:'ok', text:'中杯生啤和小菜都上了。你也知道小菜會算在帳單裡。'}]);

K('iz_osusume_q', 'おすすめは{何|なん}ですか。', 'osusume wa nan desu ka', '推薦什麼？', 'ask', '看不懂菜單時最好用的一句。');
K('iz_kyou_wa', '{今日|きょう}は、', 'kyō wa', '今天', 'time');
K('iz_sashimi_hokke', 'お{刺身|さしみ}の{盛|も}り{合|あ}わせと、ほっけがおすすめです。', 'osashimi no moriawase to, hokke ga osusume desu', '推薦生魚片拼盤和花魚', 'concl', 'ほっけ：北海道很常見的烤花魚。');
K('iz_hokke_hitotsu', 'じゃあ、ほっけをひとつ。', 'jā, hokke o hitotsu', '那，花魚一份', 'ask');
K('iz_jikan_kakaru', '{少|すこ}しお{時間|じかん}いただきますが、よろしいですか。', 'sukoshi ojikan itadakimasu ga, yoroshii desu ka', '需要等一下，可以嗎？', 'time');
K('iz_sukoshi_matsu', '{少|すこ}し{待|ま}ちますけど、いいですか。', 'sukoshi machimasu kedo, ii desu ka', '要等一下，可以嗎？', 'time');
V('izakaya', 2, 'iz2t', {who:'店員', tr:true, note:'換說法：問推薦、要等', setup:'札幌的居酒屋。菜單全是手寫日文，你看不懂。'}, [
  {id:'n1', t:'say', intent:'問：推薦什麼？', c:['sumimasen', 'iz_osusume_q'], zh:'不好意思，推薦什麼？', next:'n2'},
  {id:'n2', t:'hear', c:['iz_kyou_wa', 'iz_sashimi_hokke'], zh:'今天推薦生魚片拼盤和花魚。', q:[Q('推薦哪兩樣？', ['生魚片拼盤和花魚', '炸雞和毛豆', '拉麵和餃子'], 'iz_sashimi_hokke')], learn:['推薦生魚片拼盤、花魚'], todo:'點一樣', next:'n3'},
  {id:'n3', t:'act', q:'你想吃花魚：', o:[
    O(['iz_hokke_hitotsu'], '那，花魚一份。', 'ok', '菜名＋をひとつ。', 'n4'),
    O(null, '指著店員剛剛說的方向／黑板', 'part', '可以，但店員說了兩樣，你指的可能不清楚。說出「ほっけ」最準。', null, {do:'用手指'})]},
  {id:'n4', t:'hear', c:['iz_jikan_kakaru'], zh:'需要等一下，可以嗎？', easy:{c:['iz_sukoshi_matsu'], zh:'要等一下，可以嗎？'},
    q:[Q('店員在說什麼？', ['要等一下，問你可不可以', '賣完了', '份量很大'], 'iz_jikan_kakaru', 'iz_sukoshi_matsu')], learn:['花魚要等一下'], todo:'回答可以', next:'n5'},
  {id:'n5', t:'act', q:'可以等：', o:[
    O(['iz_hai_daijoubu'], '好，沒問題。', 'ok', '「はい、大丈夫です」＝可以。', 'n6'),
    O(['l_daijoubu'], '大丈夫です。', 'ok', '這裡是在確認安排，通常表示「可以」。如果意思不明，可具體重說可接受的安排，而不是只靠加「はい」。', 'n6')]},
  {id:'n6', t:'end', res:'ok', text:'等了一下，烤花魚上桌。你沒看懂菜單也點到了。'}]);

K('iz_lo', 'そろそろラストオーダーのお{時間|じかん}ですが、', 'sorosoro rasuto ōdā no ojikan desu ga,', '差不多到最後點餐的時間了', 'time', 'ラストオーダー＝最後點餐。之後不能再點，但還可以坐一下。');
K('iz_gochuumon', 'ご{注文|ちゅうもん}よろしいですか。', 'gochūmon yoroshii desu ka', '還要點什麼嗎？', 'q');
K('iz_lo_short', 'ラストオーダーです。', 'rasuto ōdā desu', '最後點餐了', 'time');
K('iz_nanika', '{何|なに}か{頼|たの}みますか。', 'nanika tanomimasu ka', '還要點嗎？', 'q');
K('iz_okaikei', 'お{会計|かいけい}お{願|ねが}いします。', 'okaikei onegai shimasu', '麻煩結帳', 'ask');
K('iz_denpyou', 'こちらの{伝票|でんぴょう}を{持|も}って、', 'kochira no denpyō o motte,', '拿著這張帳單', 'next');
K('iz_reji_de', 'レジでお{願|ねが}いします。', 'reji de onegai shimasu', '請到收銀台', 'place');
V('izakaya', 3, 'iz3a', {who:'店員', note:'最後點餐、到收銀台結帳', setup:'你吃得差不多了，店員走過來。'}, [
  {id:'n1', t:'hear', c:['iz_lo', 'iz_gochuumon'], zh:'差不多到最後點餐時間了，還要點什麼嗎？',
    easy:{c:['iz_lo_short', 'iz_nanika'], zh:'最後點餐了。還要點嗎？'},
    q:[Q('店員為什麼過來？', ['最後點餐時間到了', '要關門請你離開', '要換座位'], 'iz_lo', 'iz_lo_short'), Q('他問你什麼？', ['還要不要點', '要不要結帳', '好不好吃'], 'iz_gochuumon', 'iz_nanika')],
    learn:['最後點餐了'], todo:'決定還要不要點', next:'n2'},
  {id:'n2', t:'act', q:'你不要再點了，想結帳：', o:[
    O(['iz_okaikei'], '麻煩結帳。', 'ok', '不點了就直接說結帳。', 'n3'),
    O(['l_daijoubu'], '不用了。', 'ok', '不再點了。之後要結帳時再說「お会計お願いします」。', 'n2b'),
    O(['iz_toriaezu'], '先來杯生啤。', 'part', '可以再點一杯，但你想結帳。', null)]},
  {id:'n2b', t:'act', q:'過了一會兒，你想結帳：', o:[
    O(['sumimasen', 'iz_okaikei'], '不好意思，麻煩結帳。', 'ok', '舉手＋「すみません」叫店員，再說結帳。', 'n3')]},
  {id:'n3', t:'hear', c:['iz_denpyou', 'iz_reji_de'], zh:'請拿著這張帳單到收銀台。', point:'店員把夾著帳單的板子放在你面前，指向門口。',
    q:[Q('在哪裡付錢？', ['收銀台', '座位上', '門口外面'], 'iz_reji_de'), Q('要帶什麼過去？', ['帳單', '杯子', '號碼牌'], 'iz_denpyou')],
    learn:['拿帳單到收銀台付錢'], todo:'到收銀台', next:'n4'},
  {id:'n4', t:'act', q:'你要怎麼做？', o:[
    O(null, '拿著帳單走去收銀台', 'ok', '日本很多店是在收銀台付，不在座位付。', 'n5', {do:'拿帳單去收銀台'}),
    O(null, '把錢放在桌上就離開', 'bad', '在日本不會這樣付，也不用給小費。店員會追出來。', 'n4x', {do:'把錢放桌上'})]},
  {id:'n4x', t:'hear', c:['sumimasen', 'iz_reji_de'], zh:'不好意思，請到收銀台。', who:'店員（追過來）', q:[], next:'n4'},
  {id:'n5', t:'end', res:'ok', text:'你在收銀台付好錢，說了聲謝謝離開。'}]);

K('iz_okaikei_3200', 'お{会計|かいけい}、3200{円|えん}です。', 'okaikei, sanzen-nihyaku en desu', '總共 3200 日圓', 'num');
K('iz_card_ii', 'カード、{使|つか}えますか。', 'kādo, tsukaemasu ka', '可以用卡嗎？', 'ask');
K('iz_genkin_nomi', 'すみません、うち、{現金|げんきん}のみなんですよ。', 'sumimasen, uchi, genkin nomi nan desu yo', '不好意思，我們只收現金', 'neg', 'のみ＝只有。うち＝我們店。小店、老店常只收現金。');
K('iz_genkin_dake', '{現金|げんきん}だけです。', 'genkin dake desu', '只有現金', 'neg');
K('iz_jaa_genkin', 'じゃあ、{現金|げんきん}で。', 'jā, genkin de', '那用現金', 'ask');
V('izakaya', 3, 'iz3t', {who:'店員', tr:true, note:'換說法：只收現金', setup:'你在收銀台準備付錢。'}, [
  {id:'n1', t:'say', intent:'說：麻煩結帳', c:['iz_okaikei'], zh:'麻煩結帳。', next:'n2'},
  {id:'n2', t:'hear', c:['iz_okaikei_3200'], zh:'總共 3200 日圓。', q:[Q('多少錢？', ['3200 日圓', '2300 日圓', '3000 日圓'], 'iz_okaikei_3200')], learn:['3200 日圓'], todo:'付錢', next:'n3'},
  {id:'n3', t:'act', q:'你想刷卡：', o:[
    O(['iz_card_ii'], '可以用卡嗎？', 'ok', '先問可不可以刷卡。', 'n4'),
    O(null, '直接把卡放在托盤上', 'ok', '店員會直接告訴你能不能用。', 'n4', {do:'把卡放在托盤上'})]},
  {id:'n4', t:'hear', c:['iz_genkin_nomi'], zh:'不好意思，我們只收現金。', easy:{c:['iz_genkin_dake'], zh:'只有現金。'},
    q:[Q('可以刷卡嗎？', ['不行，只收現金', '可以', '刷卡要加錢'], 'iz_genkin_nomi', 'iz_genkin_dake')], learn:['只收現金'], todo:'改付現金', next:'n5'},
  {id:'n5', t:'act', q:'你身上有現金：', o:[
    O(['iz_jaa_genkin'], '那用現金。', 'ok', '改用現金就好。', 'n6'),
    O(['iz_card_ii'], '可以用卡嗎？', 'bad', '他剛剛說「現金のみ」，就是不能刷卡。', null)]},
  {id:'n6', t:'end', res:'ok', text:'你用現金付好了。之後去小店會多帶一點現金。'}]);

/* ============================================================
   生活三：麵店（食券機・蕎麥麵・札幌拉麵／湯咖哩）
   使用者實際卡住的地方：蕎麥麵店的菜單全是日文看不懂。
   策略：問「おすすめは？」；認得幾個菜單關鍵字（かけ＝熱湯、もり／ざる＝冷沾、大盛り、普通）。
   ============================================================ */
T({id:'menu', group:LIFE, levels:3, name:'麵店・看不懂菜單', place:'東京蕎麥麵店／札幌拉麵、湯咖哩店', dest:'點到想吃的麵', dk:'目標', todo0:'聽店員說明',
  setup:'你走進一家小麵店。門口有售票機（食券機），按鈕上全是日文。',
  sim:'模擬情境：食券、冷熱蕎麥、大碗、辣度、免費白飯、自助取水、還碗是常見做法；按鈕位置、辣度號碼、金額各店不同。',
  axis:{1:'食券機＋問推薦', 2:'多一個選擇：冷熱、大小、辣度', 3:'店員一口氣說完客製選項與店規'}});
K('mn_shokken_saki', '{先|さき}に{食券|しょっけん}をお{願|ねが}いします。', 'saki ni shokken o onegai shimasu', '請先買餐券', 'next', '食券＝門口售票機買的餐券，買好交給店員。');
K('mn_osusume_dore', 'おすすめはどれですか。', 'osusume wa dore desu ka', '推薦哪一個？', 'ask', '看不懂售票機時，指著機器問這句。');
K('mn_hidariue', '{一番|いちばん}{左上|ひだりうえ}のボタンが、', 'ichiban hidari-ue no botan ga', '最左上的按鈕', 'place', '售票機常把招牌放在左上。');
K('mn_ninki', '{一番|いちばん}{人気|にんき}ですよ。', 'ichiban ninki desu yo', '最受歡迎', 'concl');
V('menu', 1, 'mn1a', {who:'店員', note:'食券機、問推薦'}, [
  {id:'n1', t:'hear', c:['l_irasshai', 'mn_shokken_saki'], zh:'歡迎光臨。請先買餐券。', point:'店員指了指門口的售票機。',
    q:[Q('店員要你先做什麼？', ['先買餐券', '先坐下', '先付現金給他'], 'mn_shokken_saki')], learn:['先在售票機買餐券'], todo:'去售票機', next:'n2'},
  {id:'n2', t:'act', q:'機器上全是日文，你看不懂。怎麼辦？', o:[
    O(['sumimasen', 'mn_osusume_dore'], '不好意思，推薦哪一個？', 'ok', '指著機器問，店員會走過來指給你。', 'n3'),
    O(null, '用翻譯 App 拍機器', 'ok', '也可以，翻譯 App 在這裡很有用。不過問一句更快，也能吃到招牌。', 'n2t', {do:'用翻譯 App 拍機器'}),
    O(null, '隨便按一個', 'part', '可能買到冷麵或不想吃的。問一句比較保險。', null, {do:'隨便按一個按鈕'})]},
  {id:'n2t', t:'end', res:'ok', text:'翻譯出來有「かけそば」「ざるそば」，你選了一個。下次可以直接問店員推薦。'},
  {id:'n3', t:'hear', c:['mn_hidariue', 'mn_ninki'], zh:'最左上的按鈕最受歡迎喔。', point:'店員指著售票機最上面一排的左邊。',
    q:[Q('推薦哪個按鈕？', ['最左上', '最右下', '中間那排'], 'mn_hidariue')], learn:['左上是招牌'], todo:'按左上的按鈕', next:'n4'},
  {id:'n4', t:'act', q:'你要怎麼做？', o:[
    O(null, '按左上的按鈕，把餐券交給店員', 'ok', '買好餐券交給店員或放在櫃台上。', 'n5', {do:'買左上的餐券，交給店員'}),
    O(null, '按右下的按鈕', 'bad', '店員說的是「左上」。右下常是加點或飲料。', 'n4x', {do:'按右下的按鈕'})]},
  {id:'n4x', t:'hear', c:['mn_hidariue', 'mn_ninki'], zh:'最左上的按鈕最受歡迎喔。', who:'店員（再指一次）', q:[], next:'n4'},
  {id:'n5', t:'end', res:'ok', text:'招牌麵端上來了。你沒看懂按鈕也點到了。'}]);

K('mn_katte_ne', '{食券|しょっけん}、{先|さき}に{買|か}ってくださいね。', 'shokken, saki ni katte kudasai ne', '餐券請先買喔', 'next');
K('mn_ninki_dore', '{人気|にんき}はどれですか。', 'ninki wa dore desu ka', '最受歡迎的是哪個？', 'ask');
K('mn_kore_miso', 'これです、この{味噌|みそ}ラーメン。', 'kore desu, kono miso rāmen', '這個，這個味噌拉麵', 'concl', '札幌拉麵常見三種：味噌、醤油（しょうゆ）、塩（しお）。');
V('menu', 1, 'mn1t', {who:'店員', tr:true, note:'換說法：買ってくださいね／人気は', setup:'札幌的拉麵店。門口有售票機。'}, [
  {id:'n1', t:'hear', c:['mn_katte_ne'], zh:'餐券請先買喔。', q:[Q('店員要你做什麼？', ['先買餐券', '先排隊', '先選座位'], 'mn_katte_ne')], learn:['先買餐券'], todo:'去售票機', next:'n2'},
  {id:'n2', t:'act', q:'看不懂按鈕：', o:[
    O(['sumimasen', 'mn_ninki_dore'], '不好意思，最受歡迎的是哪個？', 'ok', '問「人気」也一樣好用。', 'n3'),
    O(['sumimasen', 'mn_osusume_dore'], '不好意思，推薦哪一個？', 'ok', '問推薦也行。', 'n3')]},
  {id:'n3', t:'hear', c:['mn_kore_miso'], zh:'這個，這個味噌拉麵。', point:'店員直接按住機器上的一個按鈕給你看。',
    q:[Q('推薦什麼？', ['味噌拉麵', '醬油拉麵', '鹽味拉麵'], 'mn_kore_miso')], learn:['人氣是味噌拉麵'], todo:'買味噌拉麵', next:'n4'},
  {id:'n4', t:'act', q:'你要怎麼做？', o:[
    O(null, '按那個按鈕，買餐券', 'ok', '照著買就好。', 'n5', {do:'買味噌拉麵的餐券'})]},
  {id:'n5', t:'end', res:'ok', text:'熱騰騰的札幌味噌拉麵來了。'}]);

K('mn_atatakai_dore', '{温|あたた}かいおそばはどれですか。', 'atatakai osoba wa dore desu ka', '熱的蕎麥麵是哪個？', 'ask');
K('mn_kake_ten', '{温|あたた}かいのは、かけそばか、{天|てん}ぷらそばですね。', 'atatakai no wa, kake soba ka, tenpura soba desu ne', '熱的是清湯蕎麥麵或天婦羅蕎麥麵', 'concl', 'かけ＝熱湯麵；もり／ざる＝冷的沾麵。看菜單時先找這幾個字。');
K('mn_ten_onegai', '{天|てん}ぷらそば、お{願|ねが}いします。', 'tenpura soba, onegai shimasu', '天婦羅蕎麥麵，麻煩你', 'ask');
K('mn_zaru_onegai', 'ざるそば、お{願|ねが}いします。', 'zaru soba, onegai shimasu', '竹篩蕎麥麵，麻煩你', 'ask');
K('mn_zaru_tsumetai', 'ざるは{冷|つめ}たいおそばですけど、{大丈夫|だいじょうぶ}ですか。', 'zaru wa tsumetai osoba desu kedo, daijōbu desu ka', '竹篩蕎麥是冷的喔，可以嗎？', 'concl');
K('mn_atatakai_ni', 'あ、{温|あたた}かいのにします。', 'a, atatakai no ni shimasu', '啊，我改要熱的', 'ask', '〜にします＝我決定要〜。');
K('mn_oomori', '{大盛|おおも}りにもできますが、', 'ōmori ni mo dekimasu ga,', '也可以加大……', 'q', '大盛り＝大碗。有些店免費，有些加錢。');
K('mn_dou_shimasu', 'どうしますか。', 'dō shimasu ka', '要怎麼樣？', 'q');
K('mn_futsuu_de', '{普通|ふつう}で。', 'futsū de', '一般的就好', 'ask', '不知道怎麼選時，「普通で」幾乎都能用。');
K('mn_oomori_de', '{大盛|おおも}りで。', 'ōmori de', '大碗', 'ask');
V('menu', 2, 'mn2a', {who:'店員', note:'冷熱、大小', setup:'東京一家老蕎麥麵店，菜單是直寫的日文。天氣很冷，你想吃熱的。'}, [
  {id:'n1', t:'say', intent:'問：熱的蕎麥麵是哪個？', c:['sumimasen', 'mn_atatakai_dore'], zh:'不好意思，熱的蕎麥麵是哪個？', next:'n2'},
  {id:'n2', t:'hear', c:['mn_kake_ten'], zh:'熱的是清湯蕎麥麵或天婦羅蕎麥麵。', q:[Q('熱的有哪些？', ['清湯（かけ）或天婦羅蕎麥', '竹篩（ざる）或盛（もり）', '只有一種'], 'mn_kake_ten')], learn:['熱的：かけ、天ぷら'], todo:'選一個', next:'n3'},
  {id:'n3', t:'act', q:'你要點：', o:[
    O(['mn_ten_onegai'], '天婦羅蕎麥麵，麻煩你。', 'ok', '店員說的熱麵之一。', 'n4'),
    O(['mn_zaru_onegai'], '竹篩蕎麥麵，麻煩你。', 'bad', '「ざる」是冷的沾麵，不是熱的。', 'n3x')]},
  {id:'n3x', t:'hear', c:['mn_zaru_tsumetai'], zh:'竹篩蕎麥是冷的喔，可以嗎？', q:[Q('店員提醒你什麼？', ['ざる是冷的', 'ざる賣完了', 'ざる要等很久'], 'mn_zaru_tsumetai')], learn:['ざる＝冷的'], todo:'改點熱的', next:'n3b'},
  {id:'n3b', t:'act', q:'你想吃熱的：', o:[
    O(['mn_atatakai_ni'], '啊，我改要熱的。', 'ok', '改點就好，店員很習慣。', 'n2'),
    O(['l_hai'], '好。', 'part', '這樣會送來冷麵。', null)]},
  {id:'n4', t:'hear', c:['mn_oomori', 'mn_dou_shimasu'], zh:'也可以加大，要怎麼樣？', q:[Q('店員在問什麼？', ['要不要大碗', '要不要加蛋', '要冷的還是熱的'], 'mn_oomori')], learn:['可以選大碗'], todo:'選大小', next:'n5'},
  {id:'n5', t:'act', q:'一般份量就好：', o:[
    O(['mn_futsuu_de'], '一般的就好。', 'ok', '「普通で」＝一般份量。', 'n6'),
    O(['mn_oomori_de'], '大碗。', 'ok', '很餓的話也可以。', 'n6'),
    O(['l_hai'], '好。', 'part', '「はい」可能被當成「要大碗」。說「普通で」最清楚。', null)]},
  {id:'n6', t:'end', res:'ok', text:'熱的天婦羅蕎麥麵上桌。你記住了：かけ是熱的、ざる是冷的。'}]);

K('mn_karasa', '{辛|から}さは{何番|なんばん}にしますか。', 'karasa wa nanban ni shimasu ka', '辣度要幾號？', 'q');
K('mn_zero_juu', '0{番|ばん}から10{番|ばん}まであります。', 'zero-ban kara jū-ban made arimasu', '從 0 號到 10 號', 'num');
K('mn_karakunai', '{辛|から}くないのは{何番|なんばん}ですか。', 'karakunai no wa nanban desu ka', '不辣的是幾號？', 'ask');
K('mn_zero_ban', '0{番|ばん}が{辛|から}くないです。', 'zero-ban ga karakunai desu', '0 號不辣', 'num');
K('mn_sanban_pirikara', '3{番|ばん}くらいが、ちょうどいいピリ{辛|から}ですね。', 'san-ban kurai ga, chōdo ii pirikara desu ne', '3 號左右是剛好的小辣', 'num', 'ピリ辛＝微辣。');
K('mn_sanban_de', '3{番|ばん}で。', 'san-ban de', '3 號', 'ask');
K('mn_rice', 'ライスの{量|りょう}はどうしますか。', 'raisu no ryō wa dō shimasu ka', '飯量要多少？', 'q');
K('mn_sukuname_de', '{少|すく}なめで。', 'sukuname de', '少一點', 'ask', '少なめ＝少一點；多め（おおめ）＝多一點。');
V('menu', 2, 'mn2t', {who:'店員', tr:true, note:'換說法：湯咖哩的辣度、飯量', setup:'札幌的湯咖哩店，你已經點了雞腿湯咖哩。'}, [
  {id:'n1', t:'hear', c:['mn_karasa', 'mn_zero_juu'], zh:'辣度要幾號？從 0 號到 10 號。', q:[Q('店員在問什麼？', ['辣度', '飯量', '湯的種類'], 'mn_karasa'), Q('號碼範圍？', ['0 到 10', '1 到 5', '0 到 100'], 'mn_zero_juu')], learn:['辣度 0～10 號'], todo:'選辣度', next:'n2'},
  {id:'n2', t:'act', q:'你不太敢吃辣：', o:[
    O(['mn_karakunai'], '不辣的是幾號？', 'ok', '不知道號碼代表多辣，就先問。', 'n3'),
    O(['mn_futsuu_de'], '一般的就好。', 'part', '有些店有「普通」，但這家是用號碼。可以問「辛くないのは何番ですか」。', 'n3'),
    O(['l_onegai'], '麻煩你。', 'part', '店員要的是一個號碼。', null)]},
  {id:'n3', t:'hear', c:['mn_zero_ban', 'mn_sanban_pirikara'], zh:'0 號不辣。3 號左右是剛好的小辣。', q:[Q('不辣的是幾號？', ['0 號', '3 號', '10 號'], 'mn_zero_ban'), Q('小辣大約幾號？', ['3 號', '0 號', '8 號'], 'mn_sanban_pirikara')], learn:['0 號不辣、3 號小辣'], todo:'選號碼', next:'n4'},
  {id:'n4', t:'act', q:'你選小辣：', o:[
    O(['mn_sanban_de'], '3 號。', 'ok', '號碼＋で。', 'n5')]},
  {id:'n5', t:'hear', c:['mn_rice'], zh:'飯量要多少？', q:[Q('店員在問什麼？', ['飯要多少', '要不要加辣', '要不要飲料'], 'mn_rice')], learn:['可以選飯量'], todo:'選飯量', next:'n6'},
  {id:'n6', t:'act', q:'你想少一點飯：', o:[
    O(['mn_sukuname_de'], '少一點。', 'ok', '「少なめで」＝少一點。', 'n7'),
    O(['mn_futsuu_de'], '一般的就好。', 'ok', '一般份量也可以。', 'n7')]},
  {id:'n7', t:'end', res:'ok', text:'3 號辣的湯咖哩上桌，辣得剛好。'}]);

K('mn_okonomi', 'お{好|この}みはございますか。', 'okonomi wa gozaimasu ka', '有什麼偏好嗎？', 'q', '家系拉麵常問：麵的硬度、味道濃淡、油量。');
K('mn_men_aji_abura', '{麺|めん}の{硬|かた}さ、{味|あじ}の{濃|こ}さ、{油|あぶら}の{量|りょう}、お{選|えら}びいただけます。', 'men no katasa, aji no kosa, abura no ryō, oerabi itadakemasu', '麵的硬度、味道濃淡、油量都可以選', 'q');
K('mn_men_aji_easy', '{麺|めん}、{味|あじ}、{油|あぶら}、どうしますか。', 'men, aji, abura, dō shimasu ka', '麵、味道、油，要怎樣？', 'q');
K('mn_zenbu_futsuu', '{全部|ぜんぶ}{普通|ふつう}で。', 'zenbu futsū de', '全部一般', 'ask', '關鍵字策略：選項太多或沒聽懂，「全部普通で」就搞定。');
K('mn_katame', '{麺|めん}かためで、あとは{普通|ふつう}で。', 'men katame de, ato wa futsū de', '麵硬一點，其他一般', 'ask', 'かため＝硬一點；やわらかめ＝軟一點。');
K('mn_rice_muryou', 'ライス、{無料|むりょう}でおつけできますけど、', 'raisu, muryō de otsuke dekimasu kedo,', '白飯可以免費附……', 'num', '無料（むりょう）＝免費。');
K('mn_dou_saremasu', 'どうされますか。', 'dō saremasu ka', '要怎麼樣？', 'q');
V('menu', 3, 'mn3a', {who:'店員', note:'拉麵客製：全部普通で', setup:'東京的家系拉麵店。你把餐券交給店員。'}, [
  {id:'n1', t:'say', intent:'把餐券交給店員：麻煩你', c:['l_onegai'], zh:'麻煩你。', next:'n2'},
  {id:'n2', t:'hear', c:['mn_okonomi', 'mn_men_aji_abura'], zh:'有什麼偏好嗎？麵的硬度、味道濃淡、油量都可以選。',
    easy:{c:['mn_men_aji_easy'], zh:'麵、味道、油，要怎樣？'},
    q:[Q('可以選哪些？', ['麵的硬度、味道濃淡、油量', '辣度、飯量、湯量', '冷熱、大小、配料'], 'mn_men_aji_abura', 'mn_men_aji_easy')],
    learn:['可以選麵、味道、油'], todo:'回答偏好', next:'n3'},
  {id:'n3', t:'act', q:'你沒有特別偏好：', o:[
    O(['mn_zenbu_futsuu'], '全部一般。', 'ok', '最強的一句：選項聽不懂也能用。', 'n4'),
    O(['mn_katame'], '麵硬一點，其他一般。', 'ok', '有偏好就說一個，其他「普通」。', 'n4'),
    O(['l_hai'], '是。', 'part', '他問的是「要怎麼選」，「はい」沒有回答。說「全部普通で」。', null)]},
  {id:'n4', t:'hear', c:['mn_rice_muryou', 'mn_dou_saremasu'], zh:'白飯可以免費附，要嗎？', q:[Q('白飯怎樣？', ['免費，問你要不要', '要另外付錢', '賣完了'], 'mn_rice_muryou')], learn:['白飯免費'], todo:'回答要不要', next:'n5'},
  {id:'n5', t:'act', q:'你想要白飯：', o:[
    O(['l_onegai'], '麻煩你。', 'ok', '「お願いします」＝要。', 'n6'),
    O(['l_daijoubu'], '不用了。', 'part', '這樣就沒有白飯了。', null)]},
  {id:'n6', t:'end', res:'ok', text:'拉麵和免費白飯都來了。「全部普通で」很好用。'}]);

K('mn_ten_desune', 'はい、{天|てん}ぷらそばですね。', 'hai, tenpura soba desu ne', '好，天婦羅蕎麥麵', 'concl');
K('mn_omizu_self', 'お{水|みず}はセルフサービスなので、あちらからどうぞ。', 'omizu wa serufu sābisu na node, achira kara dōzo', '水是自助的，請從那邊拿', 'place');
K('mn_mizu_acchi', 'お{水|みず}は、あっちです。', 'omizu wa, acchi desu', '水在那邊', 'place');
K('mn_utsuwa', 'お{食事|しょくじ}が{終|お}わりましたら、{器|うつわ}はこちらの{返却口|へんきゃくぐち}にお{願|ねが}いします。', 'oshokuji ga owarimashitara, utsuwa wa kochira no henkyakuguchi ni onegai shimasu', '吃完後，碗請放到這邊的回收口', 'next', '返却口＝回收口。立食蕎麥麵、食堂常見。');
K('mn_tabetara', '{食|た}べたら、ここに{返|かえ}してください。', 'tabetara, koko ni kaeshite kudasai', '吃完請還到這裡', 'next');
K('mn_gochisou', 'ごちそうさまでした。', 'gochisōsama deshita', '我吃飽了，謝謝招待', 'polite', '離開時對店員說，很自然。');
V('menu', 3, 'mn3t', {who:'店員', tr:true, note:'換說法：店規（自助取水、還碗）', setup:'車站旁的立食蕎麥麵店。你把餐券交給店員。'}, [
  {id:'n1', t:'say', intent:'把餐券交給店員：麻煩你', c:['l_onegai'], zh:'麻煩你。', next:'n2'},
  {id:'n2', t:'hear', c:['mn_ten_desune', 'mn_omizu_self'], zh:'好，天婦羅蕎麥麵。水是自助的，請從那邊拿。', easy:{c:['mn_mizu_acchi'], zh:'水在那邊。'},
    point:'店員往牆邊的飲水機抬了抬下巴。',
    q:[Q('水怎麼拿？', ['自己去那邊拿', '店員會送來', '要另外買'], 'mn_omizu_self', 'mn_mizu_acchi')], learn:['水自己去拿'], todo:'去拿水', next:'n3'},
  {id:'n3', t:'act', q:'你想喝水：', o:[
    O(null, '自己走去飲水機倒水', 'ok', 'セルフ＝自助。', 'n4', {do:'自己去倒水'}),
    O(['sumimasen', 'l_onegai'], '不好意思，麻煩你（要水）。', 'part', '店員剛剛說水是自助的，會再指一次給你看。', null)]},
  {id:'n4', t:'hear', c:['mn_utsuwa'], zh:'吃完後，碗請放到這邊的回收口。', easy:{c:['mn_tabetara'], zh:'吃完請還到這裡。'},
    q:[Q('吃完碗要怎麼辦？', ['放到回收口', '留在桌上', '拿去水槽洗'], 'mn_utsuwa', 'mn_tabetara')], learn:['吃完把碗放回收口'], todo:'吃完還碗', next:'n5'},
  {id:'n5', t:'act', q:'吃完了：', o:[
    O(['mn_gochisou'], '我吃飽了，謝謝。（把碗放到回收口）', 'ok', '還碗＋「ごちそうさまでした」，很到位。', 'n6', {do:'把碗放到回收口'}),
    O(null, '把碗留在桌上離開', 'part', '這家店要自己還碗，店員會叫住你。', null, {do:'把碗留在桌上'})]},
  {id:'n6', t:'end', res:'ok', text:'你自己倒水、吃完還碗，像在地人一樣。'}]);

/* ============================================================
   生活四：車內與車站廣播
   真實路線：函館本線（札幌—小樽）、JR 中央線、東京Metro丸之內線（東京—新宿可到）。
   月台號碼、誤點時間、停駛原因、座椅轉向的時機都是模擬。
   使用者經驗：車內廣播請乘客把座椅轉向（列車在某站改變行進方向）。
   ============================================================ */
T({id:'annc', group:LIFE, levels:3, name:'車內・車站廣播', place:'東京／札幌・電車上與月台', dest:'聽懂廣播，做對下一步', dk:'目標', todo0:'聽廣播',
  setup:'你在電車上或月台上，廣播響起。',
  sim:'模擬情境：函館本線札幌—小樽、中央線、丸之內線東京—新宿是真實路線；月台號碼、誤點、停駛、座椅轉向的時機是練習用。',
  axis:{1:'到站廣播：站名＋哪側開門', 2:'誤點、進站、轉座椅', 3:'停駛：抓重點、問替代方式'}});
K('an_tsugi_sapporo', '{次|つぎ}は、{札幌|さっぽろ}、{札幌|さっぽろ}です。', 'tsugi wa, Sapporo, Sapporo desu', '下一站是札幌', 'place');
K('an_deguchi_migi', 'お{出口|でぐち}は{右側|みぎがわ}です。', 'odeguchi wa migigawa desu', '出口在右側', 'dir', '右側＝面向列車前進方向的右邊。');
K('an_migi_hiraki', '{右側|みぎがわ}のドアが{開|ひら}きます。', 'migigawa no doa ga hirakimasu', '右側的門會打開', 'dir');
K('an_sapporo_desuka', '{札幌|さっぽろ}ですか。', 'Sapporo desu ka', '是札幌嗎？', 'ask');
K('an_ee_tsugi', 'ええ、{次|つぎ}ですよ。', 'ee, tsugi desu yo', '對，下一站', 'place');
V('annc', 1, 'an1a', {who:'車內廣播', note:'下一站、右側開門', setup:'你在往札幌的電車上，要在札幌下車。'}, [
  {id:'n1', t:'hear', bc:true, c:['an_tsugi_sapporo', 'an_deguchi_migi'], zh:'下一站是札幌。出口在右側。',
    q:[Q('下一站是？', ['札幌', '小樽', '千歲'], 'an_tsugi_sapporo'), Q('哪一側開門？', ['右側', '左側', '兩側'], 'an_deguchi_migi')], learn:['下一站札幌', '右側開門'], todo:'準備下車', next:'n2'},
  {id:'n2', t:'act', q:'你要在札幌下車：', o:[
    O(null, '走到右邊的門', 'ok', '右側開門，先站到右邊。', 'n3', {do:'走到右邊的門'}),
    O(['sumimasen', 'an_sapporo_desuka'], '不好意思，是札幌嗎？', 'ok', '不確定就問旁邊的人。', 'n2r', {fix:true}),
    O(null, '走到左邊的門', 'bad', '廣播說「右側」。站在左邊，門不會開。', 'n2x', {do:'走到左邊的門'})]},
  {id:'n2r', t:'hear', who:'旁邊的乘客', c:['an_ee_tsugi'], zh:'對，下一站。', q:[], next:'n2'},
  {id:'n2x', t:'hear', bc:true, c:['an_migi_hiraki'], zh:'右側的門會打開。', q:[Q('哪邊的門會開？', ['右側', '左側', '兩側'], 'an_migi_hiraki')], next:'n2'},
  {id:'n3', t:'end', res:'ok', text:'右側的門打開，你順利在札幌下車。'}]);

K('an_mamonaku_shinjuku', 'まもなく、{新宿|しんじゅく}、{新宿|しんじゅく}。', 'mamonaku, Shinjuku, Shinjuku', '即將到達新宿', 'place', 'まもなく＝即將、馬上。');
K('an_deguchi_hidari', 'お{出口|でぐち}は{左側|ひだりがわ}です。', 'odeguchi wa hidarigawa desu', '出口在左側', 'dir');
K('an_wasuremono', 'お{忘|わす}れ{物|もの}のないよう、ご{注意|ちゅうい}ください。', 'owasuremono no nai yō, gochūi kudasai', '請注意不要忘記隨身物品', 'advice');
K('an_hidari_hiraki', '{左側|ひだりがわ}のドアが{開|ひら}きます。', 'hidarigawa no doa ga hirakimasu', '左側的門會打開', 'dir');
V('annc', 1, 'an1t', {who:'車內廣播', tr:true, note:'換說法：まもなく、左側', setup:'你在東京的電車上，要在新宿下車。'}, [
  {id:'n1', t:'hear', bc:true, c:['an_mamonaku_shinjuku', 'an_deguchi_hidari', 'an_wasuremono'], zh:'即將到達新宿。出口在左側。請注意不要忘記隨身物品。',
    q:[Q('即將到哪一站？', ['新宿', '新橋', '品川'], 'an_mamonaku_shinjuku'), Q('哪一側開門？', ['左側', '右側', '兩側'], 'an_deguchi_hidari')], learn:['即將到新宿', '左側開門'], todo:'準備下車', next:'n2'},
  {id:'n2', t:'act', q:'你要在新宿下車：', o:[
    O(null, '拿好東西，走到左邊的門', 'ok', '左側開門；最後一句也提醒你別忘東西。', 'n3', {do:'拿好東西走到左邊的門'}),
    O(null, '走到右邊的門', 'bad', '廣播說「左側」。', 'n2x', {do:'走到右邊的門'})]},
  {id:'n2x', t:'hear', bc:true, c:['an_hidari_hiraki'], zh:'左側的門會打開。', q:[Q('哪邊的門會開？', ['左側', '右側', '兩側'], 'an_hidari_hiraki')], next:'n2'},
  {id:'n3', t:'end', res:'ok', text:'你在新宿從左側下車，東西也都帶了。'}]);

K('an_tadaima', 'ただいま、', 'tadaima,', '目前', 'time', '廣播裡的ただいま＝現在（不是「我回來了」）。');
K('an_10pun_okure', '{電車|でんしゃ}が{約|やく}10{分|ぷん}{遅|おく}れております。', 'densha ga yaku juppun okurete orimasu', '電車大約誤點 10 分鐘', 'time', '遅れ＝晚到（還是會來）。');
K('an_meiwaku', 'ご{迷惑|めいわく}をおかけしております。', 'gomeiwaku o okake shite orimasu', '造成您的不便', 'polite');
K('an_2bansen', '2{番線|ばんせん}に、', 'ni-bansen ni', '2 號月台', 'num');
K('an_otaru_yuki', '{快速|かいそく}、{小樽|おたる}{行|ゆ}きがまいります。', 'kaisoku, Otaru-yuki ga mairimasu', '往小樽的快速車即將進站', 'place', 'まいります＝來（廣播的禮貌說法）。');
K('an_kiiroi', '{黄色|きいろ}い{線|せん}の{内側|うちがわ}までお{下|さ}がりください。', 'kiiroi sen no uchigawa made osagari kudasai', '請退到黃線內側', 'advice');
V('annc', 2, 'an2a', {who:'月台廣播', note:'誤點、進站', setup:'你在札幌站月台，等往小樽的電車。'}, [
  {id:'n1', t:'hear', bc:true, c:['an_tadaima', 'an_10pun_okure', 'an_meiwaku'], zh:'目前電車大約誤點 10 分鐘，造成您的不便。',
    q:[Q('發生什麼事？', ['電車誤點約 10 分鐘', '電車停駛', '電車 10 點發車'], 'an_10pun_okure')], learn:['誤點約 10 分鐘'], todo:'繼續等', next:'n2'},
  {id:'n2', t:'act', q:'你要怎麼做？', o:[
    O(null, '繼續在月台等', 'ok', '只是晚到，等就好。', 'n3', {do:'繼續等'}),
    O(null, '出站改搭計程車', 'part', '只晚 10 分鐘，不用換交通工具。「遅れ」＝晚到，不是不開。', null, {do:'出站搭計程車'})]},
  {id:'n3', t:'hear', bc:true, c:['an_2bansen', 'an_otaru_yuki', 'an_kiiroi'], zh:'往小樽的快速車即將進入 2 號月台。請退到黃線內側。',
    q:[Q('幾號月台？', ['2 號', '3 號', '12 號'], 'an_2bansen'), Q('廣播要你做什麼？', ['退到黃線內側', '往前站', '準備付錢'], 'an_kiiroi')], learn:['2 號月台進站', '退到黃線內'], todo:'退後等車', next:'n4'},
  {id:'n4', t:'act', q:'你在 2 號月台：', o:[
    O(null, '退到黃線後面', 'ok', '照廣播做。', 'n5', {do:'退到黃線後面'}),
    O(null, '走到月台邊緣看車來了沒', 'bad', '廣播剛說要退到黃線內，很危險。', 'n3')]},
  {id:'n5', t:'end', res:'ok', text:'電車晚了 10 分鐘進站，你上車了。'}]);

K('an_oshirase', 'お{知|し}らせいたします。', 'oshirase itashimasu', '通知各位', 'filler');
K('an_houkou', 'この{列車|れっしゃ}は、{次|つぎ}の{駅|えき}で{進行方向|しんこうほうこう}が{変|か}わります。', 'kono ressha wa, tsugi no eki de shinkō hōkō ga kawarimasu', '這班列車在下一站行進方向會改變', 'dir', '進行方向＝列車前進的方向。');
K('an_zaseki', 'お{手数|てすう}ですが、{座席|ざせき}の{向|む}きを{変|か}えてお{使|つか}いください。', 'otesū desu ga, zaseki no muki o kaete otsukai kudasai', '麻煩您把座椅轉向使用', 'advice', '座席の向き＝座椅的方向。特急的座椅可以整排轉 180 度。');
K('an_mawasu_q', 'これ、どうやって{回|まわ}しますか。', 'kore, dō yatte mawashimasu ka', '這個要怎麼轉？', 'ask');
K('an_pedal', '{下|した}のペダルを{踏|ふ}んで、くるっと{回|まわ}すんですよ。', 'shita no pedaru o funde, kurutto mawasun desu yo', '踩下面的踏板，轉過來就好', 'next');
V('annc', 2, 'an2t', {who:'車內廣播', tr:true, note:'換說法：轉座椅', setup:'你搭 JR 特急，坐在可以轉的座椅上。車內響起廣播。'}, [
  {id:'n1', t:'hear', bc:true, c:['an_oshirase', 'an_houkou', 'an_zaseki'], zh:'通知各位。這班列車在下一站行進方向會改變。麻煩您把座椅轉向使用。',
    q:[Q('什麼會改變？', ['列車前進的方向', '月台', '終點站'], 'an_houkou'), Q('廣播請你做什麼？', ['把座椅轉向', '換車廂', '下車換車'], 'an_zaseki')], learn:['下一站前進方向會反過來', '要把座椅轉向'], todo:'轉座椅', next:'n2'},
  {id:'n2', t:'act', q:'你要怎麼做？', o:[
    O(['sumimasen', 'an_mawasu_q'], '不好意思，這個要怎麼轉？', 'ok', '問旁邊的人完全沒問題。', 'n3'),
    O(null, '看別人怎麼轉，跟著做', 'ok', '通常整節車廂會一起轉。', 'n5', {do:'看別人怎麼做'}),
    O(null, '不管它，繼續坐', 'part', '可以，但之後就是倒著坐。大家轉的時候你不轉也會擋到別人。', null, {do:'繼續坐'})]},
  {id:'n3', t:'hear', who:'旁邊的乘客', c:['an_pedal'], zh:'踩下面的踏板，轉過來就好。', q:[Q('怎麼轉？', ['踩下面的踏板再轉', '拉旁邊的拉桿', '按扶手上的按鈕'], 'an_pedal')], learn:['踩踏板轉'], todo:'轉座椅', next:'n4'},
  {id:'n4', t:'act', q:'你要怎麼做？', o:[
    O(['arigatou'], '謝謝。（踩踏板把座椅轉過來）', 'ok', '照著做，再道謝。', 'n5', {do:'踩踏板轉座椅'})]},
  {id:'n5', t:'end', res:'ok', text:'座椅轉好了，你面向前進方向坐。'}]);

K('an_ooyuki', '{大雪|おおゆき}の{影響|えいきょう}で、', 'ōyuki no eikyō de,', '因為大雪', 'reason');
K('an_miawase', '{函館本線|はこだてほんせん}は、{札幌|さっぽろ}・{小樽|おたる}{間|かん}で{運転|うんてん}を{見合|みあ}わせております。', 'Hakodate-honsen wa, Sapporo Otaru-kan de unten o miawasete orimasu', '函館本線札幌到小樽之間暫停行駛', 'neg', '運転見合わせ＝暫停行駛（不是誤點，是不開）。');
K('an_mikomi', '{運転再開|うんてんさいかい}の{見込|みこ}みは{立|た}っておりません。', 'unten saikai no mikomi wa tatte orimasen', '何時恢復行駛還不知道', 'time');
K('an_bus_arimasuka', '{小樽|おたる}まで、バスはありますか。', 'Otaru made, basu wa arimasu ka', '到小樽有巴士嗎？', 'ask');
K('an_bus_terminal', 'バスなら、{駅前|えきまえ}のバスターミナルから{出|で}てますよ。', 'basu nara, ekimae no basu tāminaru kara detemasu yo', '巴士的話，從站前巴士總站發車', 'place');
K('an_yuki_okure', 'ただ、{雪|ゆき}で{遅|おく}れてるかもしれません。', 'tada, yuki de okureteru kamo shiremasen', '不過可能因為下雪會誤點', 'time');
K('an_ekimae_bus', '{駅前|えきまえ}のバスターミナルです。', 'ekimae no basu tāminaru desu', '是站前巴士總站', 'place');
K('an_okureru', '{雪|ゆき}で、{遅|おく}れるかも。', 'yuki de, okureru kamo', '下雪可能會晚', 'time');
K('an_ekimae_ne', '{駅前|えきまえ}ですね。', 'ekimae desu ne', '是站前對吧', 'ask');
V('annc', 3, 'an3a', {who:'月台廣播', note:'大雪停駛、改搭巴士', setup:'冬天，札幌站。你要去小樽，月台廣播響起。'}, [
  {id:'n1', t:'hear', bc:true, c:['an_tadaima', 'an_ooyuki', 'an_miawase', 'an_mikomi'], zh:'目前因為大雪，函館本線札幌到小樽之間暫停行駛。何時恢復行駛還不知道。',
    q:[Q('電車現在怎樣？', ['暫停行駛', '誤點 5 分鐘', '改走別的路線'], 'an_miawase'), Q('什麼時候恢復？', ['還不知道', '1 小時後', '明天早上'], 'an_mikomi')], learn:['札幌—小樽暫停行駛', '恢復時間未定'], todo:'找別的去法', next:'n2'},
  {id:'n2', t:'act', q:'你要去小樽：', o:[
    O(['sumimasen', 'an_bus_arimasuka'], '不好意思，到小樽有巴士嗎？', 'ok', '停駛又不知道何時恢復，問其他交通方式最實際。問站員最準。', 'n3'),
    O(null, '在月台繼續等', 'part', '可以等，但「見込みは立っておりません」＝不知道何時恢復，可能等很久。', 'n2w', {do:'繼續在月台等'})]},
  {id:'n2w', t:'end', res:'slow', text:'你等了很久，電車終於恢復。下次可以先問有沒有巴士。'},
  {id:'n3', t:'hear', who:'站員', c:['an_bus_terminal', 'an_yuki_okure'], zh:'巴士的話，從站前巴士總站發車。不過可能因為下雪會誤點。',
    easy:{c:['an_ekimae_bus', 'an_okureru'], zh:'是站前巴士總站。下雪可能會晚。'},
    q:[Q('巴士從哪裡搭？', ['站前巴士總站', '月台旁邊', '機場'], 'an_bus_terminal', 'an_ekimae_bus'), Q('要注意什麼？', ['可能因為雪誤點', '巴士要預約', '只收現金'], 'an_yuki_okure', 'an_okureru')],
    learn:['站前巴士總站有巴士', '可能誤點'], todo:'去站前巴士總站', next:'n4'},
  {id:'n4', t:'act', q:'你要怎麼做？', o:[
    O(null, '走去站前巴士總站', 'ok', '抓到地點就出發。', 'n5', {do:'走去站前巴士總站'}),
    O(['an_ekimae_ne'], '是站前對吧。', 'ok', '用「〜ですね」確認地點，很好。', 'n4r', {fix:true})]},
  {id:'n4r', t:'hear', who:'站員', c:['hai_sou'], zh:'對，沒錯。', q:[], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你改搭巴士，雪天有點慢，但還是到了小樽。'}]);

K('an_shingou', '{信号|しんごう}トラブルの{影響|えいきょう}で、', 'shingō toraburu no eikyō de,', '因為號誌故障', 'reason');
K('an_chuuou', '{中央線|ちゅうおうせん}は、{上下線|じょうげせん}で{運転|うんてん}を{見合|みあ}わせております。', 'Chūō-sen wa, jōgesen de unten o miawasete orimasu', '中央線上下行都暫停行駛', 'neg', '上下線＝兩個方向。');
K('an_furikae', '{振替輸送|ふりかえゆそう}を{実施|じっし}しております。', 'furikae yusō o jisshi shite orimasu', '正在實施替代運輸（可改搭其他路線）', 'advice', '振替輸送＝停駛時可用其他路線替代。能不能用、怎麼用，問站員最準。');
K('an_hoka_ikikata', '{新宿|しんじゅく}まで、ほかの{行|い}き{方|かた}はありますか。', 'Shinjuku made, hoka no ikikata wa arimasu ka', '到新宿有其他走法嗎？', 'ask');
K('an_marunouchi', '{丸ノ内線|まるのうちせん}で{行|い}けますよ。', 'Marunouchi-sen de ikemasu yo', '搭丸之內線可以到', 'place');
K('an_chika_orite', '{地下|ちか}に{降|お}りてください。', 'chika ni orite kudasai', '請往地下走', 'dir');
K('an_marunouchi_ne', '{丸ノ内線|まるのうちせん}ですね。', 'Marunouchi-sen desu ne', '丸之內線對吧', 'ask');
V('annc', 3, 'an3t', {who:'車站廣播', tr:true, note:'換說法：東京停駛、替代路線', setup:'你在東京站，要搭中央線去新宿。'}, [
  {id:'n1', t:'hear', bc:true, c:['an_shingou', 'an_chuuou', 'an_furikae'], zh:'因為號誌故障，中央線上下行都暫停行駛。正在實施替代運輸。',
    q:[Q('中央線現在怎樣？', ['兩個方向都暫停', '只有一個方向誤點', '正常行駛'], 'an_chuuou'), Q('廣播提到可以怎麼辦？', ['改搭其他路線', '退票', '等明天'], 'an_furikae')], learn:['中央線停駛', '可以改搭其他路線'], todo:'問替代走法', next:'n2'},
  {id:'n2', t:'act', q:'你要去新宿：', o:[
    O(['sumimasen', 'an_hoka_ikikata'], '不好意思，到新宿有其他走法嗎？', 'ok', '問站員其他走法最快。', 'n3'),
    O(null, '在月台一直等', 'part', '停駛時間不明，問其他走法比較快。', null, {do:'繼續等'})]},
  {id:'n3', t:'hear', who:'站員', c:['an_marunouchi', 'an_chika_orite'], zh:'搭丸之內線可以到。請往地下走。',
    q:[Q('可以搭什麼？', ['丸之內線', '山手線', '巴士'], 'an_marunouchi'), Q('往哪裡走？', ['往地下', '上樓', '出站外'], 'an_chika_orite')], learn:['改搭丸之內線', '往地下'], todo:'往地下找丸之內線', next:'n4'},
  {id:'n4', t:'act', q:'你要怎麼做？', o:[
    O(null, '往地下走，找丸之內線的標示', 'ok', '看紅色的「M」標誌。', 'n5', {do:'往地下找丸之內線'}),
    O(['an_marunouchi_ne'], '丸之內線對吧。', 'ok', '確認路線名稱，很好。', 'n4r', {fix:true})]},
  {id:'n4r', t:'hear', who:'站員', c:['hai_sou'], zh:'對，沒錯。', q:[], next:'n4'},
  {id:'n5', t:'end', res:'ok', text:'你改搭丸之內線到了新宿。'}]);

/* ============================================================
   生活五：入場櫃台（錢湯、溫泉、會員制場所）
   使用者經驗：會員制場所的星期三「水着デー」，穿泳裝入場費免費（無料）。
   東京錢湯多半沒有附洗髮精；日歸溫泉常見鞋櫃鑰匙換置物櫃鑰匙、手環記帳。
   ============================================================ */
T({id:'entry', group:LIFE, levels:3, name:'入場櫃台・規則說明', place:'錢湯／溫泉／會員制場所的入口', dest:'聽懂規則，順利入場', dk:'目標', todo0:'聽櫃台說明',
  setup:'你到了入口櫃台，工作人員開始說明。',
  sim:'模擬情境：規則類型（毛巾、洗髮精、鞋櫃、手環、會員證、主題日）是常見做法；金額、星期幾、規則細節各店不同。',
  axis:{1:'一句規則：毛巾、鞋櫃', 2:'第一次來：多一個規則或金額', 3:'主題日、手環：條件和例外'}});
K('en_otona1', '{大人|おとな}{一人|ひとり}です。', 'otona hitori desu', '一位大人', 'num');
K('en_550', '550{円|えん}です。', 'gohyaku-gojū en desu', '550 日圓', 'num');
K('en_towel', 'タオルはお{持|も}ちですか。', 'taoru wa omochi desu ka', '有帶毛巾嗎？', 'q');
K('en_motte_nai', '{持|も}ってないです。', 'motte nai desu', '沒帶', 'neg');
K('en_rental', 'レンタルタオル、200{円|えん}です。', 'rentaru taoru, nihyaku en desu', '租毛巾 200 日圓', 'num');
V('entry', 1, 'en1a', {who:'櫃台', note:'錢湯：價錢、毛巾', setup:'東京的錢湯（公共澡堂）。'}, [
  {id:'n1', t:'say', intent:'在櫃台說：一位大人', c:['en_otona1'], zh:'一位大人。', next:'n2'},
  {id:'n2', t:'hear', c:['en_550'], zh:'550 日圓。', q:[Q('多少錢？', ['550 日圓', '515 日圓', '505 日圓'], 'en_550')], learn:['550 日圓'], todo:'付錢', next:'n3'},
  {id:'n3', t:'act', q:'付錢：', o:[
    O(null, '把 550 日圓放在櫃台上', 'ok', '把錢放在櫃台或托盤上。', 'n4', {do:'付 550 日圓'})]},
  {id:'n4', t:'hear', c:['en_towel'], zh:'有帶毛巾嗎？', q:[Q('櫃台在問什麼？', ['有沒有帶毛巾', '有沒有會員卡', '要不要洗髮精'], 'en_towel')], learn:['問有沒有毛巾'], todo:'回答有／沒有', next:'n5'},
  {id:'n5', t:'act', q:'你沒帶毛巾：', o:[
    O(['en_motte_nai'], '沒帶。', 'ok', '沒帶就說「持ってないです」。', 'n6'),
    O(['l_hai'], '是。', 'part', '「はい」＝有帶。你沒帶的話要說「持ってないです」。', null)]},
  {id:'n6', t:'hear', c:['en_rental'], zh:'租毛巾 200 日圓。', q:[Q('毛巾怎樣？', ['可以租，200 日圓', '免費', '不能租'], 'en_rental')], learn:['毛巾可以租，200 日圓'], todo:'決定要不要租', next:'n7'},
  {id:'n7', t:'act', q:'你要租：', o:[
    O(['l_onegai'], '麻煩你。', 'ok', '「お願いします」＝要。', 'n8')]},
  {id:'n8', t:'end', res:'ok', text:'你付了入浴費，也租到毛巾。'}]);

K('en_kutsu', '{靴|くつ}は、こちらの{下駄箱|げたばこ}にお{願|ねが}いします。', 'kutsu wa, kochira no getabako ni onegai shimasu', '鞋子請放這邊的鞋櫃', 'place', '下駄箱＝鞋櫃。');
K('en_kutsu_nuide', 'あ、{靴|くつ}は{脱|ぬ}いでくださいね。', 'a, kutsu wa nuide kudasai ne', '啊，請脫鞋喔', 'advice');
K('en_kagi_front', '{鍵|かぎ}は、フロントでお{預|あず}かりします。', 'kagi wa, furonto de oazukari shimasu', '鞋櫃鑰匙由櫃台保管', 'next', '日歸溫泉常見：鞋櫃鑰匙交給櫃台，換一把置物櫃鑰匙。');
K('en_locker_kagi', 'こちら、ロッカーの{鍵|かぎ}です。', 'kochira, rokkā no kagi desu', '這是置物櫃鑰匙', 'concl');
V('entry', 1, 'en1t', {who:'櫃台', tr:true, note:'換說法：鞋櫃、鑰匙', setup:'札幌近郊的日歸溫泉。'}, [
  {id:'n1', t:'hear', c:['l_irasshai', 'en_kutsu'], zh:'歡迎光臨。鞋子請放這邊的鞋櫃。', point:'櫃台人員指著入口旁一排有鑰匙的小櫃子。',
    q:[Q('鞋子怎麼辦？', ['放進鞋櫃', '拿在手上', '穿進去'], 'en_kutsu')], learn:['鞋子放鞋櫃'], todo:'放鞋', next:'n2'},
  {id:'n2', t:'act', q:'你要怎麼做？', o:[
    O(null, '脫鞋，放進鞋櫃，拿下鑰匙', 'ok', '鞋櫃多半有木頭或金屬鑰匙。', 'n3', {do:'鞋放進鞋櫃，拿鑰匙'}),
    O(null, '穿著鞋走進去', 'bad', '日本溫泉、澡堂入口一定要脫鞋。', 'n2x', {do:'穿鞋走進去'})]},
  {id:'n2x', t:'hear', c:['en_kutsu_nuide'], zh:'啊，請脫鞋喔。', q:[Q('他提醒什麼？', ['要脫鞋', '要付錢', '要排隊'], 'en_kutsu_nuide')], next:'n2'},
  {id:'n3', t:'hear', c:['en_kagi_front'], zh:'鞋櫃鑰匙由櫃台保管。', q:[Q('鞋櫃鑰匙怎麼辦？', ['交給櫃台', '自己帶進去', '插在鞋櫃上'], 'en_kagi_front')], learn:['鞋櫃鑰匙交給櫃台'], todo:'交鑰匙', next:'n4'},
  {id:'n4', t:'act', q:'你要怎麼做？', o:[
    O(null, '把鞋櫃鑰匙交給櫃台', 'ok', '交出去，會換一把置物櫃鑰匙。', 'n5', {do:'交出鞋櫃鑰匙'})]},
  {id:'n5', t:'hear', c:['en_locker_kagi'], zh:'這是置物櫃鑰匙。', q:[], learn:['拿到置物櫃鑰匙'], todo:'去更衣室', next:'n6'},
  {id:'n6', t:'end', res:'ok', text:'你拿到置物櫃鑰匙，去泡湯了。'}]);

K('en_hajimete', '{初|はじ}めてです。', 'hajimete desu', '我是第一次來', 'concl', '關鍵字策略：說「初めてです」，櫃台通常會主動說明規則。');
K('en_shampoo', 'シャンプーとボディソープは{置|お}いてないので、', 'shanpū to bodī sōpu wa oite nai node,', '因為沒有放洗髮精和沐浴乳', 'neg', '東京很多錢湯不附洗髮精。');
K('en_kochira_kaemasu', 'こちらで{買|か}えますよ。', 'kochira de kaemasu yo', '可以在這裡買', 'place');
K('en_shampoo_nai', 'シャンプー、ないです。', 'shanpū, nai desu', '沒有洗髮精', 'neg');
K('en_koko_uru', 'ここで{売|う}ってます。', 'koko de uttemasu', '這裡有賣', 'place');
K('en_hitotsu_kudasai', 'じゃあ、ひとつください。', 'jā, hitotsu kudasai', '那請給我一個', 'ask');
K('en_motte_masu', '{持|も}ってます。', 'motte masu', '我有帶', 'concl');
K('en_yubune_towel', 'タオルは、{湯船|ゆぶね}に{入|い}れないでくださいね。', 'taoru wa, yubune ni irenaide kudasai ne', '毛巾請不要放進浴池', 'neg', '湯船＝浴池。');
V('entry', 2, 'en2a', {who:'櫃台', note:'第一次：洗髮精、毛巾規則', setup:'東京的錢湯，你第一次來。'}, [
  {id:'n1', t:'say', intent:'說：我是第一次來', c:['en_hajimete'], zh:'我是第一次來。', next:'n2'},
  {id:'n2', t:'hear', c:['en_shampoo', 'en_kochira_kaemasu'], zh:'因為沒有放洗髮精和沐浴乳，可以在這裡買喔。',
    easy:{c:['en_shampoo_nai', 'en_koko_uru'], zh:'沒有洗髮精。這裡有賣。'},
    q:[Q('裡面有洗髮精嗎？', ['沒有', '有', '要另外租'], 'en_shampoo', 'en_shampoo_nai'), Q('沒有的話怎麼辦？', ['在櫃台買', '去便利商店買', '跟別人借'], 'en_kochira_kaemasu', 'en_koko_uru')],
    learn:['裡面沒有洗髮精', '櫃台有賣'], todo:'決定買不買', next:'n3'},
  {id:'n3', t:'act', q:'你沒帶洗髮精：', o:[
    O(['en_hitotsu_kudasai'], '那請給我一個。', 'ok', '買一份就好。', 'n4'),
    O(['en_motte_masu'], '我有帶。', 'part', '這次你沒帶，進去就沒得洗了。', null)]},
  {id:'n4', t:'hear', c:['en_yubune_towel'], zh:'毛巾請不要放進浴池喔。', q:[Q('毛巾要注意什麼？', ['不要放進浴池', '不要帶進浴室', '要先洗過'], 'en_yubune_towel')], learn:['毛巾不能放進浴池'], todo:'進去洗澡', next:'n5'},
  {id:'n5', t:'act', q:'泡澡時毛巾怎麼辦？', o:[
    O(null, '毛巾放在頭上或浴池旁邊', 'ok', '日本人常把小毛巾折好放頭上。', 'n6', {do:'毛巾放頭上'}),
    O(null, '毛巾泡進浴池裡', 'bad', '他剛剛說不要放進浴池。', null, {do:'毛巾放進浴池'})]},
  {id:'n6', t:'end', res:'ok', text:'你買了洗髮精，泡澡時毛巾也沒碰到熱水。'}]);

K('en_hajimete_ne', '{初|はじ}めてですね。', 'hajimete desu ne', '第一次來對吧', 'concl');
K('en_kaiinshou', '{会員証|かいいんしょう}を{作|つく}るので、', 'kaiinshō o tsukuru node,', '因為要辦會員證', 'reason');
K('en_mibun', '{身分証|みぶんしょう}をお{願|ねが}いします。', 'mibunshō o onegai shimasu', '請出示身分證件', 'next', '外國旅客給護照。會員制場所多半要證件。');
K('en_passport', 'パスポート、ありますか。', 'pasupōto, arimasu ka', '有護照嗎？', 'next');
K('en_nai_to', 'ないと、ちょっと{入|はい}れないんですよ。', 'nai to, chotto hairenain desu yo', '沒有的話，可能沒辦法進去', 'neg', '「ちょっと〜」＝委婉地說不行。');
K('en_nyuukai', '{入会金|にゅうかいきん}が1000{円|えん}、', 'nyūkaikin ga sen en,', '入會費 1000 日圓', 'num');
K('en_nyuujou', '{入場料|にゅうじょうりょう}が2000{円|えん}です。', 'nyūjōryō ga nisen en desu', '入場費 2000 日圓', 'num');
K('en_zenbu_3000', '{全部|ぜんぶ}で3000{円|えん}ですね。', 'zenbu de sanzen en desu ne', '總共 3000 日圓對吧', 'ask');
V('entry', 2, 'en2t', {who:'櫃台', tr:true, note:'換說法：會員制、兩個金額', setup:'一家會員制場所，你第一次來。'}, [
  {id:'n1', t:'say', intent:'說：我是第一次來', c:['en_hajimete'], zh:'我是第一次來。', next:'n2'},
  {id:'n2', t:'hear', c:['en_hajimete_ne', 'en_kaiinshou', 'en_mibun'], zh:'第一次來對吧。因為要辦會員證，請出示身分證件。',
    easy:{c:['en_passport'], zh:'有護照嗎？'},
    q:[Q('他要你做什麼？', ['出示身分證件', '付會員費', '填表格'], 'en_mibun', 'en_passport'), Q('為什麼？', ['要辦會員證', '要確認預約', '要寄東西'], 'en_kaiinshou')],
    learn:['要辦會員證', '要給身分證件'], todo:'給證件', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼做？', o:[
    O(null, '拿出護照', 'ok', '外國人用護照就行。', 'n4', {do:'拿出護照'}),
    O(['en_motte_nai'], '沒帶。', 'part', '沒帶證件可能就辦不了會員。', 'n3x')]},
  {id:'n3x', t:'hear', c:['en_nai_to'], zh:'沒有的話，可能沒辦法進去。', q:[Q('沒帶證件會怎樣？', ['可能不能進去', '要多付錢', '沒關係'], 'en_nai_to')], learn:['沒證件不能進'], todo:'回去拿護照', next:'n3b'},
  {id:'n3b', t:'act', q:'怎麼辦？', o:[
    O(null, '回旅館拿護照再來', 'ok', '下次記得帶。', 'n3e', {do:'回去拿護照'})]},
  {id:'n3e', t:'end', res:'slow', text:'你回去拿了護照，再來就順利辦好會員。'},
  {id:'n4', t:'hear', c:['en_nyuukai', 'en_nyuujou'], zh:'入會費 1000 日圓，入場費 2000 日圓。',
    q:[Q('入場費多少？', ['2000 日圓', '1000 日圓', '3000 日圓'], 'en_nyuujou'), Q('入會費多少？', ['1000 日圓', '2000 日圓', '免費'], 'en_nyuukai')], learn:['入會費 1000', '入場費 2000'], todo:'付錢', next:'n5'},
  {id:'n5', t:'act', q:'第一次來，要付多少？', o:[
    O(['en_zenbu_3000'], '總共 3000 日圓對吧。', 'ok', '用「〜ですね」確認總額。', 'n6', {fix:true}),
    O(null, '付 3000 日圓', 'ok', '入會費＋入場費＝3000。', 'n7', {do:'付 3000 日圓'}),
    O(null, '付 2000 日圓', 'part', '還有入會費 1000 日圓，第一次要兩個加起來。', null, {do:'付 2000 日圓'})]},
  {id:'n6', t:'hear', c:['hai_sou'], zh:'對，沒錯。', q:[], next:'n7'},
  {id:'n7', t:'end', res:'ok', text:'你辦好會員，付了 3000 日圓入場。'}]);

K('en_kaiinshou_desu', 'これ、{会員証|かいいんしょう}です。', 'kore, kaiinshō desu', '這是會員證', 'concl');
K('en_kyou_suiyou', '{今日|きょう}は{水曜日|すいようび}なので、', 'kyō wa suiyōbi na node,', '今天是星期三，所以', 'time');
K('en_mizugi_day', '{水着|みずぎ}デーです。', 'mizugi dē desu', '是泳裝日', 'topic', '〜デー＝主題日。');
K('en_mizugi_kata', '{水着|みずぎ}の{方|かた}は、', 'mizugi no kata wa,', '穿泳裝的人', 'cond');
K('en_muryou', '{入場料|にゅうじょうりょう}が{無料|むりょう}になります。', 'nyūjōryō ga muryō ni narimasu', '入場費免費', 'num', '無料（むりょう）＝免費。〜になります＝變成〜。');
K('en_kyou_mizugi', '{今日|きょう}は{水着|みずぎ}の{日|ひ}です。', 'kyō wa mizugi no hi desu', '今天是泳裝日', 'topic');
K('en_mizugi_nara', '{水着|みずぎ}なら、{無料|むりょう}です。', 'mizugi nara, muryō desu', '穿泳裝的話免費', 'num');
K('en_mizugi_nai', '{水着|みずぎ}、{持|も}ってないです。', 'mizugi, motte nai desu', '我沒有泳裝', 'neg');
K('en_muryou_desune', '{無料|むりょう}ですね。', 'muryō desu ne', '免費對吧', 'ask');
K('en_mizugi_dake', '{水着|みずぎ}の{方|かた}だけです。', 'mizugi no kata dake desu', '只限穿泳裝的人', 'cond');
K('en_deshitara', 'でしたら、', 'deshitara,', '那樣的話', 'filler');
K('en_tsuujou_2000', '{通常料金|つうじょうりょうきん}で、2000{円|えん}です。', 'tsūjō ryōkin de, nisen en desu', '一般價 2000 日圓', 'num', '通常料金＝一般價格。');
K('en_tsuujou_desu', '{水着|みずぎ}じゃない{方|かた}は、{通常料金|つうじょうりょうきん}です。', 'mizugi ja nai kata wa, tsūjō ryōkin desu', '沒穿泳裝的是一般價', 'num');
K('en_kariraremasu', '{水着|みずぎ}、{借|か}りられますか。', 'mizugi, kariraremasu ka', '可以借泳裝嗎？', 'ask');
K('en_rental_nai', 'すみません、レンタルはやってないんですよ。', 'sumimasen, rentaru wa yatte nain desu yo', '抱歉，沒有出租', 'neg');
V('entry', 3, 'en3a', {who:'櫃台', note:'主題日：條件和例外', setup:'星期三晚上，你到一家已經是會員的會員制場所。櫃台在說明今天的規則。你沒帶泳裝。'}, [
  {id:'n1', t:'say', intent:'拿出會員證：這是會員證', c:['en_kaiinshou_desu'], zh:'這是會員證。', next:'n2'},
  {id:'n2', t:'hear', c:['en_kyou_suiyou', 'en_mizugi_day', 'en_mizugi_kata', 'en_muryou'], zh:'今天是星期三，所以是泳裝日。穿泳裝的人入場費免費。',
    easy:{c:['en_kyou_mizugi', 'en_mizugi_nara'], zh:'今天是泳裝日。穿泳裝的話免費。'},
    q:[Q('穿泳裝的話入場費？', ['免費', '半價', '不能進'], 'en_muryou', 'en_mizugi_nara'), Q('今天是什麼日？', ['泳裝日', '會員日', '公休日'], 'en_mizugi_day', 'en_kyou_mizugi')],
    learn:['今天是泳裝日', '穿泳裝免費'], todo:'告訴他你沒有泳裝', next:'n3'},
  {id:'n3', t:'act', q:'你沒帶泳裝。怎麼接？', o:[
    O(['en_mizugi_nai'], '我沒有泳裝。', 'ok', '先說清楚自己的狀況，櫃台會告訴你怎麼辦。', 'n4'),
    O(['en_kariraremasu'], '可以借泳裝嗎？', 'ok', '直接問能不能借，也很好。', 'n5b'),
    O(['en_muryou_desune'], '免費對吧。', 'part', '你抓到「無料」很好！但免費只限穿泳裝的人。', 'n3r', {fix:true}),
    O(null, '直接走進去', 'bad', '「無料」只適用穿泳裝的人，沒說清楚會被叫回來補錢。', 'n3x', {do:'直接走進去'})]},
  {id:'n3r', t:'hear', c:['en_mizugi_dake'], zh:'只限穿泳裝的人。', q:[Q('免費的條件？', ['只限穿泳裝的人', '只限新會員', '只限今天第一位'], 'en_mizugi_dake')], learn:['免費只限穿泳裝'], next:'n3'},
  {id:'n3x', t:'hear', c:['sumimasen', 'en_tsuujou_desu'], zh:'不好意思，沒穿泳裝的是一般價。', who:'櫃台（叫住你）', q:[Q('他說什麼？', ['沒穿泳裝要付一般價', '今天休息', '要先換鞋'], 'en_tsuujou_desu')], next:'n3'},
  {id:'n4', t:'hear', c:['en_deshitara', 'en_tsuujou_2000'], zh:'那樣的話，一般價 2000 日圓。', q:[Q('你要付多少？', ['一般價 2000 日圓', '免費', '1000 日圓'], 'en_tsuujou_2000')], learn:['沒泳裝：一般價 2000'], todo:'付錢或問能不能借', next:'n5'},
  {id:'n5', t:'act', q:'你要怎麼做？', o:[
    O(null, '付 2000 日圓', 'ok', '用一般價入場。', 'n6', {do:'付 2000 日圓'}),
    O(['en_kariraremasu'], '可以借泳裝嗎？', 'ok', '問有沒有租借也很好。', 'n5b')]},
  {id:'n5b', t:'hear', c:['en_rental_nai'], zh:'抱歉，沒有出租。', q:[Q('可以借泳裝嗎？', ['不行，沒有出租', '可以，要錢', '可以，免費'], 'en_rental_nai')], learn:['泳裝不出租'], todo:'付一般價', next:'n5c'},
  {id:'n5c', t:'act', q:'那就：', o:[
    O(null, '付 2000 日圓', 'ok', '這次用一般價，下次星期三可以帶泳裝。', 'n6', {do:'付 2000 日圓'})]},
  {id:'n6', t:'hear', c:['en_locker_kagi'], zh:'這是置物櫃鑰匙。', q:[], next:'n7'},
  {id:'n7', t:'end', res:'ok', text:'你付一般價入場。下次星期三帶泳裝就免費。'}]);

K('en_wristband', 'こちらのリストバンドで、{館内|かんない}のお{支払|しはら}いができます。', 'kochira no risutobando de, kannai no oshiharai ga dekimasu', '用這個手環可以付館內消費', 'concl', '超級錢湯、溫泉設施常見：館內消費先記在手環上。');
K('en_matomete', 'お{帰|かえ}りの{際|さい}に、まとめて{精算|せいさん}してください。', 'okaeri no sai ni, matomete seisan shite kudasai', '回去的時候請一起結帳', 'time', 'お帰りの際＝回去的時候；精算＝結帳。');
K('en_band_de', 'このバンドで{払|はら}えます。', 'kono bando de haraemasu', '用這個手環付', 'concl');
K('en_kaeru_toki', '{帰|かえ}る{時|とき}に、{払|はら}ってください。', 'kaeru toki ni, haratte kudasai', '回去時付錢', 'time');
K('en_kaeru_toki_ne', '{帰|かえ}る{時|とき}に{払|はら}うんですね。', 'kaeru toki ni haraun desu ne', '回去時付，對吧', 'ask');
V('entry', 3, 'en3t', {who:'櫃台', tr:true, note:'換說法：手環記帳、離開時結帳', setup:'札幌的大型溫泉設施（超級錢湯）。'}, [
  {id:'n1', t:'say', intent:'在櫃台說：一位大人', c:['en_otona1'], zh:'一位大人。', next:'n2'},
  {id:'n2', t:'hear', c:['en_wristband', 'en_matomete'], zh:'用這個手環可以付館內消費。回去的時候請一起結帳。',
    easy:{c:['en_band_de', 'en_kaeru_toki'], zh:'用這個手環付。回去時付錢。'},
    q:[Q('館內買東西怎麼付？', ['用手環記帳', '付現金', '用信用卡'], 'en_wristband', 'en_band_de'), Q('什麼時候結帳？', ['離開的時候一起', '每次買就付', '進場時先付'], 'en_matomete', 'en_kaeru_toki')],
    learn:['館內用手環記帳', '離開時一起結帳'], todo:'進去', next:'n3'},
  {id:'n3', t:'act', q:'你要怎麼接？', o:[
    O(['en_kaeru_toki_ne'], '回去時付，對吧。', 'ok', '用「〜んですね」確認，很自然。', 'n4', {fix:true}),
    O(null, '點頭，戴上手環進去', 'ok', '聽懂就好。', 'n5', {do:'戴上手環進去'}),
    O(null, '現在就拿錢包要付', 'part', '他說的是「回去的時候」一起付，現在不用。', null, {do:'拿錢包要付'})]},
  {id:'n4', t:'hear', c:['hai_sou'], zh:'對，沒錯。', q:[], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你用手環買了飲料，離開時一起結帳。'}]);

/* ============================================================
   生活六：買衣服
   使用者經驗：只說「洗衣機」一個關鍵字，店員就懂；店員特別提到「赤耳」。
   日本試衣間通常要脫鞋；試上衣常會給防妝套（フェイスカバー）。
   免稅：2026 年 11 月起改成出境時退稅，店員說法會變，所以這裡不做免稅對話。
   ============================================================ */
T({id:'shop', group:LIFE, levels:3, name:'買衣服・試穿與洗滌', place:'東京／札幌・服飾店', dest:'試穿、問清楚、買到', dk:'目標', todo0:'跟店員說話',
  setup:'你在一家服飾店看到喜歡的衣服。',
  sim:'模擬情境：脫鞋試穿、防妝套、改褲長、掉色、調貨保留是常見做法；免費與否、時間、分店名稱各店不同。',
  axis:{1:'試穿：一句規則', 2:'一個關鍵字問，聽懂說明', 3:'沒貨、調貨、試衣間流程'}});
K('sh_shichaku_ii', '{試着|しちゃく}してもいいですか。', 'shichaku shite mo ii desu ka', '可以試穿嗎？', 'ask');
K('sh_douzo_achira', 'はい、どうぞ。{試着室|しちゃくしつ}はあちらです。', 'hai, dōzo. shichakushitsu wa achira desu', '好，請。試衣間在那邊', 'place');
K('sh_kutsu_nuide', '{靴|くつ}は、こちらで{脱|ぬ}いでくださいね。', 'kutsu wa, kochira de nuide kudasai ne', '鞋子請在這裡脫', 'advice', '日本試衣間通常要脫鞋。');
K('sh_kutsu_ano', 'あ、すみません、{靴|くつ}を…。', 'a, sumimasen, kutsu o…', '啊，不好意思，鞋子……', 'advice', '話沒說完＝客氣地提醒你。');
V('shop', 1, 'sh1a', {who:'店員', note:'試穿、脫鞋'}, [
  {id:'n1', t:'say', intent:'問：可以試穿嗎？', c:['sumimasen', 'sh_shichaku_ii'], zh:'不好意思，可以試穿嗎？', next:'n2'},
  {id:'n2', t:'hear', c:['sh_douzo_achira'], zh:'好，請。試衣間在那邊。', point:'店員用手掌指向店後面的布簾。',
    q:[Q('試衣間在哪？', ['店員指的那邊', '樓上', '不能試穿'], 'sh_douzo_achira')], learn:['可以試穿，試衣間在那邊'], todo:'去試衣間', next:'n3'},
  {id:'n3', t:'hear', c:['sh_kutsu_nuide'], zh:'鞋子請在這裡脫。', q:[Q('進試衣間前要做什麼？', ['脫鞋', '拿號碼牌', '付錢'], 'sh_kutsu_nuide')], learn:['試衣間要脫鞋'], todo:'脫鞋進去', next:'n4'},
  {id:'n4', t:'act', q:'你要怎麼做？', o:[
    O(null, '脫鞋，再進試衣間', 'ok', '日本試衣間通常要脫鞋。', 'n5', {do:'脫鞋進去'}),
    O(null, '穿著鞋進去', 'bad', '店員剛說要脫鞋。', 'n4x', {do:'穿鞋進去'})]},
  {id:'n4x', t:'hear', c:['sh_kutsu_ano'], zh:'啊，不好意思，鞋子……', q:[Q('店員想說什麼？', ['要脫鞋', '鞋子很好看', '要付錢'], 'sh_kutsu_ano')], next:'n4'},
  {id:'n5', t:'end', res:'ok', text:'你脫了鞋進試衣間，試穿了。'}]);

K('sh_shichaku_saremasu', 'よかったら、{試着|しちゃく}されますか。', 'yokattara, shichaku saremasu ka', '要不要試穿看看？', 'q', 'よかったら＝如果你願意的話。');
K('sh_kochira_douzo', 'こちらへどうぞ。', 'kochira e dōzo', '這邊請', 'place');
K('sh_size_ikaga', 'サイズ、いかがですか。', 'saizu, ikaga desu ka', '尺寸如何？', 'q');
K('sh_chotto_ookii', 'ちょっと{大|おお}きいです。', 'chotto ōkii desu', '有點大', 'concl');
K('sh_chodo_ii', 'ちょうどいいです。', 'chōdo ii desu', '剛剛好', 'concl');
K('sh_hitotsu_shita', 'ひとつ{下|した}のサイズ、お{持|も}ちしますね。', 'hitotsu shita no saizu, omochi shimasu ne', '我拿小一號的來', 'next');
V('shop', 1, 'sh1t', {who:'店員', tr:true, note:'換說法：店員主動問、尺寸'}, [
  {id:'n1', t:'hear', c:['sh_shichaku_saremasu'], zh:'要不要試穿看看？', q:[Q('店員在問什麼？', ['要不要試穿', '要不要袋子', '要不要包裝'], 'sh_shichaku_saremasu')], learn:['店員問要不要試穿'], todo:'回答', next:'n2'},
  {id:'n2', t:'act', q:'你想試穿：', o:[
    O(['l_onegai'], '麻煩你。', 'ok', '「お願いします」＝要。', 'n3'),
    O(['l_daijoubu'], '不用了。', 'part', '這樣是「不試」。', null)]},
  {id:'n3', t:'hear', c:['sh_kochira_douzo'], zh:'這邊請。', q:[], learn:['跟著店員走'], todo:'試穿', next:'n4'},
  {id:'n4', t:'hear', c:['sh_size_ikaga'], zh:'尺寸如何？', who:'店員（在布簾外）', q:[Q('店員在問什麼？', ['尺寸合不合', '顏色喜不喜歡', '要不要買'], 'sh_size_ikaga')], learn:['問尺寸'], todo:'說合不合', next:'n5'},
  {id:'n5', t:'act', q:'有點大：', o:[
    O(['sh_chotto_ookii'], '有點大。', 'ok', 'ちょっと＋形容詞，很好用。', 'n6'),
    O(['sh_chodo_ii'], '剛剛好。', 'part', '其實有點大，說剛好就買到不合的。', null)]},
  {id:'n6', t:'hear', c:['sh_hitotsu_shita'], zh:'我拿小一號的來。', q:[Q('店員要做什麼？', ['拿小一號的', '拿大一號的', '幫你改'], 'sh_hitotsu_shita')], next:'n7'},
  {id:'n7', t:'end', res:'ok', text:'小一號剛剛好。'}]);

K('sh_sentakuki_q', '{洗濯機|せんたくき}？', 'sentakuki?', '洗衣機？（問能不能用洗衣機洗）', 'ask', '關鍵字＋問的語氣，店員多半就懂。');
K('sh_sentakuki_ok', '{洗濯機|せんたくき}、{大丈夫|だいじょうぶ}ですよ。', 'sentakuki, daijōbu desu yo', '洗衣機沒問題', 'concl');
K('sh_iroochi', 'ただ、{最初|さいしょ}は{色落|いろお}ちするので、', 'tada, saisho wa iroochi suru node,', '不過一開始會掉色，所以', 'reason', '色落ち＝掉色。');
K('sh_betsu', 'ほかの{服|ふく}とは{別|べつ}に{洗|あら}ってください。', 'hoka no fuku to wa betsu ni aratte kudasai', '請和其他衣服分開洗', 'advice');
K('sh_sentaku_okke', '{洗濯機|せんたくき}、オッケーです。', 'sentakuki, okkē desu', '洗衣機 OK', 'concl');
K('sh_saisho_betsu', '{最初|さいしょ}は、{別|べつ}に{洗|あら}ってください。', 'saisho wa, betsu ni aratte kudasai', '一開始請分開洗', 'advice');
K('sh_betsu_desune', '{別|べつ}に{洗|あら}うんですね。', 'betsu ni araun desu ne', '要分開洗，對吧', 'ask');
K('sh_tearai', '{手洗|てあら}いですか。', 'tearai desu ka', '要手洗嗎？', 'ask');
V('shop', 2, 'sh2a', {who:'店員', note:'一個關鍵字：洗濯機？', setup:'你看到一條赤耳牛仔褲，想知道能不能丟洗衣機。'}, [
  {id:'n1', t:'say', intent:'只用一個關鍵字問：這件能用洗衣機洗嗎？', c:['sumimasen', 'sh_sentakuki_q'], zh:'不好意思，洗衣機？', next:'n2'},
  {id:'n2', t:'hear', c:['sh_sentakuki_ok', 'sh_iroochi', 'sh_betsu'], zh:'洗衣機沒問題。不過一開始會掉色，請和其他衣服分開洗。',
    easy:{c:['sh_sentaku_okke', 'sh_saisho_betsu'], zh:'洗衣機 OK。一開始請分開洗。'},
    q:[Q('能用洗衣機洗嗎？', ['可以', '不行', '只能手洗'], 'sh_sentakuki_ok', 'sh_sentaku_okke'), Q('要注意什麼？', ['一開始要和其他衣服分開洗', '不能曬太陽', '要用冷水'], 'sh_betsu', 'sh_saisho_betsu')],
    learn:['可以用洗衣機', '一開始分開洗（會掉色）'], todo:'確認或道謝', next:'n3'},
  {id:'n3', t:'act', q:'你怎麼接？', o:[
    O(['sh_betsu_desune'], '要分開洗，對吧。', 'ok', '抓住關鍵的「別に」確認一次。', 'n4', {fix:true}),
    O(['arigatou'], '謝謝。', 'ok', '聽懂了就道謝。', 'n5'),
    O(['sh_tearai'], '要手洗嗎？', 'part', '他說洗衣機可以，只是一開始要分開洗。確認時抓「別に」。', null)]},
  {id:'n4', t:'hear', c:['hai_sou'], zh:'對，沒錯。', q:[], next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'一個「洗濯機？」就問到了：可以機洗，一開始分開洗。'}]);

K('sh_susoage_q', '{裾上|すそあ}げできますか。', 'suso-age dekimasu ka', '可以改褲長嗎？', 'ask', '裾上げ＝把褲腳改短。');
K('sh_akamimi_desu', 'こちら、{赤耳|あかみみ}のデニムですね。', 'kochira, akamimi no denimu desu ne', '這是赤耳丹寧', 'topic', '赤耳＝布邊有紅線的牛仔布（セルビッジ），店員常會特別提。');
K('sh_susoage_muryou', '{裾上|すそあ}げは{無料|むりょう}でできますよ。', 'suso-age wa muryō de dekimasu yo', '改褲長免費', 'num');
K('sh_30pun', '30{分|ぷん}くらいかかります。', 'sanjuppun kurai kakarimasu', '大約要 30 分鐘', 'time');
K('sh_muryou_desu', '{無料|むりょう}です。', 'muryō desu', '免費', 'num');
K('sh_30pun_desu', '30{分|ぷん}です。', 'sanjuppun desu', '30 分鐘', 'time');
K('sh_30pun_ne', '30{分|ぷん}ですね。', 'sanjuppun desu ne', '30 分鐘對吧', 'ask');
K('sh_toriniki', 'では、30{分後|ぷんご}に{取|と}りに{来|き}てください。', 'dewa, sanjuppungo ni tori ni kite kudasai', '那請 30 分鐘後來拿', 'time');
V('shop', 2, 'sh2t', {who:'店員', tr:true, note:'換說法：赤耳、改褲長', setup:'你決定買那條赤耳牛仔褲，但褲子太長。'}, [
  {id:'n1', t:'say', intent:'問：可以改褲長嗎？', c:['sh_susoage_q'], zh:'可以改褲長嗎？', next:'n2'},
  {id:'n2', t:'hear', c:['sh_akamimi_desu', 'sh_susoage_muryou', 'sh_30pun'], zh:'這是赤耳丹寧呢。改褲長免費，大約要 30 分鐘。',
    easy:{c:['sh_muryou_desu', 'sh_30pun_desu'], zh:'免費。30 分鐘。'},
    q:[Q('改褲長要錢嗎？', ['免費', '要錢', '不能改'], 'sh_susoage_muryou', 'sh_muryou_desu'), Q('要等多久？', ['30 分鐘左右', '3 分鐘', '3 天'], 'sh_30pun', 'sh_30pun_desu')],
    learn:['改褲長免費', '要 30 分鐘'], todo:'決定要不要改', next:'n3'},
  {id:'n3', t:'act', q:'你要改：', o:[
    O(['l_onegai'], '麻煩你。', 'ok', '「お願いします」＝要改。', 'n4'),
    O(['sh_30pun_ne'], '30 分鐘對吧。', 'ok', '確認時間，很好。', 'n3r', {fix:true})]},
  {id:'n3r', t:'hear', c:['hai_sou'], zh:'對，沒錯。', q:[], next:'n3'},
  {id:'n4', t:'hear', c:['sh_toriniki'], zh:'那請 30 分鐘後來拿。', q:[Q('什麼時候來拿？', ['30 分鐘後', '明天', '3 點'], 'sh_toriniki')], learn:['30 分鐘後來拿'], todo:'30 分鐘後回來', next:'n5'},
  {id:'n5', t:'end', res:'ok', text:'你逛了一圈，30 分鐘後拿到改好的褲子。'}]);

K('sh_m_arimasuka', 'これのMサイズ、ありますか。', 'kore no emu saizu, arimasu ka', '這件有 M 號嗎？', 'ask');
K('sh_moushiwake', '{申|もう}し{訳|わけ}ありません、', 'mōshiwake arimasen,', '非常抱歉', 'polite', '聽到這句，後面通常是壞消息（沒有、不行）。');
K('sh_zaiko_nai', 'Mサイズは{今|いま}、{在庫|ざいこ}がなくて。', 'emu saizu wa ima, zaiko ga nakute', 'M 號現在沒有庫存', 'neg', '在庫＝庫存。');
K('sh_hoka_tenpo', 'ほかの{店舗|てんぽ}にはあるかもしれないので、', 'hoka no tenpo ni wa aru kamo shirenai node,', '其他分店可能有，所以', 'place');
K('sh_oshirabe', 'お{調|しら}べしましょうか。', 'oshirabe shimashō ka', '要幫你查嗎？', 'q');
K('sh_m_nai', 'Mは、ないです。', 'emu wa, nai desu', 'M 號沒有', 'neg');
K('sh_shirabemasu_ka', 'ほかのお{店|みせ}、{調|しら}べますか。', 'hoka no omise, shirabemasu ka', '要查其他店嗎？', 'q');
K('sh_shinjuku_itten', '{新宿店|しんじゅくてん}に{一点|いってん}ございます。', 'Shinjuku-ten ni itten gozaimasu', '新宿店有一件', 'place', '一点＝一件（商品的數法）。');
K('sh_torioki', 'お{取|と}り{置|お}きもできますが、どうされますか。', 'otorioki mo dekimasu ga, dō saremasu ka', '也可以幫你保留，要怎麼做？', 'q', '取り置き＝幫你保留，之後去拿。');
K('sh_shinjuku_aru', '{新宿|しんじゅく}のお{店|みせ}にあります。', 'Shinjuku no omise ni arimasu', '新宿的店有', 'place');
K('sh_tottoku', '{取|と}っておきましょうか。', 'totte okimashō ka', '要幫你留著嗎？', 'q');
K('sh_torioki_onegai', 'じゃあ、{取|と}り{置|お}きお{願|ねが}いします。', 'jā, torioki onegai shimasu', '那麻煩幫我保留', 'ask');
K('sh_kyou_ikimasu', '{今日|きょう}{行|い}きます。', 'kyō ikimasu', '我今天去', 'ask');
K('sh_namae', 'では、お{名前|なまえ}をお{願|ねが}いします。', 'dewa, onamae o onegai shimasu', '那麻煩給我您的名字', 'next');
V('shop', 3, 'sh3a', {who:'店員', note:'沒貨、查分店、保留', setup:'你想要 M 號，但架上只有 L。'}, [
  {id:'n1', t:'say', intent:'問：這件有 M 號嗎？', c:['sumimasen', 'sh_m_arimasuka'], zh:'不好意思，這件有 M 號嗎？', next:'n2'},
  {id:'n2', t:'hear', c:['sh_moushiwake', 'sh_zaiko_nai', 'sh_hoka_tenpo', 'sh_oshirabe'], zh:'非常抱歉，M 號現在沒有庫存。其他分店可能有，要幫你查嗎？',
    easy:{c:['sh_m_nai', 'sh_shirabemasu_ka'], zh:'M 號沒有。要查其他店嗎？'},
    q:[Q('M 號有嗎？', ['現在沒有', '有', '明天到貨'], 'sh_zaiko_nai', 'sh_m_nai'), Q('店員提議什麼？', ['幫你查其他分店', '寄到你的飯店', '改推薦 L 號'], 'sh_oshirabe', 'sh_shirabemasu_ka')],
    learn:['M 號沒貨', '可以幫查其他分店'], todo:'回答要不要查', next:'n3'},
  {id:'n3', t:'act', q:'你想找 M 號：', o:[
    O(['l_onegai'], '麻煩你。', 'ok', '「お願いします」＝請幫我查。', 'n4'),
    O(['l_daijoubu'], '不用了。', 'ok', '不想跑別家也可以，對話就到這裡。', 'n3e')]},
  {id:'n3e', t:'end', res:'ok', text:'你決定不買了，有禮貌地結束對話。'},
  {id:'n4', t:'hear', c:['sh_shinjuku_itten', 'sh_torioki'], zh:'新宿店有一件。也可以幫你保留，要怎麼做？',
    easy:{c:['sh_shinjuku_aru', 'sh_tottoku'], zh:'新宿的店有。要幫你留著嗎？'},
    q:[Q('哪裡有貨？', ['新宿店', '新橋店', '這家店的倉庫'], 'sh_shinjuku_itten', 'sh_shinjuku_aru'), Q('店員還提議什麼？', ['幫你保留', '幫你寄過去', '打折'], 'sh_torioki', 'sh_tottoku')],
    learn:['新宿店有一件', '可以保留'], todo:'決定要不要保留', next:'n5'},
  {id:'n5', t:'act', q:'你今天會去新宿：', o:[
    O(['sh_torioki_onegai'], '那麻煩幫我保留。', 'ok', '用他的詞「取り置き」回答，最清楚。', 'n6'),
    O(['l_onegai'], '麻煩你。', 'ok', '回答「要」也可以。', 'n6'),
    O(['sh_kyou_ikimasu'], '我今天去。', 'part', '店員大概懂，但他問的是要不要保留。說「お願いします」最清楚。', 'n6')]},
  {id:'n6', t:'hear', c:['sh_namae'], zh:'那麻煩給我您的名字。', q:[Q('他要什麼？', ['你的名字', '你的電話', '你的護照'], 'sh_namae')], learn:['保留要留名字'], todo:'說名字', next:'n7'},
  {id:'n7', t:'end', res:'ok', text:'你留了名字，晚上在新宿店拿到 M 號。'}]);

K('sh_facecover', 'こちら、フェイスカバーです。', 'kochira, feisu kabā desu', '這是防妝套', 'topic', 'フェイスカバー：試穿上衣時套在臉上，避免化妝品沾到衣服。');
K('sh_ue_kiru', '{上|うえ}の{服|ふく}を{着|き}る{時|とき}に、', 'ue no fuku o kiru toki ni,', '穿上衣的時候', 'time');
K('sh_kabutte', 'かぶってください。', 'kabutte kudasai', '請套上', 'advice');
K('sh_kao_kabutte', '{上|うえ}を{着|き}る{時|とき}、{顔|かお}にかぶってください。', 'ue o kiru toki, kao ni kabutte kudasai', '穿上衣時，套在臉上', 'time');
K('sh_owarimashitara', '{終|お}わりましたら、お{声|こえ}がけください。', 'owarimashitara, okoegake kudasai', '試好了請叫我', 'next', 'お声がけ＝叫一聲。');
K('sh_owattara', '{終|お}わったら、{呼|よ}んでください。', 'owattara, yonde kudasai', '好了請叫我', 'next');
K('sh_owarimashita', 'すみません、{終|お}わりました。', 'sumimasen, owarimashita', '不好意思，我試好了', 'ask');
V('shop', 3, 'sh3t', {who:'店員', tr:true, note:'換說法：防妝套、叫店員', setup:'你拿了一件毛衣要試穿。'}, [
  {id:'n1', t:'say', intent:'問：可以試穿嗎？', c:['sumimasen', 'sh_shichaku_ii'], zh:'不好意思，可以試穿嗎？', next:'n2'},
  {id:'n2', t:'hear', c:['sh_facecover', 'sh_ue_kiru', 'sh_kabutte', 'sh_owarimashitara'], zh:'這是防妝套，穿上衣的時候請套上。試好了請叫我。',
    easy:{c:['sh_kao_kabutte', 'sh_owattara'], zh:'穿上衣時，套在臉上。好了請叫我。'},
    q:[Q('這個套子什麼時候用？', ['穿上衣的時候', '脫鞋的時候', '付錢的時候'], 'sh_ue_kiru', 'sh_kao_kabutte'), Q('試好了要做什麼？', ['叫店員', '直接拿去結帳', '放回架上'], 'sh_owarimashitara', 'sh_owattara')],
    learn:['穿上衣時套防妝套', '試好叫店員'], todo:'試穿', next:'n3'},
  {id:'n3', t:'act', q:'你要試穿毛衣：', o:[
    O(null, '套上防妝套，再穿毛衣', 'ok', '套在臉上再穿，衣服就不會沾到。', 'n4', {do:'套上防妝套試穿'}),
    O(null, '把防妝套放旁邊，直接穿', 'part', '店員特別給你，就是希望你用。', null, {do:'不用防妝套'})]},
  {id:'n4', t:'act', q:'試好了，叫店員：', o:[
    O(['sh_owarimashita'], '不好意思，我試好了。', 'ok', '拉開布簾說這句就好。', 'n5'),
    O(null, '直接把衣服拿去收銀台', 'part', '可以，但店員說了「試好請叫我」，他可能在等你。', 'n5', {do:'直接去收銀台'})]},
  {id:'n5', t:'hear', c:['sh_size_ikaga'], zh:'尺寸如何？', q:[Q('店員在問什麼？', ['尺寸合不合', '要不要買', '顏色如何'], 'sh_size_ikaga')], learn:['問尺寸'], todo:'說合不合', next:'n6'},
  {id:'n6', t:'act', q:'剛剛好：', o:[
    O(['sh_chodo_ii'], '剛剛好。', 'ok', '很清楚。', 'n7'),
    O(['sh_chotto_ookii'], '有點大。', 'part', '其實剛好。這樣他會去拿小一號的。', null)]},
  {id:'n7', t:'end', res:'ok', text:'毛衣剛剛好，你拿去結帳。'}]);
