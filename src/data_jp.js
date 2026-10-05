/* ===== Japanese: 積木 (building blocks) =====
   Each block has a ROLE. Sentences = fixed skeleton + swappable blocks. */
const ROLES = {
  purpose:{n:'目的', d:'你為什麼來、要做什麼'},
  place:{n:'地點', d:'哪裡'},
  thing:{n:'物品・事情', d:'要的東西、問的東西'},
  num:{n:'數量・時間', d:'幾天、幾位'},
  way:{n:'方式', d:'用什麼方法（付款）'},
  qual:{n:'描述', d:'形容後面那個東西，放在它前面'},
  pt:{n:'助詞', d:'黏在前一塊後面，決定那塊「扮演什麼角色」'},
  end:{n:'句尾・動作', d:'永遠在最後：來了、有嗎、請給我…'},
  reply:{n:'回應', d:'是／不是'},
};
// id: [日文, 羅馬拼音, 中文, role]
const B = {
  kankou:['観光','kankō','觀光','purpose'], ryokou:['旅行','ryokō','旅行','purpose'], shigoto:['仕事','shigoto','工作','purpose'], kaimono:['買い物','kaimono','購物','purpose'],
  tokyo:['東京','Tōkyō','東京','place'], osaka:['大阪','Ōsaka','大阪','place'], kyoto:['京都','Kyōto','京都','place'], akiba:['秋葉原','Akihabara','秋葉原','place'], shinjuku:['新宿','Shinjuku','新宿','place'],
  shinjukuhotel:['新宿のホテル','Shinjuku no hoteru','新宿的飯店','place'], hotel:['ホテル','hoteru','飯店','place'], tomoie:['友達の家','tomodachi no ie','朋友家','place'],
  eki:['駅','eki','車站','place'], tokyoeki:['東京駅','Tōkyō-eki','東京車站','place'], toire:['トイレ','toire','廁所','place'], kaisatsu:['改札','kaisatsu','剪票口','place'], deguchi:['出口','deguchi','出口','place'], konbini:['コンビニ','konbini','便利商店','place'],
  taiwan:['台湾','Taiwan','台灣','place'], taichu:['台中','Taichū','台中','place'], taipei:['台北','Taipei','台北','place'],
  d3:['三日間','mikkakan','3 天','num'], d5:['五日間','itsukakan','5 天','num'], w1:['一週間','isshūkan','1 週','num'], d10:['十日間','tōkakan','10 天','num'],
  p1:['一人','hitori','1 位','num'], p2:['二人','futari','2 位','num'], p3:['三人','sannin','3 位','num'],
  kore:['これ','kore','這個','thing'], fukuro:['袋','fukuro','袋子','thing'], mizu:['水','mizu','水','thing'], menu:['メニュー','menyū','菜單','thing'], receipt:['レシート','reshīto','收據','thing'], chizu:['地図','chizu','地圖','thing'], wifi:['Wi-Fi','wai-fai','Wi-Fi','thing'],
  checkin:['チェックイン','chekku-in','入住手續','thing'], checkout:['チェックアウト','chekku-auto','退房','thing'], okaikei:['お会計','o-kaikei','結帳','thing'],
  iyahon:['イヤホン','iyahon','耳機','thing'], chuko:['中古','chūko','二手品','thing'], shinpin:['新品','shinpin','全新品','thing'], zaiko:['在庫','zaiko','庫存','thing'], shichou:['試聴','shichō','試聽','thing'], menzei:['免税','menzei','免稅','thing'],
  ramen:['ラーメン','rāmen','拉麵','thing'], ongaku:['日本の音楽','Nihon no ongaku','日本的音樂','thing'], kippu:['切符','kippu','車票','thing'],
  card:['カード','kādo','信用卡','way'], genkin:['現金','genkin','現金','way'], suica:['Suica','suika','Suica 交通卡','way'],
  yusen:['有線の','yūsen no','有線的','qual'], wireless:['ワイヤレスの','waiyaresu no','無線的','qual'], teion:['低音が強い','teion ga tsuyoi','低音很強的','qual'],
  ni:['に','ni','に','pt'], de:['で','de','で','pt'], wo:['を','o','を','pt'], wa:['は','wa','は','pt'], ga:['が','ga','が','pt'], kara:['から','kara','から','pt'], made:['まで','made','まで','pt'],
  kimashita:['来ました','kimashita','來了','end'], taizai:['滞在します','taizai shimasu','停留','end'], tomarimasu:['泊まります','tomarimasu','住宿（過夜）','end'],
  arimasuka:['ありますか','arimasu ka','有嗎？','end'], arimasen:['ありません','arimasen','沒有','end'], kudasai:['ください','kudasai','請給我','end'], onegai:['お願いします','onegai shimasu','麻煩你','end'],
  dokodesuka:['どこですか','doko desu ka','在哪裡？','end'], ikura:['いくらですか','ikura desu ka','多少錢？','end'], sagashite:['探しています','sagashite imasu','正在找','end'],
  dekimasuka:['できますか','dekimasu ka','可以嗎？','end'], ikitai:['行きたいです','ikitai desu','想去','end'], sunde:['住んでいます','sunde imasu','住在（居住）','end'], suki:['好きです','suki desu','喜歡','end'], desu:['です','desu','是','end'],
  arigatou:['ありがとうございます','arigatō gozaimasu','謝謝','end'],
  iie:['いいえ','iie','不／沒有','reply'], hai:['はい','hai','是／好','reply'], douzo:['どうぞ','dōzo','請（遞東西時）','reply'],
};

