// 教材一致性檢查：node tools/validate.js
// 檢查：句塊存在、振假名格式、題目答案所在句塊在原句裡、簡單說法保留關鍵資訊、
//      分支都指到存在的節點、每條路都走得到結局、每個接話節點至少有一個「能繼續」。
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = {console};
vm.createContext(ctx);
vm.runInContext(['data_tasks.js', 'data_life.js', 'data_game.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n') + '\n;this.CK=CK;this.TASKS=TASKS;this.GSHOP=GSHOP;this.CRIT=CRIT;this.SKEL=SKEL;', ctx);
const {CK, TASKS, CRIT, SKEL} = ctx;
const errs = [], warns = [], used = new Set();
const ruby = /\{([^|{}]+)\|([^|{}]+)\}/g;
for (const id in CK) {
  const c = CK[id];
  const stripped = c.jp.replace(ruby, '');
  if (/[{}|]/.test(stripped)) errs.push(`句塊 ${id} 振假名格式錯誤：${c.jp}`);
  const kanjiLeft = c.jp.replace(ruby, '').match(/[一-鿿]/g);
  if (kanjiLeft) errs.push(`句塊 ${id} 有漢字沒標讀音：${kanjiLeft.join('')}`);
  if (!c.ro || !c.zh || !c.cat) errs.push(`句塊 ${id} 缺欄位`);
}
let nVar = 0;
for (const t of TASKS) {
  for (let lv = 1; lv <= t.levels; lv++) {
    const vs = t.v[lv];
    if (!vs.length) errs.push(`${t.id} 第 ${lv} 級沒有變體`);
    if (!vs.some(v => !v.tr)) errs.push(`${t.id} 第 ${lv} 級沒有一般變體`);
    for (const v of vs) {
      nVar++;
      const N = v.nodes, where = `${v.id}`;
      const lineChunks = (arr, w) => (arr || []).forEach(id => { if (!CK[id]) errs.push(`${w} 用到不存在的句塊 ${id}`); else used.add(id); });
      for (const nid in N) {
        const n = N[nid], w = `${where}.${nid}`;
        if (n.t === 'say') { lineChunks(n.c, w); if (n.skel && !SKEL[n.skel]) errs.push(`${w} 骨架 ${n.skel} 不存在`); }
        if (n.t === 'hear') {
          lineChunks(n.c, w);
          if (n.easy) lineChunks(n.easy.c, w + '.easy');
          if (!n.zh) errs.push(`${w} 缺中文`);
          (n.q || []).forEach((q, i) => {
            if (!q.o || q.o.length < 2) errs.push(`${w} 題 ${i} 選項不足`);
            if (new Set(q.o).size !== q.o.length) errs.push(`${w} 題 ${i} 選項重複`);
            if (!n.c.includes(q.k)) errs.push(`${w} 題「${q.q}」的答案句塊 ${q.k} 不在原句裡`);
            if (n.easy) {
              const crit = CK[q.k] && CRIT.has(CK[q.k].cat);
              if (q.ke && !n.easy.c.includes(q.ke)) errs.push(`${w} 題「${q.q}」的簡單說法句塊 ${q.ke} 不在簡單說法裡`);
              if (!q.ke && n.easy.c.includes(q.k)) q.ke = q.k;
              if (!q.ke && crit) errs.push(`${w} 題「${q.q}」是關鍵資訊，但簡單說法拿掉了（缺 ke）`);
            }
          });
        }
        if (n.t === 'act') {
          if (!n.o.some(o => o.g === 'ok' && o.next)) errs.push(`${w} 沒有可繼續的選項`);
          n.o.forEach((o, i) => { lineChunks(o.c, `${w}.o${i}`); if (!['ok', 'part', 'bad'].includes(o.g)) errs.push(`${w}.o${i} 判定錯誤`); if (!o.why) errs.push(`${w}.o${i} 缺說明`); if (o.skel && !SKEL[o.skel]) errs.push(`${w}.o${i} 骨架不存在`); });
        }
        if (n.t === 'end' && !['ok', 'slow', 'late', 'fail'].includes(n.res)) errs.push(`${w} 結局類型錯誤`);
        const nexts = n.t === 'act' ? n.o.map(o => o.next).filter(Boolean) : (n.next ? [n.next] : []);
        nexts.forEach(x => { if (!N[x]) errs.push(`${w} 指到不存在的節點 ${x}`); });
        if ((n.t === 'say' || n.t === 'hear') && !n.next) errs.push(`${w} 缺 next`);
      }
      // reachability + every node can reach an end
      const seen = new Set(), st = [v.start];
      while (st.length) { const x = st.pop(); if (seen.has(x) || !N[x]) continue; seen.add(x); const n = N[x]; (n.t === 'act' ? n.o.map(o => o.next).filter(Boolean) : [n.next]).forEach(y => y && st.push(y)); }
      for (const nid in N) if (!seen.has(nid)) warns.push(`${where}.${nid} 走不到`);
      const canEnd = {};
      const reach = (x, stack) => { if (canEnd[x] !== undefined) return canEnd[x]; if (stack.has(x)) return false; stack.add(x); const n = N[x]; let r = n.t === 'end'; if (!r) r = (n.t === 'act' ? n.o.map(o => o.next).filter(Boolean) : [n.next]).some(y => y && reach(y, stack)); stack.delete(x); return (canEnd[x] = r); };
      for (const nid of seen) if (!reach(nid, new Set())) errs.push(`${where}.${nid} 走不到任何結局`);
      if (N[v.start].t !== 'say' && t.group !== '生活') warns.push(`${where} 不是從開口開始`);
    }
  }
}
// 小店遊戲：句塊都要存在
const GSHOP = ctx.GSHOP, gref = (c, w) => (Array.isArray(c) ? c : [c]).forEach(id => { if (!CK[id]) errs.push(`遊戲 ${w} 用到不存在的句塊 ${id}`); else used.add(id); });
for (const sid in GSHOP) { const s = GSHOP[sid]; gref(s.nm, sid); gref(s.entry, sid); gref(s.greet, sid); gref('g_arigatou', sid); gref('g_sakki', sid); gref('g_e', sid); gref('g_mada', sid); gref('g_mou_ii', sid);
  if (!TASKS.some(t => t.id === s.task)) errs.push(`遊戲 ${sid} 連到不存在的對話 ${s.task}`);
  for (const k in s.items || {}) gref(s.items[k].c, sid + '.item');
  for (const t of s.topics) { const w = sid + '.' + t.id; gref(t.ask, w); if (t.remind) gref(t.remind, w);
    if (t.kind === 'act') { gref(t.react.e, w); if (t.react.h) gref(t.react.h, w); }
    else { for (const v in t.ans) { gref(t.ans[v].e.flat(), w); if (t.ans[v].h) gref(t.ans[v].h.flat(), w); if (t.kind === 'pick' && !t.opts[v]) errs.push(`遊戲 ${w} 回答 ${v} 沒有選項`); }
      if (t.opts) Object.values(t.opts).forEach(x => gref(x, w)); if (t.vol) Object.values(t.vol).forEach(x => gref(x.flat(), w)); }
    (t.after || []).forEach(a => { if (!s.topics.some(x => x.id === a)) errs.push(`遊戲 ${w} after ${a} 不存在`); }); } }
for (const id in CK) if (!used.has(id)) warns.push(`句塊 ${id} 沒被用到`);
console.log(`變體 ${nVar} 個，句塊 ${Object.keys(CK).length} 個`);
warns.forEach(w => console.log('提醒：' + w));
errs.forEach(e => console.log('錯誤：' + e));
if (errs.length) { console.log(`共 ${errs.length} 個錯誤`); process.exit(1); }
console.log('檢查通過');
