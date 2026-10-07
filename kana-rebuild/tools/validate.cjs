#!/usr/bin/env node
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const {toHiragana,analyzeReading,rubyReading,plain}=require('./kana-utils.cjs');
const {kana,confusables}=read('data/kana-basic.v1.json');
const {words}=read('data/words.v1.json');
const {anchors}=read('data/anchors.v1.json');
const {entries:corpus}=read('data/app-corpus.v1.json');
const personal=read('data/personal-words.v1.json'), sources=read('data/sources.v1.json'), manifest=read('data/manifest.v1.json');
const lock=read('source-lock.json');
const unique=(xs,name)=>assert.equal(new Set(xs).size,xs.length,`${name} must be unique`);
unique(kana.map(k=>k.id),'kana IDs');unique(kana.map(k=>k.hiragana),'hiragana');unique(kana.map(k=>k.katakana),'katakana');
unique(words.map(w=>w.id),'word IDs');unique(anchors.map(a=>a.key),'anchor keys');unique(corpus.map(c=>c.id),'corpus IDs');
assert.equal(kana.length,46);assert.equal(anchors.length,92);
const km=Object.fromEntries(kana.map(k=>[k.id,k])),wm=Object.fromEntries(words.map(w=>[w.id,w]));
for(const w of words){
  assert.ok(w.word&&w.reading&&w.romaji&&w.meaningZh,`Incomplete word ${w.id}`);
  assert.ok(w.readable,`Curated reading must be usable: ${w.id}`);
  assert.equal(w.readingHiragana,toHiragana(w.reading));
  assert.ok(w.provenance.length,`Missing provenance ${w.id}`);
  assert.equal(w.learningStatus,'not_assessed','Source presence must not grant mastery');
  for(const p of w.provenance) if(p.type==='app_material')assert.ok(corpus.some(c=>c.id===p.corpusId),`Bad corpus ref ${w.id}`);
}
for(const a of anchors){
  assert.ok(km[a.kanaId]);assert.equal(a.key,`${a.script}:${a.kanaId}`);
  assert.equal(a.glyph,a.script==='hira'?km[a.kanaId].hiragana:km[a.kanaId].katakana);
  if(a.key==='kata:wo'){assert.equal(a.status,'reference_only');assert.equal(a.wordRefs.length,0);assert.equal(a.linkedSpecial,'hira:wo');continue;}
  assert.equal(a.status,'trainable');assert.ok(a.wordRefs.length>=1&&a.wordRefs.length<=2,`Need 1–2 anchors: ${a.key}`);
  for(const r of a.wordRefs){
    const w=wm[r.wordId];assert.ok(w,`Missing ${r.wordId}`);
    const chars=Array.from(toHiragana(r.displayedReading));
    assert.equal(chars.slice(r.targetSpan.start,r.targetSpan.end).join(''),km[a.kanaId].hiragana,`Wrong highlight ${a.key}/${r.wordId}`);
    assert.equal(r.targetSpan.end-r.targetSpan.start,1);
    if(r.matchType==='head'){assert.equal(w.firstKana,km[a.kanaId].hiragana);assert.equal(w.firstMora,w.firstKana);assert.ok(r.eligibleForAudioHead);}
    else assert.equal(r.eligibleForAudioHead,false,`No standalone head-audio question for ${r.matchType}`);
    if(r.matchType==='contains_rare_katakana')assert.equal(a.key,'kata:mu');
    if(r.matchType==='particle_context')assert.equal(a.key,'hira:wo');
    if(r.matchType==='contains_n')assert.equal(a.kanaId,'n');
    if(a.script==='kata')assert.equal(Array.from(r.displayedReading)[r.targetSpan.start],a.glyph,`Katakana must remain native ${a.key}`);
  }
}
for(const g of confusables){assert.ok(['hira','kata'].includes(g.script));g.keys.forEach(id=>assert.ok(km[id]));}
assert.equal(personal.words.length,0);assert.equal(personal.fullPersonalListAvailable,false);
assert.ok(words.every(w=>['present_in_existing_app','new_supplement'].includes(w.familiarityEvidence)));
assert.ok(!JSON.stringify({words,sources,personal}).includes('user_uploaded_screenshots'),'Public package must contain no personal screenshot provenance');
assert.ok(!('reportedTotal' in personal),'Personal course progress is excluded from the public package');
assert.ok(!anchors.flatMap(a=>a.wordRefs).some(r=>['battery','grey'].includes(r.wordId)),'Voiced words cannot seed unvoiced cells');
assert.ok(corpus.some(c=>!c.readable),'Unresolved source readings are retained and flagged, not guessed');
let n=0;
for(const level of ['n5','n4','n3']){
  const f=`vendor/openjlpt/${level}.json`,bytes=fs.readFileSync(path.join(root,f));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),lock.openjlpt.files[f]);
  const data=JSON.parse(bytes.toString('utf8'));unique(data.map(w=>w.id),level+' vendor IDs');
  assert.ok(data.every(w=>w.word&&w.reading&&w.level===level.toUpperCase()));
  assert.equal(data.length,sources.openjlpt.counts[level.toUpperCase()]);n+=data.length;
}
assert.equal(n,2963);assert.equal(sources.openjlpt.license,'CC-BY-SA-4.0');
const runtime={};vm.runInNewContext(fs.readFileSync(path.join(root,'generated/kana-data.js'),'utf8'),runtime);
assert.equal(runtime.KANA_REBUILD_DATA.words.length,words.length);assert.equal(runtime.KANA_REBUILD_DATA.anchors.length,92);
assert.equal(runtime.KANA_REBUILD_DATA.sources.personalVocabulary.fullPersonalListAvailable,false);
assert.equal(manifest.appCorpusEntries,corpus.length);assert.equal(manifest.curatedWords,words.length);
assert.equal(manifest.anchorReferences,anchors.reduce((n,a)=>n+a.wordRefs.length,0));
assert.equal(manifest.openjlptWords,n);assert.equal(manifest.trainableCells,91);
// Regression cases exercise the distinctions that can silently teach the wrong sound.
assert.equal(rubyReading('{駅|えき}'),'えき');assert.equal(plain('{仕事|しごと}'),'仕事');
assert.equal(analyzeReading(rubyReading('{駅|えき}')).firstKana,'え');
assert.equal(analyzeReading('ｶｰﾄﾞ').readingHiragana,'かーど');
assert.equal(analyzeReading('ｸﾞﾚｰ').firstKana,'ぐ');assert.equal(analyzeReading('でんち').basicHeadEligible,false);
assert.equal(analyzeReading('きゃく').firstKana,'き');assert.equal(analyzeReading('きゃく').firstMora,'きゃ');assert.equal(analyzeReading('きゃく').basicHeadEligible,false);
assert.equal(analyzeReading('ティー').firstMora,'てぃ');assert.equal(analyzeReading('ティー').basicHeadEligible,false);
assert.equal(analyzeReading('205ばん').readable,false);assert.equal(analyzeReading('駅').readable,false);
assert.equal(analyzeReading('〜にはとまりません').firstKana,'に');assert.equal(km.wo.audioAnswerGroup,km.o.audioAnswerGroup);
assert.equal(km.n.speechText,null,'N is taught using full-word context');
console.log(`PASS: ${kana.length} kana pairs / ${anchors.length} cells (${manifest.trainableCells} trainable), ${words.length} curated words, ${corpus.length} app entries, ${n} licensed expansion words; normalization, spans, provenance and sound exceptions verified.`);
