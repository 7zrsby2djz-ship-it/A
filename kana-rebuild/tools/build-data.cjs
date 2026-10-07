#!/usr/bin/env node
// Rebuild the prepared data only. This does not modify the app, build.sh, or index.html.
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const root = path.resolve(__dirname, '..'), repo = path.resolve(root, '..');
const {words:seeds, rows, visibleWords} = require('../curation.cjs');
const legacyReadings = require('../legacy-readings.cjs');
const {plain, rubyReading, toHiragana, analyzeReading, findKanaSpan} = require('./kana-utils.cjs');
const lock = JSON.parse(fs.readFileSync(path.join(root,'source-lock.json'),'utf8'));
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const read = f => fs.readFileSync(path.join(repo,f),'utf8');
const write = (f,data) => { const p=path.join(root,f); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n'); };
for(const [f,expected] of Object.entries(lock.appFiles)) {
  if(hash(fs.readFileSync(path.join(repo,f)))!==expected) throw Error(`Source changed: ${f}. Review the new source and refresh source-lock.json deliberately.`);
}
const ctx={console}; vm.createContext(ctx);
vm.runInContext(['src/data_jp.js','src/data_tasks.js','src/data_life.js','src/data_game.js'].map(read).join('\n')+'\n;this.snapshot={B,CK,TASKS};',ctx,{timeout:5000});
const {B,CK,TASKS} = ctx.snapshot;
const oral=require(path.join(repo,'listening-jp/src/data.js'));
const chunksCtx={console}; vm.createContext(chunksCtx);
vm.runInContext(read('src/data_tasks.js')+';this.ids=Object.keys(CK);',chunksCtx,{timeout:5000});
const taskIds=new Set(chunksCtx.ids);
vm.runInContext(read('src/data_life.js')+';this.ids=Object.keys(CK);',chunksCtx,{timeout:5000});
const lifeIds=new Set(chunksCtx.ids);
const corpus=[];
const addCorpus=(id,word,reading,romaji,meaningZh,sourcePath,sourceRef,kind,extra={})=>{
  corpus.push({id,word:plain(word),sourceText:word,reading,romaji,meaningZh,kind,
    source:{type:'app_material',repository:lock.appRepository,commit:lock.appCommit,path:sourcePath,ref:sourceRef},
    learningStatus:'not_assessed',...analyzeReading(reading),...extra});
};
for(const [id,x] of Object.entries(B)) {
  if(!legacyReadings[id]) throw Error(`Missing editorial reading for B.${id}`);
  addCorpus('app-b-'+id,x[0],legacyReadings[id],x[1],x[2],'src/data_jp.js','B.'+id,'legacy_block',
    {role:x[3],readingMethod:'editorial_kana',particle:x[3]==='pt',speechOverride:id==='wo'?'お':id==='wa'?'わ':null});
}
for(const [id,c] of Object.entries(CK)) {
  const sourcePath=taskIds.has(id)?'src/data_tasks.js':lifeIds.has(id)?'src/data_life.js':'src/data_game.js';
  addCorpus('app-ck-'+id,c.jp,rubyReading(c.jp),c.ro,c.zh,sourcePath,'CK.'+id,'chunk',{category:c.cat,note:c.note});
}
for(const [id,c] of Object.entries(oral.phrases)) addCorpus('app-oral-'+id,c.jp,rubyReading(c.jp),c.ro,c.zh,'listening-jp/src/data.js','JP_COURSE.phrases.'+id,'oral_phrase');
for(const c of oral.glossary.filter(x=>x.category!=='成人')) addCorpus('app-glossary-'+c.id,c.word,c.kana,c.ro,c.zh,'listening-jp/src/data.js','JP_COURSE.glossary.'+c.id,'glossary',{category:c.category,note:c.note});
const vendor=[];
for(const level of ['N5','N4','N3']) {
  const f=`vendor/openjlpt/${level.toLowerCase()}.json`;
  const bytes=fs.readFileSync(path.join(root,f));
  if(hash(bytes)!==lock.openjlpt.files[f]) throw Error('Vendor hash mismatch: '+f);
  const data=JSON.parse(bytes.toString('utf8'));
  for(const w of data) vendor.push({...w,sourceLevel:level});
}
const words=seeds.map(w=>{
  const matches=corpus.filter(c=>!c.particle && c.word.includes(w.word) && toHiragana(c.reading).includes(toHiragana(w.reading)));
  const duo=visibleWords.find(d=>d.wordId===w.id);
  const jlpt=vendor.filter(v=>v.word===w.word && toHiragana(v.reading)===toHiragana(w.reading));
  const provenance=[...matches.map(c=>({...c.source,relation:c.word===w.word?'exact_form':'extracted_from_context',corpusId:c.id}))];
  if(duo) provenance.push({type:'duolingo_screenshot',file:'IMG_6297(2).png',wordShown:duo.word,visibility:duo.visibility});
  if(!provenance.length) provenance.push({type:'curated_daily_travel',relation:'editorial_supplement',date:lock.preparedOn});
  // The meanings and notes in the curated deck are editorial. JLPT matches are optional difficulty metadata.
  return {...w,...analyzeReading(w.reading),provenance,
    familiarityEvidence:duo?'seen_in_duolingo_screenshot':matches.length?'present_in_existing_app':'new_supplement',
    learningStatus:'not_assessed',meaningReview:'editorial_zh_TW',
    jlptApprox:jlpt[0]?.level||null,jlptRefs:jlpt.map(x=>({id:x.id,level:x.level,source:'OpenJLPT',commit:lock.openjlpt.commit})),
    aliases:duo && duo.word!==w.word?[duo.word]:[],speechText:w.reading,
    phaseHint:['battery','grey'].includes(w.id)?'next_voiced':'basic_anchor',
  };
});
const wordMap=Object.fromEntries(words.map(w=>[w.id,w]));
const kana=rows.map(([id,hiragana,katakana,romaji,row,column])=>({id,hiragana,katakana,romaji,row,column,
  kind:id==='wo'?'particle':id==='n'?'nasal':'basic',
  note:id==='wo'?'を 是助詞，現代一般讀 o；ヲ 只作配對認識，不做一般字首或同音二選一測驗。':
    id==='n'?'ん／ン 常在字中、字尾；以 本、日本、パン、コンビニ 的整詞示範，發音會受前後音影響。':
    id==='ha'?'單字裡通常讀 ha；話題助詞 は 讀 wa，另列情境補充。':
    id==='he'?'單字裡通常讀 he；方向助詞 へ 通常讀 e，另列情境補充。':'',
  speechText:id==='wo'?'お':id==='n'?null:hiragana,
  audioAnswerGroup:id==='wo'?'o':id,
}));
const anchors=[];
for(const [id,h,k,ro,row,col,hs,ks] of rows) {
  for(const [script,ids] of [['hira',hs],['kata',ks]]) {
    const key=`${script}:${id}`;
    const references=ids.map(wordId=>{
      const w=wordMap[wordId], span=findKanaSpan(w.reading,h);
      let matchType=id==='n'?'contains_n':id==='wo'?'particle_context':script==='kata'&&id==='mu'&&w.firstKana!==h?'contains_rare_katakana':w.firstMora!==h?'head_extension':'head';
      const displayedReading=script==='hira'?w.readingHiragana:w.reading;
      return {wordId,matchType,displayedReading,targetSpan:span,
        eligibleForAudioHead:matchType==='head',
        eligibleForWordHeadQuestion:['head','head_extension'].includes(matchType),
        note:matchType==='head_extension'?'先辨認第一個假名字形；第一拍有小字組合，不拿整詞第一拍考單獨基本音。':
          matchType==='contains_rare_katakana'?'ム 用 ハム 的字中位置；題目問「找出 ム」，不問第一個音。':'',
      };
    });
    anchors.push({key,kanaId:id,script,glyph:script==='hira'?h:k,
      status:script==='kata'&&id==='wo'?'reference_only':'trainable',
      linkedSpecial:script==='kata'&&id==='wo'?'hira:wo':null,wordRefs:references});
  }
}
const confusables=[
  {script:'hira',keys:['a','o']},{script:'hira',keys:['shi','tsu']},{script:'hira',keys:['nu','me']},
  {script:'hira',keys:['wa','ne','re']},{script:'hira',keys:['ha','ho']},{script:'hira',keys:['ru','ro']},
  {script:'kata',keys:['shi','tsu']},{script:'kata',keys:['so','n']},{script:'kata',keys:['ku','ke']},
  {script:'kata',keys:['nu','su']},{script:'kata',keys:['u','wa']},{script:'kata',keys:['chi','te']},
];
const sources={preparedOn:lock.preparedOn,app:{repository:lock.appRepository,commit:lock.appCommit,files:lock.appFiles},
  duolingo:{acquisition:'user_uploaded_screenshots',reportedTotal:820,reportedSection:3,reportedUnit:6,reportedUnitTitle:'買電子產品',
    extractedCount:visibleWords.length,fullPersonalListAvailable:false,exportIntegrationStatus:'not_tested_with_user_account',
    publicationConsent:{status:'confirmed_by_user',grantedOn:'2026-10-07',scope:'seven_visible_words_and_reported_course_progress'}},
  openjlpt:{repository:lock.openjlpt.repository,commit:lock.openjlpt.commit,license:'CC-BY-SA-4.0',
    licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',counts:Object.fromEntries(['N5','N4','N3'].map(l=>[l,vendor.filter(x=>x.sourceLevel===l).length])),
    use:'optional_expansion_and_approximate_level_metadata',meaningsLanguage:'en',zhReviewed:false},
};
write('data/kana-basic.v1.json',{schemaVersion:1,kana,confusables});
write('data/words.v1.json',{schemaVersion:1,words});
write('data/anchors.v1.json',{schemaVersion:1,anchors});
write('data/app-corpus.v1.json',{schemaVersion:1,snapshotCommit:lock.appCommit,entries:corpus});
write('data/duolingo-visible.v1.json',{schemaVersion:1,...sources.duolingo,words:visibleWords});
write('data/sources.v1.json',{schemaVersion:1,...sources});
const manifest={schemaVersion:1,preparedOn:lock.preparedOn,kanaPairs:kana.length,scriptCells:anchors.length,
  trainableCells:anchors.filter(a=>a.status==='trainable').length,curatedWords:words.length,
  anchorReferences:anchors.reduce((n,a)=>n+a.wordRefs.length,0),appCorpusEntries:corpus.length,
  appBreakdown:{legacyBlocks:Object.keys(B).length,chunks:Object.keys(CK).length,oralPhrases:Object.keys(oral.phrases).length,generalGlossary:oral.glossary.filter(x=>x.category!=='成人').length},
  appTasks:TASKS.length,duolingoVisibleWords:visibleWords.length,openjlptWords:vendor.length,
  openjlptCounts:sources.openjlpt.counts,corpusRequiringReadingReview:corpus.filter(x=>!x.readable).length,
  runtimeIncludesOpenjlptFullLists:false,runtimeFile:'generated/kana-data.js',
};
write('data/manifest.v1.json',manifest);
const runtime={schemaVersion:1,dataVersion:'1.1.0',kana,confusables,words,anchors,sources,manifest};
const js='// Generated by kana-rebuild/tools/build-data.cjs. Include before src/app.js when Claude integrates the module.\n'+
  '// Vocabulary difficulty metadata is derived from OpenJLPT (CC BY-SA 4.0); see kana-rebuild/ATTRIBUTION.md.\n'+
  'globalThis.KANA_REBUILD_DATA = '+JSON.stringify(runtime).replace(/</g,'\\u003c')+';\n';
fs.mkdirSync(path.join(root,'generated'),{recursive:true});fs.writeFileSync(path.join(root,'generated/kana-data.js'),js);
console.log(JSON.stringify(manifest,null,2));
