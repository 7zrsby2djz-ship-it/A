
/* ================= 把對話走完：執行引擎 =================
   開口 → 聽回答 → 判斷或求助 → 補問 → 再確認 → 行動結果
   進度分開記：看字完成 / 純聽完成 / 求助後完成 / 換說法也完成（遷移）
   ======================================================== */
const RES_LABEL = {ok:'完成', slow:'到了，但比較慢', late:'走錯後補救成功', fail:'沒有完成'};
const G_LABEL = {ok:'能繼續', part:'需要補充', bad:'會造成錯誤行動'};
const LVR = [0, 0.85, 0.9, 0.95, 1.08, 1.0];
const REP = {
  again:{jp:'もう{一度|いちど}お{願|ねが}いします', ro:'Mō ichido onegai shimasu', zh:'請再說一次'},
  slow:{jp:'ゆっくりお{願|ねが}いします', ro:'Yukkuri onegai shimasu', zh:'請說慢一點'},
  easy:{jp:'もう{少|すこ}し{簡単|かんたん}に{言|い}ってもらえますか', ro:'Mō sukoshi kantan ni itte moraemasu ka', zh:'可以說簡單一點嗎？'},
};
const TYPE_LABEL = {text:'看字／提示完成', listen:'純聽完成', repair:'求助後完成', transfer:'換說法也聽懂'};

/* 執行時整理資料：簡單說法裡有同一個句塊時，自動當作 ke */
(function normalizeTasks() {
  TASKS.forEach(t => { for (let lv = 1; lv <= 5; lv++) t.v[lv].forEach(v => { for (const id in v.nodes) { const n = v.nodes[id];
    if (n.t === 'hear' && n.easy) (n.q || []).forEach(q => { if (!q.ke && n.easy.c.includes(q.k)) q.ke = q.k; }); } }); });
})();
const VAR = {}; TASKS.forEach(t => { for (let lv = 1; lv <= 5; lv++) t.v[lv].forEach(v => { VAR[v.id] = v; }); });