/* Particle logic: 助詞 = the glue that tells you each block's job */
const PT_RULE = {
  ni:'に＝箭頭，指向「目的地」或「待在哪」：去到哪、住在哪。',
  de:'で＝「用什麼／因為什麼」：方式、理由（観光で、カードで）。',
  wo:'を＝「動作的對象」：要什麼、找什麼、麻煩什麼。',
  wa:'は＝「話題標籤」：說到 X 呢……（X は ありますか／どこですか）。',
  ga:'が＝「好き（喜歡）」「強い（很強）」這類狀態的主角。',
  kara:'から＝「從」哪裡。',
  made:'まで＝「到」哪裡為止。',
};
const PT_EXAMPLES = [
  {t:'只換一塊助詞，意思就變', rows:[['tokyo','ni','kimashita'],['kankou','de','kimashita'],['taiwan','kara','kimashita']]},
  {t:'で 都是「用什麼」', rows:[['kankou','de','kimashita'],['card','de','onegai']]},
  {t:'は 開頭的萬用問句：只換最後一塊', rows:[['wifi','wa','arimasuka'],['toire','wa','dokodesuka'],['kore','wa','ikura']]},
  {t:'を 後面接「動作」', rows:[['kore','wo','kudasai'],['checkin','wo','onegai'],['iyahon','wo','sagashite']]},
];

