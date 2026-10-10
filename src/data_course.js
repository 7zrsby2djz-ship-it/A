/* 便利商店試點：教學與驗收各自選題，驗收句不流入一般推薦與句塊例句。 */
const STORE_COURSE = {
  id:'store-v1', title:'一個人完成便利商店結帳',
  lessons:[
    {id:'notice',name:'聽出店員在問什麼',goal:'分辨袋子、加熱與付款問題',minutes:3,vid:'sc-notice',clips:['cv_fukuro_goriyou','cv_atatame_masuka','cv_shiharai']},
    {id:'needs',name:'把自己的需要說清楚',goal:'明確說出要／不要；兩件事分開回答',minutes:4,vid:'sc-needs',clips:['sc_bag_no','sc_bag_yes','sc_heat_yes','sc_heat_no','cv_hashi_onegai']},
    {id:'pay',name:'選付款方式並完成操作',goal:'用 Suica 付款，聽出感應與畫面操作',minutes:4,vid:'sc-pay',clips:['cv_shiharai','cv_suica_de','cv_kazashite']},
    {id:'check',name:'換一家店，再試一次',goal:'第一次遇到新說法；隔 24 小時與 7 天再驗收',minutes:4}
  ],
  stages:[{id:'new',name:'首次新題',delay:0},{id:'day',name:'24 小時後',delay:86400000},{id:'week',name:'7 天後',delay:604800000}],
  selfChecks:['不看參考句，也能說出袋子不要、加熱要','回答時有說清楚是哪一樣東西','不確定時，能請對方慢一點或再說一次'],
  forms:{new:[],day:[],week:[]}
};
const STORE_META = {
  cv_fukuro_goriyou:{register:'店員的禮貌問法',production:'先學聽懂；旅客回答需要即可',context:'收銀台：是否購買袋子',note:'りよう 的長音要留住；袋子費用與流程以現場為準。'},
  cv_atatame_masuka:{register:'禮貌問句',production:'旅客可用「温めてください」提出需要',context:'食品：要不要加熱'},
  cv_shiharai:{register:'店員的敬語問法',production:'先學聽懂；旅客回答工具＋で',context:'詢問付款方式',note:'お支払い／どうされますか 是服務場合的問法，不必照搬成旅客回答。'},
  cv_fukuro_iranai:{register:'です 體',production:'對店員可以說；也可說「袋はいりません」',context:'明確拒絕袋子'},
  cv_atatame_onegai:{register:'禮貌請求',production:'對店員可以說',context:'要求加熱'},
  cv_hashi_onegai:{register:'禮貌請求',production:'對店員可以說',context:'要求筷子'},
  cv_suica_de:{register:'服務場合的簡短回答',production:'對店員可以說；完整可說「Suicaでお願いします」',context:'付款工具',note:'で 在這裡標記付款工具，與「観光で来ました」的目的／緣由不同。'},
  cv_kazashite:{register:'禮貌指示',production:'先學聽懂與操作',context:'把卡或手機靠近指定感應器'},
  l_daijoubu:{register:'です 體，意思依情境',production:'能用，但需要清楚表達時請說具體需求',context:'提供東西時常是婉拒；確認狀態時可表示沒事'}
};
for(const [id,meta] of Object.entries(STORE_META)) {
  const k=CK[id]; if(!k)throw Error('store metadata: '+id);
  const {note,...fields}=meta;Object.assign(k,fields);if(note)k.note=(k.note?k.note+' ':'')+note;
}

