/* ============================================================
   小店遊戲的資料（你是日本小店的店長）
   ------------------------------------------------------------
   - 按鈕上的「店員說的話」和客人的回答，大多直接用對話教材的句塊（CK），所以玩遊戲＝預習對話。
   - 這裡另外補：商品名稱、選項標籤、客人的回答與反應（id 都以 g_ 開頭）。
   - 話題 topic：
       ask   店員說的句子（按鈕）
       kind  yn 問要不要 → 你判斷「要／不要」；pick 問選哪個 → 你選選項；act 說了就好（客人只會回應）
       ans   客人的回答：{值: {e:[簡單說法...], h:[比較難的說法...]}}；每個說法是句塊 id，或句塊 id 陣列
       vol   客人可能主動先說（第 2 天起）
       after 要先處理完哪些話題（只算這位客人有的）
       always 一定要問（yn 的值是「不要」也要問）；沒有 always 的 yn，只有客人「要」的時候才一定要問
       optional 問不問都可以（例如集點卡）；bonus 問了有小費
       remind 漏問就按「謝謝光臨」時，客人會說的話
   ============================================================ */
CAT.item = '物品・選項';

/* ---------- 共用 ---------- */
K('g_arigatou', 'ありがとうございました。', 'arigatō gozaimashita', '謝謝光臨（客人要走時）', 'polite', '送客時用過去式「ございました」。');
K('g_hai_onegai', 'はい、お{願|ねが}いします。', 'hai, onegai shimasu', '好，麻煩你（＝要）', 'concl');
K('g_iranai', 'いらないです。', 'iranai desu', '不需要', 'neg', 'いる＝需要；いらない＝不需要。');
K('g_ii_desu', 'あ、いいです。', 'a, ii desu', '啊，不用了', 'neg', '這裡的「いいです」＝不需要（配合手輕輕揮）。不是「好」。最容易聽反的一句。');
K('g_e', 'え？', 'e?', '欸？（客人不需要這個）', 'filler');
K('g_sakki', 'さっき{言|い}いましたよ。', 'sakki iimashita yo', '剛剛說過了喔', 'filler');
K('g_mada', 'えっと…まだです。', 'etto… mada desu', '呃……還沒（順序不對）', 'filler');
K('g_ano', 'あのー…', 'anō…', '那個……（客人在等你問）', 'filler');
K('g_mou_ii', 'もういいです。', 'mō ii desu', '算了（客人生氣走了）', 'neg');
K('g_genkin', '{現金|げんきん}', 'genkin', '現金', 'item');
K('g_card', 'カード', 'kādo', '信用卡', 'item');
K('g_ic', '{交通系|こうつうけい}IC', 'kōtsūkei aishī', '交通卡（Suica、PASMO 等）', 'item');

/* ---------- 便利商店 ---------- */
K('g_konbini', 'コンビニ', 'konbini', '便利商店', 'item');
K('g_kore_onegai', 'これ、お{願|ねが}いします。', 'kore, onegai shimasu', '這個，麻煩你（結帳）', 'ask');
K('g_bento', 'お{弁当|べんとう}', 'obentō', '便當', 'item');
K('g_onigiri', 'おにぎり', 'onigiri', '飯糰', 'item');
K('g_ocha', 'お{茶|ちゃ}', 'ocha', '茶', 'item');
K('g_beer', 'ビール', 'bīru', '啤酒', 'item');
K('g_cupmen', 'カップ{麺|めん}', 'kappu-men', '杯麵', 'item');
K('g_atatame_nashi', '{温|あたた}めなくていいです。', 'atatamenakute ii desu', '不用加熱', 'neg', '〜なくていいです＝不用〜。');
K('g_sono_mama', 'そのままで。', 'sono mama de', '就這樣（不用加熱）', 'neg', 'そのまま＝保持原樣。');
K('g_hashi_iranai', 'お{箸|はし}はいらないです。', 'ohashi wa iranai desu', '筷子不用', 'neg');
K('g_fukuro_kudasai', '{袋|ふくろ}ください。', 'fukuro kudasai', '請給我袋子', 'ask');
K('g_atatame_hoshii', 'あの、{温|あたた}めてもらえますか。', 'ano, atatamete moraemasu ka', '那個，可以幫我加熱嗎？', 'ask');
K('g_hashi_hoshii', 'あの、お{箸|はし}もらえますか。', 'ano, ohashi moraemasu ka', '那個，可以給我筷子嗎？', 'ask');
K('g_fukuro_wa', 'あの、{袋|ふくろ}は…？', 'ano, fukuro wa…?', '那個，袋子呢……？', 'ask');
K('g_okaikei_wa', 'あの、お{会計|かいけい}は？', 'ano, okaikei wa?', '那個，結帳呢？', 'ask');
K('g_genkin_de_onegai', '{現金|げんきん}でお{願|ねが}いします。', 'genkin de onegai shimasu', '用現金，麻煩你', 'ask');
K('g_card_de_ii', 'カードでいいですか。', 'kādo de ii desu ka', '用卡可以嗎？（＝要刷卡）', 'ask');
K('g_pasmo_de', 'PASMOで。', 'pasumo de', '用 PASMO（東京的交通卡）', 'ask', 'PASMO 和 Suica 一樣是交通系 IC 卡。');

