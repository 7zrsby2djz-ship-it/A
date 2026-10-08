// 檢查：800 字原樣、對話結構、介面字、注音
const fs = require('fs'), vm = require('vm'), path = require('path');
const Z = path.join(__dirname, '..');
let bad = 0; const err = m => { bad++; console.log('✗', m); };
// 1) 單字原樣：每個欄位都要在 Dart 原始檔中逐字出現
const SRC = process.env.CHIN_SRC || '/home/claude/src/chin';
const chin = JSON.parse(fs.readFileSync(path.join(Z, 'data/chin_words.json'), 'utf8'));
if (fs.existsSync(SRC)) {
  const dart = ['vocab_data.dart', 'tocfl_data.dart'].map(f => fs.readFileSync(path.join(SRC, 'lib/data', f), 'utf8')).join('\n');
  chin.words.forEach(w => ['zh', 'myn', 'sentenceZH', 'sentenceMYN', 'audioZH', 'pinyin', 'sentencePINYIN'].forEach(k => { if (dart.indexOf('"' + w[k].replace(/"/g, '\\"') + '"') < 0) err('單字不是原樣：' + w.id + ' ' + k); }));
  console.log('單字原樣檢查', chin.words.length, '個');
} else console.log('（找不到原始 Flutter 專案，略過原樣比對）');
// 2) 對話
const ctx = {}; vm.createContext(ctx);
const files = ['talk_core', 'talk_sbux', 'talk_boba', 'talk_cvs', 'talk_bfast', 'talk_mrt', 'talk_school', 'data_ui'];
vm.runInContext(files.map(f => fs.readFileSync(path.join(Z, 'src', f + '.js'), 'utf8')).join('\n') + ';this.TALK=TALK;this.UI_RAW=UI_RAW;this.UI_GROUPS=UI_GROUPS;this.UI_SCREENS=UI_SCREENS;', ctx);
let nv = 0, nn = 0;
ctx.TALK.forEach(sc => {
  [1, 2, 3].forEach(lv => { if (!sc.vars.some(v => v.lv === lv)) err(sc.id + ' 缺 Lv.' + lv); });
  sc.vars.forEach(v => {
    nv++;
    const ids = v.nodes.map(n => n.id).filter(Boolean);
    if (v.nodes[v.nodes.length - 1].t !== 'end') err(v.id + ' 最後不是結局');
    if (!v.setup || !v.setupMy) err(v.id + ' 缺情境說明');
    v.nodes.forEach((n, i) => {
      nn++;
      if (!['hear', 'say', 'act', 'end'].includes(n.t)) err(v.id + ' 節點類型錯 ' + i);
      if (n.t === 'hear') { if (!n.zh || !n.my) err(v.id + ' hear 缺文字 ' + i); (n.q || []).forEach(q => { if (q.a >= q.o.length || q.o.length < 2) err(v.id + ' 題目答案錯 ' + q.q); q.o.forEach(o => { if (!o[0] || !o[1]) err(v.id + ' 選項缺緬文 ' + q.q); }); }); if (n.easy && !n.easyMy) err(v.id + ' easy 缺緬文'); }
      if (n.t === 'say') { if (!n.ans || !n.ansMy || !n.skel.length) err(v.id + ' say 不完整'); }
      if (n.t === 'act') {
        if (!n.o.some(o => o.r === 'ok')) err(v.id + ' act 沒有 ok 選項 ' + n.q);
        n.o.forEach(o => { if (!['ok', 'part', 'bad'].includes(o.r)) err(v.id + ' 判定錯'); if (o.go && !ids.includes(o.go)) err(v.id + ' go 找不到 ' + o.go); if (!o.my) err(v.id + ' 選項缺緬文 ' + o.zh); if (o.why && !o.whyMy) err(v.id + ' 說明缺緬文 ' + o.zh); });
      }
    });
  });
});
console.log('對話', ctx.TALK.length, '個情境、', nv, '段、', nn, '個節點');
// 3) 介面字
const uids = new Set(ctx.UI_RAW.map(r => r[0]));
if (uids.size !== ctx.UI_RAW.length) err('介面字 id 重複');
ctx.UI_RAW.forEach(r => { if (r.length !== 8 || r.some(x => !x)) err('介面字欄位不完整 ' + r[0]); });
ctx.UI_GROUPS.forEach(g => g.ids.forEach(i => { if (!uids.has(i)) err('易混字組找不到 ' + i); }));
ctx.UI_SCREENS.forEach(s => { if (s.a >= s.btns.length) err('畫面題答案錯 ' + s.title); });
console.log('介面字', ctx.UI_RAW.length, '、易混字組', ctx.UI_GROUPS.length, '、畫面題', ctx.UI_SCREENS.length);
// 4) 注音數量對得上
const rj = fs.readFileSync(path.join(Z, 'src/readings.gen.js'), 'utf8');
const READ = JSON.parse(rj.slice(rj.indexOf('{'), rj.indexOf(';\nconst CHREAD')));
let mism = 0; for (const s in READ) { const n = [...s].filter(c => /[㐀-鿿]/.test(c)).length; if (READ[s].split(' ').filter(Boolean).length !== n) { mism++; if (mism < 5) err('注音數量不符：' + s); } }
console.log('注音', Object.keys(READ).length, '句', mism ? '（' + mism + ' 句不符）' : '');
if (bad) { console.log('共 ' + bad + ' 個問題'); process.exit(1); } else console.log('全部通過');