function storeHear(id,c,q,o,next,skill,learn) {
  return {id,t:'hear',c,zh:c.map(x=>CK[x].zh).join('；'),q:[Q(q,o,c[0])],next,skill,learn:learn?[learn]:[]};
}
function storeAct(id,q,correct,wrong,next,skill) {
  return {id,t:'act',q,skill,o:[
    O(correct,correct.map(x=>CK[x].zh).join('；'),'ok','這樣符合你的需要。',next),
    O(wrong,wrong.map(x=>CK[x].zh).join('；'),'part','這個回答不符合任務上的需要。把物品與要／不要說清楚再試。',null)
  ]};
}
V('conv',1,'sc-notice',{who:'店員',courseOnly:true,note:'第一課・聽辨問題'},[
  storeHear('bag',['cv_fukuro_goriyou'],'現在要決定哪件事？',['要不要袋子','便當要不要加熱','用什麼付款'],'heat','question','店員問袋子'),
  storeHear('heat',['cv_atatame_masuka'],'現在要決定哪件事？',['便當要不要加熱','要不要筷子','用什麼付款'],'pay','question','店員問加熱'),
  storeHear('pay',['cv_shiharai'],'接下來應該告訴店員什麼？',['付款方式','需要幾根筷子','要不要袋子'],'end','payment','店員問付款方式'),
  {id:'end',t:'end',res:'ok',text:'你分辨了三種問題。下一課練習把自己的需要說清楚。'}
]);
V('conv',2,'sc-needs',{who:'店員',courseOnly:true,note:'第二課・自己的需要',setup:'你有購物袋，要熱便當和筷子。這些是你的固定需要。'},[
  storeHear('ask',['cv_fukuro_hashi'],'店員一次問哪兩樣？',['袋子和筷子','加熱和付款','筷子和付款'],'answer','question','問袋子和筷子'),
  storeAct('answer','袋子不用，筷子要。請分開回答。',['cv_fukuro_iranai','cv_hashi_onegai'],['l_onegai'],'heat','needs'),
  storeHear('heat',['cv_atatame_masuka'],'要做什麼決定？',['便當是否加熱','付款方式','筷子數量'],'reply','question','問便當加熱'),
  storeAct('reply','你想吃熱的便當。',['cv_atatame_onegai'],['l_daijoubu'],'end','needs'),
  {id:'end',t:'end',res:'ok',text:'袋子不用、筷子要、便當要熱。你練習了明確表達自己的需要。'}
]);
V('conv',3,'sc-pay',{who:'店員',courseOnly:true,note:'第三課・付款操作',setup:'你要用 Suica 付款。請聽指示，再選擇正確操作。'},[
  storeHear('pay',['cv_shiharai'],'接下來先告訴店員什麼？',['用什麼付款','便當是否加熱','有沒有自己的袋子'],'reply','payment','詢問付款方式'),
  storeAct('reply','你要用 Suica 付款。',['cv_suica_de'],['cv_genkin_de'],'tap','payment'),
  storeHear('tap',['cv_kazashite'],'聽完指示，哪個動作正確？',['把卡靠近指定感應器','把卡插進去','把卡交給店員'],'screen','action','在指定位置感應'),
  storeHear('screen',['cv_shiharai_gamen'],'換一台收銀機，付款方式在哪裡選？',['在店員指的畫面上選','只跟店員說','在手機通訊錄選'],'end','action','在畫面上選付款方式'),
  {id:'end',t:'end',res:'ok',text:'你練習了付款工具＋で、感應指示與畫面操作。'}
]);