/* Patterns = skeleton + slots.  zh uses {0},{1} for slot blocks. alt = particles that would also be correct (never used as distractors) */
const PAT = [
  {id:'purpose', name:'〔目的〕で来ました', zh:'我是來{0}的', parts:[{slot:'purpose',opt:['kankou','ryokou','shigoto','kaimono']},'de','kimashita'], alt:['ni'], scene:'immig',
    note:'入境時被問目的就用這句。で＝「為了／因為什麼」。說 観光に来ました 也對。'},
  {id:'stay', name:'〔天數〕滞在します', zh:'我會停留{0}', parts:[{slot:'num',opt:['d3','d5','w1','d10']},'taizai'], scene:'immig',
    note:'數量直接放在動作前面，中間不用助詞。〜日間＝「…天的期間」。'},
  {id:'hotel', name:'〔住的地方〕に泊まります', zh:'我住在{0}（過夜）', parts:[{slot:'place',opt:['shinjukuhotel','hotel','tomoie']},'ni','tomarimasu'], scene:'immig',
    note:'に 指向「住在哪」。泊まります＝旅行時過夜。'},
  {id:'onegai', name:'〔東西〕をお願いします', zh:'麻煩你，{0}', parts:[{slot:'thing',opt:['checkin','checkout','okaikei','fukuro','kore']},'wo','onegai'], scene:'hotel',
    note:'お願いします 比 ください 更萬用：東西、服務（入住、結帳）都能用。'},
  {id:'aru', name:'〔東西〕はありますか', zh:'有{0}嗎？', parts:[{slot:'thing',opt:['wifi','chizu','chuko','shinpin','zaiko','menu']},'wa','arimasuka'], scene:'hotel',
    note:'は 把「要問的東西」變成話題；ありますか＝有嗎。旅行最萬用的問句之一。'},
  {id:'kudasai', name:'〔東西〕をください', zh:'請給我{0}', parts:[{slot:'thing',opt:['kore','mizu','menu','receipt','fukuro','kippu']},'wo','kudasai'], scene:'konbini',
    note:'を 指「要的東西」。ください＝請給我。'},
  {id:'way', name:'〔付款方式〕でお願いします', zh:'用{0}付款', parts:[{slot:'way',opt:['card','genkin','suica']},'de','onegai'], scene:'konbini',
    note:'で＝用什麼方式。和「観光で来ました」的 で 是同一條規則。'},
  {id:'sagasu', name:'〔描述〕〔東西〕を探しています', zh:'我在找{0}{1}', parts:[{slot:'qual',opt:['yusen','wireless','teion']},{slot:'thing',opt:['iyahon']},'wo','sagashite'], scene:'ear',
    note:'描述放在東西「前面」：有線の＋イヤホン。探しています＝正在找。'},
  {id:'dekiru', name:'〔服務〕はできますか', zh:'可以{0}嗎？', parts:[{slot:'thing',opt:['shichou','menzei','checkin']},'wa','dekimasuka'], scene:'ear',
    note:'できますか＝可以做嗎。試聴・免税 都能套。'},
  {id:'ikura', name:'〔東西〕はいくらですか', zh:'{0}多少錢？', parts:[{slot:'thing',opt:['kore','chuko','shinpin','kippu']},'wa','ikura'], scene:'ear',
    note:'和「はありますか」同一個骨架，只換最後一塊。'},
  {id:'ninzu', name:'〔人數〕です', zh:'{0}', parts:[{slot:'num',opt:['p1','p2','p3']},'desu'], scene:'food',
    note:'餐廳問幾位時，人數＋です 就好。'},
  {id:'doko', name:'〔地點〕はどこですか', zh:'{0}在哪裡？', parts:[{slot:'place',opt:['toire','eki','kaisatsu','deguchi','konbini','tokyoeki']},'wa','dokodesuka'], scene:'station',
    note:'問路萬用句：地點＋は＋どこですか。'},
  {id:'ikitai', name:'〔地點〕まで行きたいです', zh:'我想到{0}', parts:[{slot:'place',opt:['tokyoeki','akiba','shinjuku','kyoto']},'made','ikitai'], alt:['ni'], scene:'station',
    note:'まで＝到哪裡為止。說 に行きたいです 也對。'},
  {id:'from', name:'〔地方〕から来ました', zh:'我從{0}來', parts:[{slot:'place',opt:['taiwan','taichu','taipei']},'kara','kimashita'], scene:'self',
    note:'から＝從。和「で来ました（目的）」只差一塊助詞，意思完全不同。'},
  {id:'live', name:'〔地方〕に住んでいます', zh:'我住在{0}', parts:[{slot:'place',opt:['taichu','taiwan','taipei']},'ni','sunde'], scene:'self',
    note:'住んでいます＝長期居住；泊まります＝旅行過夜。前面都用 に。'},
  {id:'suki', name:'〔東西〕が好きです', zh:'我喜歡{0}', parts:[{slot:'thing',opt:['ramen','ongaku','iyahon']},'ga','suki'], scene:'self',
    note:'好き 前面用 が，不是 を。這是固定規則。'},
];