/* ---------- 居酒屋 ---------- */
K('g_izakaya', '{居酒屋|いざかや}', 'izakaya', '居酒屋', 'item');
K('g_hairemasu', 'すみません、{入|はい}れますか。', 'sumimasen, hairemasu ka', '不好意思，可以進去嗎？（有位子嗎）', 'ask');
K('g_p1', '{一人|ひとり}', 'hitori', '一位', 'item');
K('g_p2', '{二人|ふたり}', 'futari', '兩位', 'item');
K('g_p3', '{三人|さんにん}', 'sannin', '三位', 'item');
K('g_hitori_nan', '{一人|ひとり}なんですけど。', 'hitori nan desu kedo', '我一個人……（可以嗎）', 'num');
K('g_futari_desu', '{二人|ふたり}です。', 'futari desu', '兩個人', 'num');
K('g_sannin_desu', '{三人|さんにん}です。', 'sannin desu', '三個人', 'num');
K('g_futari_nan', '{二人|ふたり}なんですけど。', 'futari nan desu kedo', '我們兩個人……', 'num');
K('g_counter_ii', 'カウンターでいいですよ。', 'kauntā de ii desu yo', '吧台就可以', 'concl');
K('g_table_ii', 'テーブルがいいです。', 'tēburu ga ii desu', '想坐桌子', 'neg');
K('g_table_dekireba', 'できれば、テーブルで…。', 'dekireba, tēburu de…', '可以的話，想坐桌子……', 'neg', 'できれば＝可以的話。話沒說完＝客氣地表示「不要吧台」。');
K('g_nama', '{生|なま}ビール', 'nama bīru', '生啤酒', 'item');
K('g_oolong', 'ウーロン{茶|ちゃ}', 'ūron-cha', '烏龍茶', 'item');
K('g_sake', '{日本酒|にほんしゅ}', 'nihonshu', '日本酒', 'item');
K('g_oolong_kudasai', 'ウーロン{茶|ちゃ}ください。', 'ūron-cha kudasai', '請給我烏龍茶', 'ask');
K('g_oolong_de', 'ウーロン{茶|ちゃ}で。', 'ūron-cha de', '烏龍茶', 'ask');
K('g_sake_kudasai', '{日本酒|にほんしゅ}をください。', 'nihonshu o kudasai', '請給我日本酒', 'ask');
K('g_sake_de', '{日本酒|にほんしゅ}で。', 'nihonshu de', '日本酒', 'ask');
K('g_chuu', '{中|ちゅう}', 'chū', '中杯', 'item');
K('g_dai', '{大|だい}', 'dai', '大杯', 'item');
K('g_dai_de', '{大|だい}で。', 'dai de', '大杯', 'ask');
K('g_chuu_onegai', '{中|ちゅう}でお{願|ねが}いします。', 'chū de onegai shimasu', '中杯，麻煩你', 'ask');
K('g_dai_onegai', '{大|だい}でお{願|ねが}いします。', 'dai de onegai shimasu', '大杯，麻煩你', 'ask');

/* ---------- 拉麵店 ---------- */
K('g_ramenya', 'ラーメン{屋|や}', 'rāmen-ya', '拉麵店', 'item');
K('g_hai_douzo', 'はい、どうぞ。', 'hai, dōzo', '好，給你（遞出餐券）', 'polite');
K('g_ramen', 'ラーメン', 'rāmen', '拉麵', 'item');
K('g_miso_ramen', '{味噌|みそ}ラーメン', 'miso rāmen', '味噌拉麵', 'item');
K('g_futsuu', '{普通|ふつう}', 'futsū', '一般', 'item');
K('g_katame', 'かため', 'katame', '硬一點', 'item');
K('g_yawarakame', 'やわらかめ', 'yawarakame', '軟一點', 'item');
K('g_katame_de', 'かためで。', 'katame de', '硬一點', 'ask');
K('g_yawarakame_de', '{麺|めん}やわらかめで。', 'men yawarakame de', '麵軟一點', 'ask');
K('g_yawa_onegai', 'やわらかめでお{願|ねが}いします。', 'yawarakame de onegai shimasu', '軟一點，麻煩你', 'ask');
K('g_rice_kudasai', 'ライスください。', 'raisu kudasai', '請給我白飯', 'ask');