/* 保留句不在教學出現。每階段 6 個任務組合；見過的題只算複習。合成聲不模擬真人口音。 */
const STORE_EXAM_LINES = [
  ['new','{袋|ふくろ}はお{付|つ}けしますか。','fukuro wa otsuke shimasu ka','袋子要附嗎？',
    'こちらのお{弁当|べんとう}、{温|あたた}めてもよろしいですか。','kochira no obentō, atatamete mo yoroshii desu ka','這個便當可以幫您加熱嗎？',
    'お{支払|しはら}いは、こちらにかざしてください。','oshiharai wa, kochira ni kazashite kudasai','付款請在這裡感應。'],
  ['day','レジ{袋|ぶくろ}は{必要|ひつよう}ですか。','reji-bukuro wa hitsuyō desu ka','需要購物袋嗎？',
    'お{弁当|べんとう}は、{温|あたた}めてお{渡|わた}ししますか。','obentō wa, atatamete owatashi shimasu ka','便當要加熱後再給您嗎？',
    'こちらの{画面|がめん}で、お{支払|しはら}い{方法|ほうほう}を{選|えら}んでください。','kochira no gamen de, oshiharai hōhō o erande kudasai','請在這個畫面上選付款方式。'],
  ['week','お{買|か}い{物|もの}{袋|ぶくろ}はいかがですか。','okaimono-bukuro wa ikaga desu ka','購物袋要嗎？',
    'こちら、{温|あたた}めてよろしいですか。','kochira, atatamete yoroshii desu ka','這個可以幫您加熱嗎？',
    'お{支払|しはら}いの{前|まえ}に、{画面|がめん}で{方法|ほうほう}を{選|えら}んでください。','oshiharai no mae ni, gamen de hōhō o erande kudasai','付款前請先在畫面選方式。']
];
/* 每個組合至少有一段從未教過的操作指示，避免只換需求卻冒充新說法。 */
const STORE_ACTION_FORMS = {
  new:[
    ['お{支払|しはら}いは、こちらにかざしてください。','oshiharai wa, kochira ni kazashite kudasai','付款請在這裡感應。','tap'],
    ['カードをこちらの{読|よ}み{取|と}り{機|き}にかざしてください。','kādo o kochira no yomitoriki ni kazashite kudasai','請把卡靠近這台感應器。','tap'],
    ['この{印|しるし}のところに、カードをかざしてください。','kono shirushi no tokoro ni, kādo o kazashite kudasai','請把卡靠近有這個標記的地方。','tap'],
    ['{先|さき}に{画面|がめん}で、お{支払|しはら}い{方法|ほうほう}を{選|えら}んでください。','saki ni gamen de, oshiharai hōhō o erande kudasai','請先在畫面選付款方式。','screen'],
    ['こちらの{画面|がめん}を{見|み}て、お{支払|しはら}い{方法|ほうほう}を{選|えら}んでください。','kochira no gamen o mite, oshiharai hōhō o erande kudasai','請看這個畫面，選付款方式。','screen'],
    ['お{支払|しはら}い{方法|ほうほう}はこちらの{画面|がめん}で{選|えら}べます。','oshiharai hōhō wa kochira no gamen de erabemasu','付款方式可以在這個畫面選。','screen']
  ],
  day:[
    ['こちらの{画面|がめん}で、お{支払|しはら}い{方法|ほうほう}を{選|えら}んでください。','kochira no gamen de, oshiharai hōhō o erande kudasai','請在這個畫面選付款方式。','screen'],
    ['まず、お{支払|しはら}い{方法|ほうほう}を{画面|がめん}から{選|えら}んでください。','mazu, oshiharai hōhō o gamen kara erande kudasai','首先請從畫面選付款方式。','screen'],
    ['{使|つか}うカードの{種類|しゅるい}を、{画面|がめん}で{選|えら}んでください。','tsukau kādo no shurui o, gamen de erande kudasai','請在畫面選要使用的卡種。','screen'],
    ['カードは、ここにかざしてください。','kādo wa, koko ni kazashite kudasai','卡片請靠近這裡感應。','tap'],
    ['こちらにカードを{当|あ}ててください。','kochira ni kādo o atete kudasai','請把卡放到這裡感應。','tap'],
    ['{読|よ}み{取|と}り{機|き}に、カードを{近|ちか}づけてください。','yomitoriki ni, kādo o chikazukete kudasai','請把卡靠近讀取器。','tap']
  ],
  week:[
    ['お{支払|しはら}いの{前|まえ}に、{画面|がめん}で{方法|ほうほう}を{選|えら}んでください。','oshiharai no mae ni, gamen de hōhō o erande kudasai','付款前請先在畫面選方式。','screen'],
    ['{画面|がめん}のお{支払|しはら}いボタンを{選|えら}んでください。','gamen no oshiharai botan o erande kudasai','請選畫面上的付款按鈕。','screen'],
    ['お{支払|しはら}いの{種類|しゅるい}は、{画面|がめん}で{選|えら}んでいただけますか。','oshiharai no shurui wa, gamen de erande itadakemasu ka','可以請您在畫面選付款種類嗎？','screen'],
    ['{音|おと}が{鳴|な}るまで、カードをここにかざしてください。','oto ga naru made, kādo o koko ni kazashite kudasai','請把卡放在這裡感應到響聲出現。','tap'],
    ['カードを{読|よ}み{取|と}り{機|き}にかざして、{少|すこ}し{待|ま}ってください。','kādo o yomitoriki ni kazashite, sukoshi matte kudasai','請把卡靠近感應器，等一下。','tap'],
    ['ここにカードをかざしていただけますか。','koko ni kādo o kazashite itadakemasu ka','可以請您把卡放在這裡感應嗎？','tap']
  ]
};
K('sc_bag_yes','{袋|ふくろ}をお{願|ねが}いします。','fukuro o onegai shimasu','袋子要，麻煩你','ask');
K('sc_bag_no','{袋|ふくろ}はいりません。','fukuro wa irimasen','袋子不用','neg');
K('sc_heat_yes','{温|あたた}めてください。','atatamete kudasai','請幫我加熱','ask');
K('sc_heat_no','{温|あたた}めなくて{大丈夫|だいじょうぶ}です。','atatamenakute daijōbu desu','不用加熱，沒關係','neg');
['sc_bag_yes','sc_bag_no','sc_heat_yes','sc_heat_no'].forEach(id=>Object.assign(CK[id],{register:'禮貌回答',production:'對店員可以說',context:'把物品與需要一起說清楚'}));
STORE_EXAM_LINES.forEach(([stage,...parts])=>{
  const ids=['bag','heat'].map((s,i)=>{
    const id='sc-ex-'+stage+'-'+s;K(id,parts[i*3],parts[i*3+1],parts[i*3+2],i===2?'next':'q');
    CK[id].assessmentOnly=true;return id;
  });
  for(let i=0;i<6;i++) {
    const [actionJp,actionRo,actionZh,actionType]=STORE_ACTION_FORMS[stage][i],actionId='sc-ex-'+stage+'-action-'+i;
    K(actionId,actionJp,actionRo,actionZh,'next');CK[actionId].assessmentOnly=true;
    const bag=!!(i%2),heat=!!(Math.floor(i/2)%2),pay=i<4?'cv_suica_de':'cv_card_de',id='sc-ex-'+stage+'-'+i;
    const wantBag=bag?'sc_bag_yes':'sc_bag_no',wrongBag=bag?'sc_bag_no':'sc_bag_yes';
    const wantHeat=heat?'sc_heat_yes':'sc_heat_no',wrongHeat=heat?'sc_heat_no':'sc_heat_yes';
    V('conv',3,id,{who:'另一位店員',tr:true,courseOnly:true,assessment:true,stage,
      setup:`你${bag?'沒有袋子，需要買一個':'帶了購物袋，不要袋子'}；便當想吃${heat?'熱':'冷'}的。付款用${pay==='cv_suica_de'?'Suica':'信用卡'}。`},[
      storeHear('bag',[ids[0]],'這一問要確認哪個需要？',['要不要袋子','要不要加熱','付款工具'],'bagReply','question'),
      storeAct('bagReply',`依照你的需要回答：袋子${bag?'要':'不用'}。`,[wantBag],[wrongBag],'heat','needs'),
      storeHear('heat',[ids[1]],'這一問要確認哪件事？',['是否幫便當加熱','是否買袋子','是否買集點卡'],'heatReply','question'),
      storeAct('heatReply',`依照你的需要回答：便當${heat?'要加熱':'不加熱'}。`,[wantHeat],[wrongHeat],'pay','needs'),
      storeAct('pay',`你要用${pay==='cv_suica_de'?'Suica':'信用卡'}。怎麼說？`,[pay],['cv_genkin_de'],'action','payment'),
      storeHear('action',[actionId],'先做哪個動作？',actionType==='tap'?['靠近指定感應器','把卡插進去','先在畫面選方式']:['先在畫面選付款方式','直接靠近感應器','把卡交給店員'],'end','action'),
      {id:'end',t:'end',res:'ok',text:'任務走完了。結果會依播放、首次回答與實際選擇分開記。'}
    ]);
    STORE_COURSE.forms[stage].push(id);
  }
});