/* Real situations. Each step: someone says something → you build the answer from blocks. */
const SCENES = [
  {id:'immig', name:'入境審查', sub:'機場・入境櫃台', steps:[
    {who:'審查官', jp:'入国の目的は何ですか？', ro:'Nyūkoku no mokuteki wa nan desu ka?', zh:'入境的目的是什麼？', task:'回答：我是來觀光的', ans:[['kankou','de','kimashita'],['kankou','ni','kimashita']], tray:['kankou','de','kimashita','wo','tokyo'], pat:'purpose'},
    {who:'審查官', jp:'何日間滞在しますか？', ro:'Nan-nichikan taizai shimasu ka?', zh:'要停留幾天？', task:'回答：停留 5 天', ans:[['d5','taizai']], tray:['d5','taizai','d3','tomarimasu'], pat:'stay', tip:'問句最後的「滞在します」可以直接拿來回答，只要換掉「何日間（幾天）」這塊。'},
    {who:'審查官', jp:'どこに泊まりますか？', ro:'Doko ni tomarimasu ka?', zh:'住在哪裡？', task:'回答：住在新宿的飯店', ans:[['shinjukuhotel','ni','tomarimasu']], tray:['shinjukuhotel','ni','tomarimasu','de','taizai'], pat:'hotel', tip:'問句是「どこ（哪裡）に泊まりますか」。把「どこ」換成你的地點，其他照抄。'},
    {who:'海關人員', jp:'申告するものはありますか？', ro:'Shinkoku suru mono wa arimasu ka?', zh:'有要申報的東西嗎？', task:'回答：沒有', ans:[['iie','arimasen']], tray:['iie','arimasen','hai','arimasuka']},
  ]},
  {id:'hotel', name:'飯店', sub:'櫃台・入住／退房', steps:[
    {who:'櫃台', jp:'いらっしゃいませ。', ro:'Irasshaimase.', zh:'歡迎光臨。', task:'說：我要辦入住', ans:[['checkin','wo','onegai']], tray:['checkin','wo','onegai','checkout','wa'], pat:'onegai'},
    {who:'櫃台', jp:'パスポートをお願いします。', ro:'Pasupōto o onegai shimasu.', zh:'麻煩給我護照。', task:'遞出護照，說：好的，請', ans:[['hai','douzo']], tray:['hai','douzo','iie','arimasen'], tip:'他剛剛用的就是「〔東西〕をお願いします」這個骨架。'},
    {who:'你想問', jp:'（房間有網路嗎？）', ro:'', zh:'', task:'問：有 Wi-Fi 嗎？', ans:[['wifi','wa','arimasuka']], tray:['wifi','wa','arimasuka','wo','kudasai'], pat:'aru'},
    {who:'隔天早上', jp:'おはようございます。', ro:'Ohayō gozaimasu.', zh:'早安。', task:'說：我要退房', ans:[['checkout','wo','onegai']], tray:['checkout','wo','onegai','checkin','ni'], pat:'onegai'},
  ]},
  {id:'konbini', name:'便利商店', sub:'結帳櫃台', steps:[
    {who:'店員', jp:'袋はご利用ですか？', ro:'Fukuro wa go-riyō desu ka?', zh:'需要袋子嗎？', task:'回答：要袋子，麻煩你', ans:[['fukuro','wo','onegai']], tray:['fukuro','wo','onegai','wa','mizu'], pat:'onegai'},
    {who:'店員', jp:'お支払いは？', ro:'O-shiharai wa?', zh:'怎麼付款？', task:'回答：用信用卡', ans:[['card','de','onegai']], tray:['card','de','onegai','wo','genkin'], pat:'way'},
    {who:'你想要', jp:'（收據）', ro:'', zh:'', task:'說：請給我收據', ans:[['receipt','wo','kudasai']], tray:['receipt','wo','kudasai','wa','ni'], pat:'kudasai'},
  ]},
  {id:'ear', name:'耳機店', sub:'e☆イヤホン・秋葉原', steps:[
    {who:'店員', jp:'いらっしゃいませ。何かお探しですか？', ro:'Irasshaimase. Nanika o-sagashi desu ka?', zh:'歡迎光臨。在找什麼嗎？', task:'說：我在找有線耳機', ans:[['yusen','iyahon','wo','sagashite']], tray:['yusen','iyahon','wo','sagashite','wireless','ga'], pat:'sagasu', tip:'他問「お探しですか（在找嗎）」，你回「探しています（正在找）」——同一個動詞。'},
    {who:'你再問', jp:'（想要低音強的）', ro:'', zh:'', task:'問：有低音很強的耳機嗎？', ans:[['teion','iyahon','wa','arimasuka']], tray:['teion','iyahon','wa','arimasuka','wo','yusen'], pat:'aru'},
    {who:'店員', jp:'こちらはいかがですか？', ro:'Kochira wa ikaga desu ka?', zh:'這款您覺得如何？', task:'問：可以試聽嗎？', ans:[['shichou','wa','dekimasuka']], tray:['shichou','wa','dekimasuka','wo','menzei'], pat:'dekiru'},
    {who:'店員', jp:'はい、どうぞ。', ro:'Hai, dōzo.', zh:'可以，請。', task:'聽完後問：這個多少錢？', ans:[['kore','wa','ikura']], tray:['kore','wa','ikura','wo','arimasuka'], pat:'ikura'},
    {who:'店員', jp:'新品は三万円です。', ro:'Shinpin wa san-man en desu.', zh:'全新品是三萬日圓。', task:'問：有二手的嗎？', ans:[['chuko','wa','arimasuka']], tray:['chuko','wa','arimasuka','shinpin','wo'], pat:'aru', tip:'他說「新品は…」，你只要把「新品」換成「中古」，再接「ありますか」。'},
    {who:'決定了', jp:'（買這個）', ro:'', zh:'', task:'說：我要這個（請給我這個）', ans:[['kore','wo','kudasai']], tray:['kore','wo','kudasai','wa','ikura'], pat:'kudasai'},
  ]},
  {id:'food', name:'餐廳', sub:'點餐・結帳', steps:[
    {who:'店員', jp:'何名様ですか？', ro:'Nan-mei-sama desu ka?', zh:'請問幾位？', task:'回答：2 位', ans:[['p2','desu']], tray:['p2','desu','p3','wo'], pat:'ninzu'},
    {who:'你想要', jp:'（菜單）', ro:'', zh:'', task:'說：請給我菜單', ans:[['menu','wo','kudasai']], tray:['menu','wo','kudasai','wa','ni'], pat:'kudasai'},
    {who:'店員', jp:'ご注文はお決まりですか？', ro:'Go-chūmon wa o-kimari desu ka?', zh:'決定好要點什麼了嗎？', task:'指著菜單說：麻煩你，這個', ans:[['kore','wo','onegai']], tray:['kore','wo','onegai','wa','dokodesuka'], pat:'onegai'},
    {who:'吃完了', jp:'（要結帳）', ro:'', zh:'', task:'說：麻煩結帳', ans:[['okaikei','wo','onegai']], tray:['okaikei','wo','onegai','ni','card'], pat:'onegai'},
  ]},
  {id:'station', name:'車站・問路', sub:'JR 車站', steps:[
    {who:'你問站員', jp:'すみません。', ro:'Sumimasen.', zh:'不好意思。', task:'問：剪票口在哪裡？', ans:[['kaisatsu','wa','dokodesuka']], tray:['kaisatsu','wa','dokodesuka','wo','deguchi'], pat:'doko'},
    {who:'站員', jp:'どちらまでですか？', ro:'Dochira made desu ka?', zh:'您要到哪裡？', task:'回答：我想到東京車站', ans:[['tokyoeki','made','ikitai'],['tokyoeki','ni','ikitai']], tray:['tokyoeki','made','ikitai','kara','wo'], pat:'ikitai', tip:'他問「どちらまで（到哪裡）」，你回「〇〇まで」——同一塊助詞。'},
    {who:'站員', jp:'三番線です。', ro:'San-bansen desu.', zh:'在 3 號月台。', task:'說：謝謝', ans:[['arigatou']], tray:['arigatou','iie','kudasai']},
  ]},
  {id:'self', name:'聊天・自我介紹', sub:'和日本人簡單聊', steps:[
    {who:'對方', jp:'どこから来ましたか？', ro:'Doko kara kimashita ka?', zh:'你從哪裡來？', task:'回答：我從台灣來', ans:[['taiwan','kara','kimashita']], tray:['taiwan','kara','kimashita','de','ni'], pat:'from', tip:'問句「どこ から 来ましたか」→ 把「どこ」換成「台湾」，去掉最後的「か」。'},
    {who:'對方', jp:'台湾のどこですか？', ro:'Taiwan no doko desu ka?', zh:'台灣的哪裡？', task:'回答：我住在台中', ans:[['taichu','ni','sunde']], tray:['taichu','ni','sunde','tomarimasu','de'], pat:'live'},
    {who:'對方', jp:'日本は好きですか？', ro:'Nihon wa suki desu ka?', zh:'喜歡日本嗎？', task:'回答：我喜歡日本的音樂', ans:[['ongaku','ga','suki']], tray:['ongaku','ga','suki','wo','ramen'], pat:'suki'},
  ]},
];
