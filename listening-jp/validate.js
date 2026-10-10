const assert=require('node:assert/strict'),C=require('./src/data.js');
const ids=new Set(),used=new Set();
function unique(id){assert(!ids.has(id),'重複 id：'+id);ids.add(id);}
assert.equal(C.lessons.length,24);assert.equal(C.units.length,8);
for(const u of C.units){unique(u.id);assert(u.name&&u.goal);assert.equal(C.lessons.filter(l=>l.unit===u.id).length,3);}
for(const [id,p] of Object.entries(C.phrases)){
  unique(id);assert.equal(p.id,id);assert(p.jp&&p.ro&&p.zh&&p.note&&p.register&&p.production);
  const rest=p.jp.replace(/\{([^|{}]+)\|([ぁ-んァ-ヶー]+)\}/g,'');
  assert(!/[{}|一-鿿]/.test(rest),id+' 振假名缺失或格式錯誤');
  assert.equal(p.choices.length,3);assert.equal(new Set(p.choices).size,3);assert.equal(p.choices[0],p.zh);
  assert(p.parts.length>=1&&p.parts.every(x=>x.includes('｜')));
}
for(const l of C.lessons){
  unique(l.id);assert(C.units.some(u=>u.id===l.unit));assert.equal(l.phraseIds.length,2);assert.equal(l.dialogue.length,2);assert([0,1].includes(l.focus));
  for(const id of l.phraseIds){assert(C.phrases[id],l.id+' 引用未知句子');assert(!used.has(id),'每课应有两个独立新句子：'+id);used.add(id);}
  assert.deepEqual(l.dialogue.map(x=>x.id),l.phraseIds);assert(l.dialogue.every(x=>x.who==='A'||x.who==='B'));
  for(const q of l.contexts||[]){
    assert(q.setup&&q.jp&&q.q&&q.why,l.id+' 情境題缺欄位');
    assert.equal(q.choices.length,3);assert.equal(new Set(q.choices).size,3);
    assert(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.choices.length);
    assert(!/[{}|一-鿿]/.test(q.jp.replace(/\{([^|{}]+)\|([ぁ-んァ-ヶー]+)\}/g,'')),l.id+' 情境題振假名格式錯誤');
  }
}
assert.equal(used.size,Object.keys(C.phrases).length);
for(const w of C.glossary){unique(w.id);for(const k of ['word','kana','ro','zh','category','note'])assert(w[k],w.id+' 缺 '+k);}
console.log(`教材檢查通過：${C.units.length} 單元、${C.lessons.length} 小課、${used.size} 句、${C.glossary.length} 個查詞條目（其中 ${C.glossary.filter(w=>w.category==='成人').length} 個成人詞義）。`);