const GSHOP = {
  konbini:{id:'konbini', nm:'g_konbini', zh:'便利商店', task:'conv', need:0, entry:['g_kore_onegai'], greet:'l_irasshai',
    intro:'客人把東西放到櫃台。問他要不要加熱、筷子、袋子，再問怎麼付錢。最後說「ありがとうございました」。',
    items:{bento:{c:'g_bento', yen:550}, onigiri:{c:'g_onigiri', yen:160}, ocha:{c:'g_ocha', yen:150}, beer:{c:'g_beer', yen:280}, cupmen:{c:'g_cupmen', yen:230}},
    topics:[
      {id:'atatame', ask:['cv_atatame_masuka'], kind:'yn', remind:'g_atatame_hoshii',
        ans:{yes:{e:['l_onegai'], h:['cv_atatame_onegai', 'g_hai_onegai']}, no:{e:['l_daijoubu'], h:['g_ii_desu', 'g_sono_mama']}},
        vol:{yes:['cv_atatame_onegai'], no:['g_atatame_nashi']}},
      {id:'hashi', ask:['cv_ohashi'], kind:'yn', remind:'g_hashi_hoshii',
        ans:{yes:{e:['l_onegai'], h:['g_hai_onegai', 'cv_hashi_onegai']}, no:{e:['l_daijoubu'], h:['g_ii_desu', 'g_iranai']}},
        vol:{yes:['cv_hashi_onegai'], no:['g_hashi_iranai']}},
      {id:'fukuro', ask:['cv_fukuro_goriyou'], kind:'yn', always:true, remind:'g_fukuro_wa',
        ans:{yes:{e:['l_onegai'], h:['g_hai_onegai', 'g_fukuro_kudasai']}, no:{e:['l_daijoubu', 'g_iranai'], h:['g_ii_desu', 'cv_fukuro_iranai']}},
        vol:{yes:['g_fukuro_kudasai'], no:['cv_fukuro_iranai']}},
      {id:'point', ask:['cv_point'], kind:'yn', optional:true,
        ans:{no:{e:['cv_nai_desu'], h:['en_motte_nai', 'l_daijoubu']}}},
      {id:'age', ask:['cv_nenrei', 'cv_gamen_touch'], kind:'act', react:{e:['l_hai']}, warn:'買酒一定要先做年齡確認（請客人按畫面）。'},
      {id:'pay', ask:['cv_shiharai'], kind:'pick', always:true, remind:'g_okaikei_wa', opts:{genkin:'g_genkin', card:'g_card', ic:'g_ic'},
        ans:{genkin:{e:['cv_genkin_de'], h:['g_genkin_de_onegai']}, card:{e:['cv_card_de'], h:['g_card_de_ii']}, ic:{e:['cv_suica_de'], h:['g_pasmo_de']}}},
    ]},
  izakaya:{id:'izakaya', nm:'g_izakaya', zh:'居酒屋', task:'izakaya', need:10, entry:['g_hairemasu'], greet:'l_irasshai',
    intro:'客人進門。先問幾位，再問坐吧台可以嗎，接著先點飲料。上お通し（小菜），最後問怎麼付。順序很重要。',
    topics:[
      {id:'nin', ask:['iz_nanmei'], kind:'pick', always:true, remind:'g_ano', opts:{p1:'g_p1', p2:'g_p2', p3:'g_p3'},
        ans:{p1:{e:['iz_hitori_desu'], h:['g_hitori_nan']}, p2:{e:['g_futari_desu'], h:['g_futari_nan']}, p3:{e:['g_sannin_desu'], h:['g_sannin_desu']}},
        vol:{p1:['iz_hitori_desu'], p2:['g_futari_desu']}},
      {id:'seat', ask:['iz_counter_ii'], kind:'yn', always:true, after:['nin'], remind:'g_ano',
        ans:{yes:{e:['iz_hai_daijoubu'], h:['g_counter_ii']}, no:{e:['g_table_ii'], h:['g_table_dekireba']}}},
      {id:'drink', ask:['iz_nomimono_saki'], kind:'pick', always:true, after:['nin', 'seat'], remind:'g_ano', opts:{nama:'g_nama', oolong:'g_oolong', sake:'g_sake'},
        ans:{nama:{e:['iz_nama_hitotsu', 'iz_nama_kudasai'], h:['iz_toriaezu']}, oolong:{e:['g_oolong_kudasai'], h:['g_oolong_de']}, sake:{e:['g_sake_kudasai'], h:['g_sake_de']}}},
      {id:'size', ask:['iz_chuu_dai'], kind:'pick', always:true, after:['drink'], remind:'g_ano', opts:{chuu:'g_chuu', dai:'g_dai'},
        ans:{chuu:{e:['iz_chuu_de'], h:['g_chuu_onegai']}, dai:{e:['g_dai_de'], h:['g_dai_onegai']}}},
      {id:'otooshi', ask:['iz_otooshi'], kind:'act', after:['drink'], remind:'g_ano', react:{e:['arigatou'], h:['iz_tanondenai']}},
      {id:'pay', ask:['cv_shiharai'], kind:'pick', always:true, after:['otooshi'], remind:'g_okaikei_wa', opts:{genkin:'g_genkin', card:'g_card'},
        ans:{genkin:{e:['cv_genkin_de'], h:['iz_jaa_genkin']}, card:{e:['cv_card_de'], h:['iz_card_ii']}}},
    ]},
  ramen:{id:'ramen', nm:'g_ramenya', zh:'拉麵店', task:'menu', need:22, entry:['sumimasen'], greet:'l_irasshai',
    intro:'先請客人買餐券、交給你。再問麵的偏好、要不要免費白飯。告訴客人水是自助的，會多拿小費。',
    items:{ramen:{c:'g_ramen', yen:900}, miso:{c:'g_miso_ramen', yen:1000}},
    topics:[
      {id:'ticket', ask:['mn_shokken_saki'], kind:'act', remind:'g_ano', react:{e:['g_hai_douzo']}, reveal:true},
      {id:'okonomi', ask:['mn_okonomi'], kind:'pick', always:true, after:['ticket'], remind:'g_ano', opts:{futsuu:'g_futsuu', katame:'g_katame', yawa:'g_yawarakame'},
        ans:{futsuu:{e:['mn_zenbu_futsuu'], h:['mn_futsuu_de']}, katame:{e:['mn_katame'], h:['g_katame_de']}, yawa:{e:['g_yawarakame_de'], h:['g_yawa_onegai']}}},
      {id:'rice', ask:['mn_rice_muryou', 'mn_dou_saremasu'], kind:'yn', always:true, after:['ticket'], remind:'g_ano',
        ans:{yes:{e:['l_onegai'], h:['g_hai_onegai', 'g_rice_kudasai']}, no:{e:['l_daijoubu'], h:['g_ii_desu']}}},
      {id:'water', ask:['mn_omizu_self'], kind:'act', optional:true, bonus:true, after:['ticket'], react:{e:['l_hai']}},
    ]},
};
const GSHOP_ORDER = ['konbini', 'izakaya', 'ramen'];

