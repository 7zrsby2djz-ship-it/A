// 收集所有要顯示注音的中文句子 → build/strings.json
const fs = require('fs'), vm = require('vm'), path = require('path');
const Z = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
const TALK_FILES = ['talk_core.js','talk_sbux.js','talk_boba.js','talk_cvs.js','talk_bfast.js','talk_mrt.js','talk_school.js','data_ui.js','exam_core.js','exam_listen.js','exam_read.js'];
vm.runInContext(TALK_FILES.map(f => fs.readFileSync(path.join(Z, 'src', f), 'utf8')).join('\n') + '\n;this.TALK=TALK;this.UI_RAW=UI_RAW;this.UI_SCREENS=UI_SCREENS;this.UI_GROUPS=UI_GROUPS;this.REPAIR=REPAIR;this.EXAM=EXAM;this.SKILL_NAMES=SKILL_NAMES;this.TYPE_NAMES=TYPE_NAMES;', ctx);
module.exports = { TALK_FILES };
const S = new Set();
const han = /[㐀-鿿]/;
const add = s => { if (typeof s === 'string' && han.test(s)) S.add(s.replace(/\*\*/g, '')); };
const walk = (o, keys) => { if (Array.isArray(o)) o.forEach(x => walk(x, keys)); else if (o && typeof o === 'object') for (const k in o) { if (keys.includes(k)) { const v = o[k]; if (Array.isArray(v)) v.forEach(x => Array.isArray(x) ? add(x[0]) : add(x)); else add(v); } walk(o[k], keys); } };
// 對話：只標中文欄位
walk(ctx.TALK, ['zh','easy','ans','alt','intent','q','skel','o','name','goal','place','setup','text','why','who','learn','sim']);
ctx.TALK.forEach(sc => { sc.words.forEach(w => { add(w[0]); add(w[2]); }); Object.values(sc.axis).forEach(a => add(a[0])); });
Object.values(ctx.REPAIR).forEach(r => add(r[0]));
ctx.EXAM.forEach(it => { (it.audio || []).forEach(a => add(a[1])); add(it.text); add(it.title); (it.text || '').split('\n').forEach(add); (it.text || '').split('＿＿').forEach(add); if (it.type === 'cloze') add(it.text.replace('＿＿', '【' + it.qs[0].o[0][0] + '】')); (it.kw || []).forEach(k => add(k[0]));
  it.qs.forEach(q => { add(q.q); q.o.forEach(o => add(o[0])); add('根據：' + q.ev); add('技巧：' + q.tip); add('答案：' + q.o[0][0]); add('你選：' + q.o[1][0]); add('你選：' + q.o[2][0]); add('你選：' + q.o[3][0]); }); });
Object.values(ctx.SKILL_NAMES).forEach(n => add(n[0])); Object.values(ctx.TYPE_NAMES).forEach(n => add(n[0]));
const MQ = JSON.parse(fs.readFileSync(path.join(Z, 'data/mingalar_content.json'), 'utf8')).questions;
MQ.forEach(q => { add('答案：' + q.options[q.answer]); q.options.forEach(o => add('你選：' + o)); add('根據：' + q.evidence); });
ctx.UI_RAW.forEach(r => { add(r[1]); add(r[4]); add(r[6]); });
ctx.UI_GROUPS.forEach(g => { add(g.name); add(g.zh); });
ctx.UI_SCREENS.forEach(s => { add(s.title); add(s.body); s.btns.forEach(add); add(s.ask); add(s.why); });
const chin = JSON.parse(fs.readFileSync(path.join(Z, 'data/chin_words.json'), 'utf8'));
chin.words.forEach(w => { add(w.zh); add(w.sentenceZH); });
chin.groups.forEach(g => g.subUnits.forEach(add));
const ming = JSON.parse(fs.readFileSync(path.join(Z, 'data/mingalar_content.json'), 'utf8'));
ming.words.forEach(w => { add(w.cn); w.examples.forEach(e => add(e.cn)); });
ming.questions.forEach(q => { add(q.passage); add(q.question); q.options.forEach(add); });
// App 介面文字（在 app.js 裡用 T('中文','緬文') 標記的）
const app = ['app_core','app_words','app_talk','app_practice','app_main'].map(f => fs.readFileSync(path.join(Z, 'src', f + '.js'), 'utf8')).join('\n');
for (const m of app.matchAll(/\b(?:T|ZY|zy)\(\s*'([^']+)'/g)) add(m[1]);
for (const m of app.matchAll(/'([^'\n]*[\u3400-\u9fff][^'\n]*)'/g)) add(m[1]);
fs.writeFileSync(path.join(Z, 'build/strings.json'), JSON.stringify([...S]));
console.log('strings', S.size);