function plainJp(s) { return String(s).replace(/\{([^|{}]+)\|[^{}]+\}/g, '$1'); }
function rubyHtml(s) { return esc(s).replace(/\{([^|{}]+)\|([^{}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>'); }
function lineText(c) { return c.map(id => plainJp(CK[id].jp)).join(''); }
function lineRo(c) { return c.map(id => CK[id].ro).join(' '); }
function lineHtml(c, o = {}) {
  const mask = o.mask || new Set();
  const ro = c.map(id => mask.has(id) ? '…' : esc(CK[id].ro)).join(' ');
  const jp = c.map(id => { const k = CK[id];
    if (mask.has(id)) return `<span class="mask">［${CAT[k.cat] || '？'}］</span>`;
    return o.tap ? `<button class="ckb" data-a="ckInfo" data-v="${id}">${rubyHtml(k.jp)}</button>` : `<span class="ck">${rubyHtml(k.jp)}</span>`; }).join('');
  return `<div class="jl"><div class="xro">${ro}</div><div class="jp${o.big ? ' big' : ''}">${jp}</div></div>`;
}
function mkRec() { return {s:0, due:0, ok:0, ng:0, lapse:0, conf:{}, t0:Date.now(), last:0}; }
function ckSt(id, create) { if (!S.ck[id] && create) S.ck[id] = {seen:Date.now(), t:mkRec(), l:mkRec(), weak:false}; return S.ck[id]; }
function tkSt(tid) { return S.tk[tid] || (S.tk[tid] = {lv:{}}); }
function lvSt(tid, lv) { const t = tkSt(tid); return t.lv[lv] || (t.lv[lv] = {done:0, text:0, listen:0, repair:0, transfer:0, seen:[], last:0, rec:null}); }
function lvPeek(tid, lv) { return ((S.tk[tid] || {}).lv || {})[lv] || null; }
function lvPassed(tid, lv) { const s = lvPeek(tid, lv); return !!s && (s.listen + s.repair + s.transfer) > 0; }

/* 舊進度轉換：舊版「通過」= 第一次全對且沒看字 → 記為純聽完成 */
function migrateOldDlg() {
  if (S.migDlg) return;
  for (const sid in (S.dlg || {})) {
    if (!TASK[sid]) continue;
    const pass = S.dlg[sid].pass || {};
    for (const lv in pass) if (pass[lv] > 0) { const st = lvSt(sid, +lv); st.listen += pass[lv]; st.done += pass[lv]; st.last = Date.now(); }
  }
  S.migDlg = 1;
}

/* ---------- 推薦 ---------- */
function recommend() {
  const t = Date.now();
  for (const tk of TASKS) for (let lv = 1; lv <= 5; lv++) { const s = lvPeek(tk.id, lv); if (s && s.rec && lvPassed(tk.id, lv) && s.rec.s < 7 && s.rec.due <= t) return {tid:tk.id, lv, why:'複習'}; }
  for (let lv = 1; lv <= 5; lv++) for (const tk of TASKS) if (!lvPassed(tk.id, lv)) return {tid:tk.id, lv, why:lvPeek(tk.id, lv) ? '再練一次' : '下一級'};
  const tk = pick(TASKS); return {tid:tk.id, lv:1 + (Math.random() * 5 | 0), why:'自由練習'};
}
function pickVariant(tid, lv) {
  const s = lvPeek(tid, lv), seen = new Set(s ? s.seen : []), vs = TASK[tid].v[lv];
  const base = vs.filter(v => !v.tr), tr = vs.filter(v => v.tr);
  const ub = base.filter(v => !seen.has(v.id)); if (ub.length) return ub[0];
  const ut = tr.filter(v => !seen.has(v.id)); if (ut.length) return ut[0];
  return pick(vs);
}

/* ---------- 執行狀態（存在 S.run，可中斷接續） ---------- */
let RUN_END = null, SIT = 0;
function startRun(tid, lv, vid) {
  closeSheet();
  const v = vid ? VAR[vid] : pickVariant(tid, lv);
  S.run = {tid, lv:v.lv, vid:v.id, node:null, cq:{}, vis:{}, ans:{}, ord:{}, easy:{}, pick:{}, said:{}, zh:{}, rep:0, path:[],
    flags:{text:false, hint:false, help:false, bad:false, crit:false, noAudio:!canSpeak}, board:{known:[], todo:'問清楚怎麼去'}, wrong:[], t0:Date.now()};
  RUN_END = null;
  openRunView(); enterNode(v.start);
}
function curVar() { return S.run && VAR[S.run.vid]; }
function curNode() { const v = curVar(); return v && v.nodes[S.run.node]; }
function nodeWho(n) { return n.who || curVar().who; }
function activeQs(n) { const r = S.run; return (n.q || []).map((q, i) => ({q, i})).filter(x => !r.easy[n.id] || x.q.ke); }
function curQ(n) {
  const r = S.run, qs = activeQs(n), ans = r.ans[n.id] || {};
  return qs.find(x => x.i === r.cq[n.id]) || qs.find(x => ans[x.i] === undefined) || null;
}
function keyOf(n, q) { return S.run.easy[n.id] && q.ke ? q.ke : q.k; }
function computeVis(n) {
  if (!canSpeak) return 'full';
  if (n.c.some(id => !S.ck[id])) return 'full';
  const weak = (n.q || []).some(q => { const s = S.ck[q.k]; return !s || s.l.s < 2 || s.weak; });
  return weak ? 'part' : 'listen';
}
function enterNode(id) {
  const r = S.run, v = curVar(), n = v.nodes[id];
  r.node = id; r.path.push(id);
  if (n.t === 'hear') {
    if (!r.vis[id]) r.vis[id] = computeVis(n);
    if (!r.ord[id]) r.ord[id] = (n.q || []).map(q => shuffle(q.o.map((_, i) => i)));
    if (r.vis[id] === 'full') r.flags.text = true;
    if (r.vis[id] === 'part') r.flags.hint = true;
  }
  if (n.t === 'act' && !r.ord[id]) r.ord[id] = shuffle(n.o.map((_, i) => i));
  if (n.t === 'end') finalizeRun(n);
  persist(); renderRun();
  const bd = $('#runBody'); if (bd) bd.scrollTop = 0;
  if (n.t === 'hear' && S.settings.autoSpeak) playNode(n);
}
function playNode(n, mode) {
  const r = S.run, rate = LVR[r.lv];
  if (mode === 'easy' && n.easy) speak(lineText(n.easy.c), 'ja-JP', 0.85);
  else if (mode === 'slow') speak(lineText(r.easy[n.id] && n.easy ? n.easy.c : n.c), 'ja-JP', 0.7);
  else speak(lineText(n.c), 'ja-JP', rate);
}
function finishHear(n) {
  const r = S.run;
  n.c.forEach(id => ckSt(id, true)); if (r.easy[n.id] && n.easy) n.easy.c.forEach(id => ckSt(id, true));
  (n.learn || []).forEach(x => { if (!r.board.known.includes(x)) r.board.known.push(x); });
  if (n.todo) r.board.todo = n.todo;
}
function answerQ(oi) {
  const r = S.run, n = curNode(); if (!n || n.t !== 'hear') return;
  const cur = curQ(n); if (!cur) return;
  r.ans[n.id] = r.ans[n.id] || {}; r.cq[n.id] = cur.i;
  if (r.ans[n.id][cur.i] !== undefined) return;
  r.ans[n.id][cur.i] = oi;
  const ok = oi === 0, key = keyOf(n, cur.q), ck = CK[key], crit = CRIT.has(ck.cat), mode = r.vis[n.id];
  const rec = ckSt(key, true);
  if (mode === 'full' || !canSpeak) grade(rec.t, ok); else grade(rec.l, ok);
  if (ok) rec.weak = false; else { r.wrong.push(key); if (crit) r.flags.crit = true; }
  const lg = L(); lg.jp++; if (ok) lg.jpOk++;
  touchStreak(); addXp(ok ? 6 : 1); persist(); renderRun();
  requestAnimationFrame(() => { const fb = document.querySelector('#runBody .qfb'); fb && fb.scrollIntoView({behavior:'smooth', block:'nearest'}); });
}

/* ---------- 結算 ---------- */
function runTypes() {
  const r = S.run, f = r.flags, v = curVar();
  const usedText = f.text || f.noAudio || !canSpeak, help = r.rep > 0 || f.help, out = [];
  if (usedText || f.hint) out.push('text');
  else if (help) out.push('repair');
  else if (!f.crit) out.push('listen');
  if (v.tr && !usedText && !f.hint && !f.crit) out.push('transfer');
  return out;
}
function finalizeRun(n) {
  const r = S.run; if (!r || r.done) return;
  r.done = true;
  const types = runTypes(), st = lvSt(r.tid, r.lv);
  const passedNow = types.some(tp => tp !== 'text');
  if (passedNow && st.done > 0 && st.last && dayKey(st.last) !== dayKey()) st.later = (st.later || 0) + 1;
  st.done++; types.forEach(tp => st[tp]++); if (!st.seen.includes(r.vid)) st.seen.push(r.vid); st.last = Date.now();
  st.rec = st.rec || mkRec(); grade(st.rec, passedNow);
  if (passedNow && st.rec.s < 2) { st.rec.s = 2; st.rec.due = Date.now() + IV[2]; }
  addXp(passedNow ? 15 : 6); SIT++;
  RUN_END = {run:JSON.parse(JSON.stringify(r)), types, res:n.res, text:n.text};
  S.run = null; persist();
}

/* ---------- 畫面 ---------- */
function openRunView() {
  let el = $('#run');
  if (!el) { el = document.createElement('div'); el.id = 'run'; el.className = 'overlay jpmode'; document.body.append(el); }
  el.hidden = false; document.body.style.overflow = 'hidden';
}
function closeRunView(silent) {
  const el = $('#run'); if (el) el.hidden = true; document.body.style.overflow = '';
  try { speechSynthesis.cancel(); } catch (e) {}
  if (S.run && !silent) toast('已保存，回首頁可以從這裡接續');
  RUN_END = null; render();
}
function boardHtml(r) {
  const t = TASK[r.tid];
  return `<div class="board" aria-label="任務板">
    <div><span class="bk">目的地</span><span>${esc(t.dest)}</span></div>
    <div><span class="bk">已確認</span><span>${r.board.known.length ? esc(r.board.known.slice(-3).join('；')) : '還沒有'}</span></div>
    <div><span class="bk">下一步</span><span>${esc(r.board.todo || '—')}</span></div></div>`;
}
function figHtml(f) {
  if (!f) return '';
  if (f.type === 'steps') return `<div class="fig steps" role="img" aria-label="${esc(f.s.map(x => x[1]).join('，然後'))}">${f.s.map(([g, t]) => `<div class="stp"><span class="g" aria-hidden="true">${esc(g)}</span><span>${esc(t)}</span></div>`).join('<span class="arr" aria-hidden="true">›</span>')}</div>`;
  if (f.type === 'cross') return `<div class="fig" role="img" aria-label="${esc(f.a)}，過馬路到${esc(f.b)}"><svg viewBox="0 0 320 150" width="100%" style="max-width:420px;display:block;margin:auto">
    <rect x="0" y="0" width="320" height="38" fill="var(--surface2)" stroke="var(--line)"/><rect x="0" y="38" width="320" height="74" fill="var(--line)"/>
    ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${140 + 0}" y="${42 + i * 12}" width="40" height="6" fill="var(--surface)"/>`).join('')}
    <rect x="0" y="112" width="320" height="38" fill="var(--surface2)" stroke="var(--line)"/>
    <path d="M160 108 L160 44" stroke="var(--jp)" stroke-width="4" fill="none" marker-end="url(#ah)"/>
    <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="var(--jp)"/></marker></defs>
    <text x="160" y="24" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">${esc(f.b)}</text>
    <text x="160" y="137" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">${esc(f.a)}</text>
    <text x="200" y="80" font-size="12" fill="var(--muted)">斑馬線／過馬路</text></svg></div>`;
  return '';
}
function renderRun() {
  const el = $('#run'); if (!el) return;
  if (RUN_END) { el.innerHTML = runEndHtml(); return; }
  const r = S.run; if (!r) { el.hidden = true; return; }
  const t = TASK[r.tid], v = curVar(), n = curNode();
  const head = `<div class="ov-head"><button class="icon-btn" data-a="runClose" aria-label="先離開，之後接續">${IC.x}</button>
    <div style="flex:1;min-width:0"><div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</div><div class="small muted">第 ${r.lv} 級・${esc(t.axis[r.lv])}${v.tr ? '・換說法' : ''}</div></div>
    <span class="small muted tnum">第 ${r.path.length} 步</span></div>`;
  let body = '', foot = '';
  if (n.t === 'say') [body, foot] = sayHtml(n);
  else if (n.t === 'hear') [body, foot] = hearHtml(n);
  else if (n.t === 'act') [body, foot] = actHtml(n);
  const prev = $('#runBody'), keep = prev && prev.dataset.node === r.node ? prev.scrollTop : 0;
  el.innerHTML = head + `<div class="ov-body" id="runBody" data-node="${esc(r.node)}"><div class="in">${boardHtml(r)}${body}</div></div><div class="ov-foot"><div class="in">${foot}</div></div>`;
  if (keep) $('#runBody').scrollTop = keep;
}
function sayHtml(n) {
  const r = S.run, sk = SKEL[n.skel], shown = r.said[n.id];
  const b = `<p class="small muted">${esc(TASK[r.tid].place)}</p><p style="font-size:16px">${esc(curVar().setup || TASK[r.tid].setup)}</p>
    <section class="card stack" style="gap:8px"><p class="who" style="color:var(--en-ink)">你先開口</p><p style="font-size:19px;font-weight:800">${esc(n.intent)}</p>
      ${sk ? `<p class="small">骨架：<b class="jpf">${esc(sk.f)}</b><br><span class="muted">${esc(sk.zh)}</span></p>` : ''}
      ${shown ? `<div class="row" style="align-items:flex-end"><div style="flex:1;min-width:0">${lineHtml(n.c, {tap:true})}<p class="small muted">${esc(n.zh)}</p></div>${spkBtn(lineText(n.c), 'ja-JP')}</div>` : '<p class="small muted">先自己小聲說說看，再看參考答案。說得不一樣也沒關係。</p>'}
    </section>`;
  const f = shown ? `<button class="btn primary block" data-a="runNext">說完了，聽對方回答</button>` : `<button class="btn primary block" data-a="sayShow">看參考答案</button>`;
  return [b, f];
}
function hearHtml(n) {
  const r = S.run, vis = r.vis[n.id], qs = activeQs(n), ans = r.ans[n.id] || {};
  const allDone = qs.every(x => ans[x.i] !== undefined), easy = r.easy[n.id] && n.easy;
  const cur = curQ(n);
  const mask = new Set();
  if (vis === 'part' && !allDone) qs.forEach(x => { if (ans[x.i] === undefined) { mask.add(x.q.k); if (x.q.ke) mask.add(x.q.ke); } });
  const showText = vis !== 'listen' || allDone;
  let newCks = vis === 'full' && !allDone ? n.c.filter(id => !S.ck[id] && CRIT.has(CK[id].cat)).slice(0, 2) : [];
  if (newCks.length >= n.c.length) newCks = [];
  let b = '';
  if (n.point) b += `<div class="point"><span class="bk">手勢</span>${esc(n.point)}</div>`;
  if (newCks.length) b += `<section class="newck"><p class="sec-title" style="margin:0">這段的新句塊（先看一眼）</p>${newCks.map(id => `<div class="row"><div style="flex:1;min-width:0">${lineHtml([id])}<p class="small muted">${esc(CK[id].zh)}</p></div>${spkBtn(plainJp(CK[id].jp), 'ja-JP')}</div>`).join('')}</section>`;
  b += `<div class="bubble"><div class="grow"><p class="who">${esc(nodeWho(n))}</p>
    ${showText ? lineHtml(n.c, {mask, tap:allDone}) : '<p class="muted" style="padding-block:6px">只用聽的。聽不懂可以用下面的說法求助。</p>'}
    ${allDone || r.zh[n.id] ? `<p class="small muted" style="margin-top:4px">${esc(n.zh)}</p>` : ''}
    ${easy ? `<p class="small" style="margin-top:8px">你請他說簡單一點，他改說：</p>${showText ? lineHtml(n.easy.c, {mask, tap:allDone}) : ''}${allDone ? `<p class="small muted">${esc(n.easy.zh)}</p>` : ''}` : ''}
    </div></div>`;
  if (canSpeak) b += `<button class="btn jp-b block" data-a="hearPlay">${IC.speak}再聽一次</button>
    <div class="repair3">${['again', 'slow', 'easy'].map(k => `<button class="rep" data-a="hearRep" data-v="${k}"><span class="jpf">${rubyHtml(REP[k].jp)}</span><span class="small muted"><span class="xro">${esc(REP[k].ro)}・</span>${esc(REP[k].zh)}</span></button>`).join('')}</div>`;
  else b += `<p class="small muted">這台裝置不能播放聲音，先用看的練習（這次會記成「看字完成」）。</p>`;
  if (!allDone && canSpeak) b += `<div class="row wrap" style="justify-content:center">${vis === 'listen' ? '<button class="btn ghost sm" data-a="hearVis" data-v="part">給我提示</button>' : ''}${vis !== 'full' ? '<button class="btn ghost sm" data-a="hearVis" data-v="full">顯示全文</button>' : ''}${!r.zh[n.id] ? '<button class="btn ghost sm" data-a="hearZh">看中文</button>' : ''}</div>`;
  if (cur && (!allDone || ans[cur.i] !== undefined)) {
    const a = ans[cur.i], answered = a !== undefined, key = keyOf(n, cur.q);
    b += `<section class="card stack qcard" style="gap:10px"><p class="small muted">問題 ${qs.findIndex(x => x.i === cur.i) + 1} / ${qs.length}</p><p class="q" style="font-size:18px">${esc(cur.q.q)}</p>
      <div class="opts">${r.ord[n.id][cur.i].map(oi => `<button class="opt ${answered && oi === 0 ? 'correct' : answered && oi === a ? 'wrong' : ''}" data-a="hearQ" data-v="${oi}" ${answered ? 'disabled' : ''}>${esc(cur.q.o[oi])}</button>`).join('')}</div>
      ${answered ? (a === 0 ? `<div class="qfb ok">對了。關鍵：<b class="jpf">${rubyHtml(CK[key].jp)}</b>＝${esc(CK[key].zh)}</div>`
        : `<div class="qfb no">答案是「${esc(cur.q.o[0])}」。可以先確認這一塊：<b class="jpf">${rubyHtml(CK[key].jp)}</b>（${esc(CK[key].zh)}）。
          <details><summary>還可以怎麼做</summary><p class="small">不確定時可以按「もう一度」「ゆっくり」或「簡単に」，或在下一步用「〜ですね」確認。${CK[key].note ? '<br>' + esc(CK[key].note) : ''}</p></details></div>`) : ''}
    </section>`;
  }
  if (allDone) {
    b += `${(n.learn || []).length ? `<div class="fb ok" style="animation:none"><h3>確認了</h3>${n.learn.map(x => `<p>・${esc(x)}</p>`).join('')}</div>` : ''}${n.fig ? `<p class="sec-title">照這張卡走</p>${figHtml(n.fig)}` : ''}
      <details class="card flat"><summary style="cursor:pointer;font-weight:700">拆開來看（點句塊看說明）</summary><div class="list" style="margin-top:10px">${(easy ? n.c.concat(n.easy.c.filter(id => !n.c.includes(id))) : n.c).map(id => `<button class="li" data-a="ckInfo" data-v="${id}"><div class="grow"><div class="jpf" style="font-weight:700;font-size:17px">${rubyHtml(CK[id].jp)}</div><div class="zh" style="white-space:normal">${esc(CK[id].zh)}<span class="muted">・${CAT[CK[id].cat]}</span></div></div>${IC.chev}</button>`).join('')}</div></details>`;
  }
  let f;
  if (allDone) f = `<button class="btn primary block" data-a="hearDone">繼續</button>`;
  else if (cur && ans[cur.i] !== undefined) f = `<button class="btn primary block" data-a="hearNextQ">下一題</button>`;
  else f = `<p class="small muted" style="text-align:center">${qs.length ? '聽完回答問題' : ''}</p>${!qs.length ? '<button class="btn primary block" data-a="hearDone">繼續</button>' : ''}`;
  return [b, f];
}
function lastHear(r) { const v = curVar(); for (let i = r.path.length - 2; i >= 0; i--) { const n = v.nodes[r.path[i]]; if (n && n.t === 'hear') return n; } return null; }
function actHtml(n) {
  const r = S.run, p = r.pick[n.id], picked = p !== undefined, showZh = r.zh[n.id] || picked;
  const lh = lastHear(r), skels = [...new Set(n.o.map(o => o.skel).filter(Boolean))];
  let b = lh ? `<div class="bubble"><div class="grow"><p class="who">${esc(nodeWho(lh))}剛剛說</p>${lineHtml(r.easy[lh.id] && lh.easy ? lh.easy.c : lh.c)}<p class="small muted" style="margin-top:4px">${esc(r.easy[lh.id] && lh.easy ? lh.easy.zh : lh.zh)}</p></div></div>` : '';
  b += `<p class="q">${esc(n.q)}</p>`;
  if (skels.length && !picked) b += `<details class="card flat"><summary style="cursor:pointer">先自己說說看（可用的骨架）</summary>${skels.map(s => `<p class="small" style="margin-top:6px"><b class="jpf">${esc(SKEL[s].f)}</b><br><span class="muted">${esc(SKEL[s].zh)}</span></p>`).join('')}</details>`;
  b += `<div class="opts">${r.ord[n.id].map(i => { const o = n.o[i];
    const cls = picked && i === p ? (o.g === 'ok' ? 'correct' : o.g === 'part' ? 'partial' : 'wrong') : '';
    return `<button class="opt ${cls}" data-a="actPick" data-v="${i}" ${picked ? 'disabled' : ''}><span style="min-width:0;display:block">${o.c ? lineHtml(o.c) : ''}${o.do ? `<span class="sub">（${esc(o.do)}）</span>` : ''}${showZh ? `<span class="sub">${esc(o.zh)}</span>` : ''}</span></button>`; }).join('')}</div>`;
  if (!picked && !r.zh[n.id]) b += `<button class="btn ghost sm" style="align-self:center" data-a="actZh">看中文意思</button>`;
  let f = `<p class="small muted" style="text-align:center">選一個你會說或會做的</p>`;
  if (picked) {
    const o = n.o[p];
    b += `<div class="fb ${o.g === 'ok' ? 'ok' : o.g === 'part' ? 'mid' : 'no'}"><h3>${G_LABEL[o.g]}</h3><p>${esc(o.why)}</p>${o.skel ? `<p class="small">用到的骨架：<b class="jpf">${esc(SKEL[o.skel].f)}</b></p>` : ''}</div>`;
    f = o.next ? `<button class="btn primary block" data-a="actGo">${o.g === 'bad' ? '看看會發生什麼' : '繼續'}</button>` : `<button class="btn primary block" data-a="actRe">重新選</button>`;
  }
  return [b, f];
}
function runEndHtml() {
  const e = RUN_END, r = e.run, t = TASK[r.tid], v = VAR[r.vid], rec = recommend(), more = SIT < (S.settings.dlgLen || 1);
  const wrong = [...new Set(r.wrong)];
  const types = e.types.length ? e.types : [];
  const rt = TASK[rec.tid];
  return `<div class="ov-head"><button class="icon-btn" data-a="runClose" aria-label="關閉">${IC.x}</button><div style="flex:1"></div></div>
    <div class="ov-body"><div class="in">
      <div class="done-hero" style="padding-top:4px"><h2 style="font-size:24px">${RES_LABEL[e.res]}</h2><p class="muted">${esc(t.name)}・第 ${r.lv} 級${v.tr ? '・換說法' : ''}</p></div>
      <section class="card stack" style="gap:6px"><p class="sec-title" style="margin:0">結果</p><p style="font-size:18px;font-weight:700">${esc(e.text)}</p></section>
      <section class="card flat stack" style="gap:8px"><p class="sec-title" style="margin:0">這次的完成方式</p>
        <div class="chips">${types.length ? types.map(tp => `<span class="pill ${tp === 'text' ? 'st-short' : 'st-mast'}">${TYPE_LABEL[tp]}</span>`).join('') : '<span class="pill st-conf">走完了，但有關鍵資訊沒抓到</span>'}</div>
        <p class="small muted">${types.includes('listen') || types.includes('transfer') ? '不看字也聽懂了。' : types.includes('repair') ? '用了重說、簡單說法或確認，在日本這樣做完全沒問題。' : types.includes('text') ? '這次有看字或提示，下次同一級會試著少一點提示。' : '下次再練一次就好。'}${r.rep ? `（請對方重說 ${r.rep} 次）` : ''}</p></section>
      ${r.board.known.length ? `<section class="card flat stack" style="gap:4px"><p class="sec-title" style="margin:0">你確認了</p>${r.board.known.map(x => `<p>・${esc(x)}</p>`).join('')}</section>` : ''}
      ${wrong.length ? `<section class="stack" style="gap:8px"><p class="sec-title" style="margin:0">可以再確認的句塊（已排進句塊複習）</p><div class="list">${wrong.map(id => `<button class="li" data-a="ckInfo" data-v="${id}"><div class="grow"><div class="jpf" style="font-weight:700">${rubyHtml(CK[id].jp)}</div><div class="zh">${esc(CK[id].zh)}</div></div>${IC.chev}</button>`).join('')}</div></section>` : ''}
      <p class="small muted">${esc(t.sim)}</p>
    </div></div>
    <div class="ov-foot"><div class="in">
      ${more ? `<button class="btn primary block" data-a="runRec">下一段：${esc(rt.name)}・第 ${rec.lv} 級</button><button class="btn block" data-a="runClose">先到這裡</button>`
        : `<button class="btn primary block" data-a="runClose">完成</button><button class="btn block" data-a="runRec">再一段：${esc(rt.name)}・第 ${rec.lv} 級</button>`}
    </div></div>`;
}
function recapText(r) {
  const t = TASK[r.tid];
  return `${t.name}・第 ${r.lv} 級。目的地：${t.dest}。${r.board.known.length ? '已確認：' + r.board.known.slice(-2).join('；') + '。' : ''}${r.board.todo ? '下一步：' + r.board.todo + '。' : ''}`;
}
function resumeRun() { if (!S.run || !VAR[S.run.vid]) { S.run = null; return; } RUN_END = null; openRunView(); renderRun(); }

/* ---------- 事件 ---------- */
function runAction(a, v) {
  const r = S.run, n = r && curNode();
  switch (a) {
    case 'sayShow': r.said[n.id] = true; persist(); renderRun(); speak(lineText(n.c), 'ja-JP', 0.9); return true;
    case 'runNext': enterNode(n.next); return true;
    case 'hearPlay': playNode(n); return true;
    case 'hearRep': {
      r.rep++;
      if (v === 'easy') { if (n.easy) { r.easy[n.id] = true; toast('你說：' + plainJp(REP.easy.jp)); playNode(n, 'easy'); }
        else { toast('他已經說得很簡單了，可以請他說慢一點'); playNode(n, 'slow'); } }
      else { toast('你說：' + plainJp(REP[v].jp)); playNode(n, v === 'slow' ? 'slow' : ''); }
      persist(); renderRun(); return true;
    }
    case 'hearVis': r.vis[n.id] = v; if (v === 'full') r.flags.text = true; else r.flags.hint = true; persist(); renderRun(); return true;
    case 'hearZh': r.zh[n.id] = true; r.flags.text = true; persist(); renderRun(); return true;
    case 'hearQ': answerQ(+v); return true;
    case 'hearNextQ': { const ans = r.ans[n.id] || {}, nx = activeQs(n).find(x => ans[x.i] === undefined); r.cq[n.id] = nx ? nx.i : undefined; persist(); renderRun(); return true; }
    case 'hearDone': finishHear(n); enterNode(n.next); return true;
    case 'actZh': r.zh[n.id] = true; persist(); renderRun(); return true;
    case 'actPick': {
      if (r.pick[n.id] !== undefined) return true;
      const o = n.o[+v]; if (!o) return true; r.pick[n.id] = +v;
      if (o.fix || o.g === 'part') r.flags.help = true;
      if (o.g === 'bad') r.flags.bad = true;
      const lg = L(); lg.jp++; if (o.g === 'ok') lg.jpOk++;
      touchStreak(); addXp(o.g === 'ok' ? 6 : 1); persist(); renderRun();
      if (o.c && S.settings.autoSpeak) speak(lineText(o.c), 'ja-JP', 0.9);
      requestAnimationFrame(() => { const fb = document.querySelector('#runBody .fb'); fb && fb.scrollIntoView({behavior:'smooth', block:'nearest'}); });
      return true;
    }
    case 'actRe': delete r.pick[n.id]; persist(); renderRun(); return true;
    case 'actGo': { const o = n.o[r.pick[n.id]]; delete r.pick[n.id]; enterNode(o.next); return true; }
  }
  return false;
}

/* ---------- 句塊說明 ---------- */
function exampleOf(id) {
  for (const t of TASKS) for (let lv = 1; lv <= 5; lv++) for (const v of t.v[lv]) for (const nid in v.nodes) { const n = v.nodes[nid];
    if (n.t === 'hear' && n.c.includes(id)) return {c:n.c, zh:n.zh}; if (n.t === 'hear' && n.easy && n.easy.c.includes(id)) return {c:n.easy.c, zh:n.easy.zh}; }
  return null;
}
function ckSheet(id) {
  const k = CK[id], st = S.ck[id], ex = exampleOf(id);
  const dots = rec => rec ? '●'.repeat(Math.min(4, rec.s)) + '○'.repeat(Math.max(0, 4 - Math.min(4, rec.s))) : '○○○○';
  return `<div class="row"><div style="flex:1;min-width:0">${lineHtml([id], {big:true})}</div>${spkBtn(plainJp(k.jp), 'ja-JP')}</div>
    <p style="font-size:20px;font-weight:800">${esc(k.zh)}</p><p class="small muted">${esc(CAT[k.cat])}${CRIT.has(k.cat) ? '・會影響行動的資訊' : ''}</p>
    ${k.note ? `<p class="rule j">${esc(k.note)}</p>` : ''}
    ${st ? `<p class="small">看字 <span class="tnum">${dots(st.t)}</span>　聽音 <span class="tnum">${dots(st.l)}</span></p>` : '<p class="small muted">還沒在對話裡遇過</p>'}
    ${ex ? `<div class="card flat stack" style="gap:4px"><p class="small muted">在對話裡：</p>${lineHtml(ex.c)}<p class="small muted">${esc(ex.zh)}</p></div>` : ''}
    <button class="btn block" data-a="ckWeak" data-v="${id}">${st && st.weak ? '已標成不熟（會優先複習）' : '標成不熟，優先複習'}</button>`;
}