/* 每位客人要什麼（隨機） */
function gmPick(a) { return a[Math.random() * a.length | 0]; }
const GGEN = {
  konbini(lv) {
    const pool = ['bento', 'onigiri', 'ocha', 'beer', 'cupmen'], n = lv < 2 ? 1 + (Math.random() < .4) : 1 + (Math.random() * 3 | 0);
    const items = []; while (items.length < n) { const x = gmPick(pool); if (!items.includes(x)) items.push(x); }
    const has = x => items.includes(x), need = {};
    if (has('bento')) need.atatame = Math.random() < .7 ? 'yes' : 'no';
    if (has('bento') || has('cupmen')) need.hashi = Math.random() < .8 ? 'yes' : 'no';
    need.fukuro = Math.random() < .5 ? 'yes' : 'no';
    need.point = 'no';
    if (has('beer')) need.age = true;
    need.pay = gmPick(['genkin', 'card', 'ic']);
    return {items, need, yen:items.reduce((a, x) => a + GSHOP.konbini.items[x].yen, 0)};
  },
  izakaya(lv) {
    const nin = lv < 2 ? gmPick(['p1', 'p1', 'p2']) : gmPick(['p1', 'p2', 'p3']), need = {nin};
    need.seat = Math.random() < .6 ? 'yes' : 'no';
    need.drink = gmPick(['nama', 'nama', 'oolong', 'sake']);
    if (need.drink === 'nama') need.size = Math.random() < .7 ? 'chuu' : 'dai';
    need.otooshi = true; need.pay = gmPick(['genkin', 'card']);
    return {items:[], need, yen:{p1:1, p2:2, p3:3}[nin] * 2800 + (Math.random() * 6 | 0) * 100};
  },
  ramen(lv) {
    const item = gmPick(['ramen', 'miso']);
    const need = {ticket:true, okonomi:gmPick(['futsuu', 'futsuu', 'katame', 'yawa']), rice:Math.random() < .55 ? 'yes' : 'no', water:true};
    return {items:[item], need, yen:GSHOP.ramen.items[item].yen, hideItems:true};
  },
};
