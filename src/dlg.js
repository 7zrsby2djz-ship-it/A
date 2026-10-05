
/* ================= 把對話走完 (listening-first dialogue practice) ================= */
function dlgSt(sid) { return S.dlg[sid] || (S.dlg[sid] = {un:1, rec:{}, pass:{}}); }
function dlgScript(ctx) { return DLG_MAP[ctx.sid].lv[ctx.lv]; }
function mkRec() { return {s:0, due:0, ok:0, ng:0, lapse:0, conf:{}, t0:Date.now(), last:0}; }
function dlgDue() {
  const t = Date.now(), out = [];
  DLG.forEach(d => { const st = S.dlg[d.id]; if (!st) return; for (const lv in st.rec) { const r = st.rec[lv]; if (r.s < 7 && r.due <= t) out.push({sid:d.id, lv:+lv}); } });
  return out;
}
function dlgNext() {
  for (const d of DLG) { const st = dlgSt(d.id); if (!st.rec[st.un]) return {sid:d.id, lv:st.un}; }
  return null;
}
function dlgCards(sid, lv) {
  const ctx = {sid, lv, ok:0, n:0, rep:0, peek:false, miss:[], wrongK:{r1:[], r2:[]}, fuOk:null};
  return [{t:'dIntro', ctx}, {t:'dRound', ctx, r:'r1'}, {t:'dFollow', ctx}, {t:'dRound', ctx, r:'r2'}, {t:'dEnd', ctx}];
}
function startDlg() {
  const due = shuffle(dlgDue()).slice(0, 2), picks = due.slice();
  const room = due.length ? 1 : 2;
  for (const d of DLG) {
    if (picks.length >= due.length + room) break;
    const st = dlgSt(d.id);
    if (!st.rec[st.un] && !picks.some(p => p.sid === d.id && p.lv === st.un)) picks.push({sid:d.id, lv:st.un});
  }
  if (!picks.length) shuffle(DLG).slice(0, 2).forEach(d => picks.push({sid:d.id, lv:dlgSt(d.id).un}));
  startSession('jp', picks.flatMap(p => dlgCards(p.sid, p.lv)), '對話練習', {dlg:true});
}
function startDlgOne(sid, lv) { closeSheet(); startSession('jp', dlgCards(sid, lv), DLG_MAP[sid].name, {dlg:true}); }

function jl2(jp, ro, size) { return `<span class="jline"><span class="ro">${esc(ro)}</span><span class="jp" ${size ? `style="font-size:${size}px"` : ''}>${esc(jp)}</span></span>`; }
function dlgLine(c) { const sc = dlgScript(c.ctx); return sc[c.r]; }
function playLine(c, mode) {
  const L = dlgLine(c), lv = c.ctx.lv;
  if (mode === 'slow') { if (L.easy) speak(L.easy.jp, 'ja-JP', 0.8); else speak(L.jp, 'ja-JP', 0.7); }
  else speak(L.jp, 'ja-JP', LV_RATE[lv]);
}

function sesDIntro(c) {
  const d = DLG_MAP[c.ctx.sid], sc = dlgScript(c.ctx), lv = c.ctx.lv;
  const b = `<p class="small muted">${esc(d.place)}</p><h2 style="font-size:24px">${esc(d.name)}</h2>
    <div class="row wrap"><span class="pill lvp">第 ${lv} 級・${LV_NAME[lv]}</span><span class="small muted">回答你的人：${esc(sc.who)}</span></div>
    <p style="font-size:17px">${esc(d.setup)}</p>
    <section class="stack" style="gap:8px"><p class="sec-title" style="margin:0">先認識這幾個字</p>
      <div class="list">${DLG_W[c.ctx.sid][lv].map(wordRow).join('')}</div>
      <p class="small muted">不熟的按「不熟」，會加到單字卡，之後另外練。</p></section>
    <section class="card stack" style="gap:6px"><p class="who" style="color:var(--en-ink)">你先開口</p>
      <div class="row" style="align-items:flex-end"><div style="flex:1;min-width:0">${jline(d.me.jp, d.me.ro)}<p class="small muted">${esc(d.me.zh)}</p></div>${spkBtn(d.me.jp, 'ja-JP')}</div></section>
    <p class="small muted">先自己唸出來。下一步對方會回答，先只用聽的，不給你看字。日本人不會照課本回答，抓到重點就好。</p>`;
  return [b, `<button class="btn primary block" data-a="next">說完了，聽他怎麼回</button>`];
}

function sesDRound(c) {
  const sc = dlgScript(c.ctx), L = sc[c.r];
  if (!SES.d) SES.d = {ans:{}, ord:L.q.map(q => shuffle(q.o.map((_, i) => i))), shown:false, easy:false};
  const d = SES.d, nAns = Object.keys(d.ans).length, done = nAns === L.q.length, reveal = done || d.shown || !canSpeak;
  const wrongK = new Set(L.q.filter((q, qi) => d.ans[qi] !== undefined && d.ans[qi] !== 0).map(q => q.k));
  let b = `<div class="bubble"><div class="grow"><p class="who">${esc(sc.who)}${c.r === 'r2' ? '・第二輪' : ''}</p>
    ${reveal ? jline(L.jp, L.ro) + `<p class="small muted" style="margin-top:4px">${esc(L.zh)}</p>`
      + (d.easy && L.easy ? `<p class="small" style="margin-top:8px">你請他說慢一點，他換了簡單的說法：</p>${jline(L.easy.jp, L.easy.ro)}<p class="small muted">${esc(L.easy.zh)}</p>` : '')
      : `<p class="muted" style="padding-block:6px">先聽，還不給你看字。</p>`}
    </div></div>`;
  if (canSpeak) b += `<button class="btn jp-b block" data-a="dPlay">${IC.speak}再聽一次</button>
    <div class="repair">${['again', 'slow'].map(k => `<button class="rep" data-a="dRep" data-v="${k}"><span class="jpf">${esc(REPAIR[k].jp)}</span><span class="small muted">${S.settings.romaji ? esc(REPAIR[k].ro) + '・' : ''}${esc(REPAIR[k].zh)}</span></button>`).join('')}</div>
    <p class="small muted" style="margin-top:-6px">聽不懂就用上面兩句。在日本真的可以這樣說，不扣分。</p>`;
  else b += `<p class="small muted">這台裝置不能播放聲音，先用看的練習。</p>`;
  b += L.q.map((q, qi) => {
    const a = d.ans[qi], answered = a !== undefined;
    return `<section class="stack" style="gap:8px"><p class="q" style="font-size:17px">${L.q.length > 1 ? (qi + 1) + '. ' : ''}${esc(q.q)}</p>
      <div class="opts">${d.ord[qi].map(oi => `<button class="opt ${answered && oi === 0 ? 'correct' : answered && oi === a ? 'wrong' : ''}" data-a="dq" data-v="${qi}:${oi}" ${answered ? 'disabled' : ''}>${esc(q.o[oi])}</button>`).join('')}</div>
      ${answered && a !== 0 ? `<div class="fb no" style="padding:12px 14px"><p>答案是「${esc(q.o[0])}」。關鍵在這一塊：<b class="jpf">${esc(L.ch[q.k][0])}</b>＝${esc(L.ch[q.k][1])}</p><p class="small muted">這題考的是：${TAG[q.tag]}</p></div>` : ''}
    </section>`;
  }).join('');
  if (!reveal) b += `<button class="btn ghost sm" style="align-self:center" data-a="dPeek">聽不出來，直接看字</button>`;
  if (done) b += `<p class="sec-title">拆開來看</p><div class="list">${L.ch.map(([j, z], i) => `<div class="li ${wrongK.has(i) ? 'keych' : ''}" style="align-items:flex-start"><div class="grow"><div class="jpf" style="font-weight:700;font-size:18px">${esc(j)}</div><div class="small muted" style="white-space:normal">${esc(z)}</div></div></div>`).join('')}</div>`;
  const f = done ? `<button class="btn primary block" data-a="next">${c.r === 'r1' ? '決定怎麼接話' : '看結果'}</button>` : `<p class="small muted" style="text-align:center">聽完，回答上面的問題（${nAns}/${L.q.length}）</p>`;
  return [b, f];
}

function sesDFollow(c) {
  const sc = dlgScript(c.ctx), fu = sc.fu;
  if (!SES.d) SES.d = {ord:shuffle(fu.o.map((_, i) => i)), pick:null};
  const d = SES.d, picked = d.pick !== null, okI = fu.o.findIndex(o => o.ok);
  let b = `<div class="bubble"><div class="grow"><p class="who">${esc(sc.who)}剛剛說</p>${jline(sc.r1.jp, sc.r1.ro)}<p class="small muted" style="margin-top:4px">${esc(sc.r1.zh)}</p></div></div>
    <p class="q">你要怎麼接？</p>
    <div class="opts">${d.ord.map(oi => { const o = fu.o[oi];
      return `<button class="opt ${picked && o.ok ? 'correct' : picked && oi === d.pick ? 'wrong' : ''}" data-a="dfu" data-v="${oi}" ${picked ? 'disabled' : ''}><span style="min-width:0">${jl2(o.jp, o.ro, 18)}${picked ? `<span class="sub">${esc(o.zh)}</span>` : ''}</span></button>`; }).join('')}</div>`;
  if (picked) {
    const p = fu.o[d.pick], g = fu.o[okI];
    b += p.ok ? `<div class="fb ok"><h3>好的接法</h3><p>${esc(p.why)}</p></div>`
      : `<div class="fb no"><h3>這樣接會卡住</h3><p>${esc(p.why)}</p><p>比較好的接法：<b class="jpf">${esc(g.jp)}</b>（${esc(g.zh)}）</p><p class="small muted">${esc(g.why)}</p></div>`;
    b += `<div class="row"><p class="small muted" style="flex:1">對話會照好的接法繼續。</p>${spkBtn(g.jp, 'ja-JP', '聽這句')}</div>`;
  }
  return [b, picked ? `<button class="btn primary block" data-a="next">說出口，聽他怎麼回</button>` : `<p class="small muted" style="text-align:center">選一句你會說的話</p>`];
}

function sesDEnd(c) {
  const ctx = c.ctx, d = DLG_MAP[ctx.sid], sc = dlgScript(ctx), g = sc.fu.o.find(o => o.ok);
  const tags = [...new Set(ctx.miss)];
  const more = SES.cards.slice(SES.i + 1).length > 0;
  const b = `<div class="done-hero" style="padding-top:8px"><h2 style="font-size:24px">${ctx.pass ? '這段對話走完了！' : '走完了，有幾個地方漏聽'}</h2>
      <p class="muted">${esc(d.name)}・第 ${ctx.lv} 級</p></div>
    <section class="card stack" style="gap:6px"><p class="sec-title" style="margin:0">結果</p><p style="font-size:18px;font-weight:700">${esc(sc.end)}</p></section>
    <div class="kpis">
      <div class="kpi"><span class="small muted">聽懂</span><b class="tnum">${ctx.ok} / ${ctx.n}</b><span class="small muted">第一次就答對</span></div>
      <div class="kpi"><span class="small muted">請對方重說</span><b class="tnum">${ctx.rep} 次</b><span class="small muted">不扣分</span></div>
    </div>
    ${tags.length ? `<p class="small">這次漏掉的：${tags.map(t => `<span class="pill st-conf" style="margin-right:4px">${TAG[t]}</span>`).join('')}</p>` : ''}
    ${ctx.unlocked ? `<div class="fb ok"><h3>第 ${ctx.unlocked} 級解鎖了</h3><p>下一級的回答會${LV_NAME[ctx.unlocked]}。</p></div>`
      : ctx.pass ? '' : `<p class="small muted">${ctx.peek ? '這次有直接看字，' : ''}這一段會很快再出現。全部第一次就聽懂、而且沒有直接看字，才算通過。</p>`}
    <section class="stack" style="gap:8px"><p class="sec-title" style="margin:0">這段的關鍵字・還不熟就加入單字卡</p><div class="list">${DLG_W[ctx.sid][ctx.lv].map(wordRow).join('')}</div></section>
    <details class="card flat"><summary style="cursor:pointer;min-height:28px;font-weight:700">整段對話</summary>
      <div class="stack" style="gap:10px;margin-top:10px">
        ${[['你', d.me], [sc.who, sc.r1], ['你', g], [sc.who, sc.r2]].map(([w, l]) => `<div><p class="who">${esc(w)}</p><div class="row" style="align-items:flex-end"><div style="flex:1;min-width:0">${jline(l.jp, l.ro)}<p class="small muted">${esc(l.zh)}</p></div>${spkBtn(l.jp, 'ja-JP')}</div></div>`).join('')}
      </div></details>`;
  return [b, `<button class="btn primary block" data-a="next">${more ? '下一段對話' : '完成'}</button>`];
}

function finalizeDlg(ctx) {
  if (ctx.done) return; ctx.done = true;
  ctx.pass = ctx.ok === ctx.n && !ctx.peek;
  const st = dlgSt(ctx.sid), rec = st.rec[ctx.lv] || mkRec();
  grade(rec, ctx.pass); if (ctx.pass && rec.s < 2) { rec.s = 2; rec.due = Date.now() + IV[2]; } st.rec[ctx.lv] = rec;
  if (ctx.pass) { st.pass[ctx.lv] = (st.pass[ctx.lv] || 0) + 1; if (ctx.lv === st.un && ctx.lv < 5) { st.un++; ctx.unlocked = st.un; } }
  addXp(ctx.pass ? 20 : 5); persist();
}
function answerDq(v) {
  const c = curCard(), L = dlgLine(c), d = SES.d, [qi, oi] = v.split(':').map(Number);
  if (!d || d.ans[qi] !== undefined) return;
  d.ans[qi] = oi; const ok = oi === 0, q = L.q[qi], ctx = c.ctx;
  ctx.n++; if (ok) ctx.ok++; else { ctx.miss.push(q.tag); S.dlgMiss[q.tag] = (S.dlgMiss[q.tag] || 0) + 1; }
  SES.stats.n++; if (ok) SES.stats.ok++;
  const lg = L_(); lg.jp++; if (ok) lg.jpOk++;
  touchStreak(); addXp(ok ? 8 : 1); persist(); renderSes();
}
function answerFu(v) {
  const c = curCard(), d = SES.d; if (!d || d.pick !== null) return;
  const fu = dlgScript(c.ctx).fu, oi = +v, ok = !!fu.o[oi].ok, ctx = c.ctx;
  d.pick = oi; ctx.n++; if (ok) ctx.ok++; else { ctx.miss.push('fu'); S.dlgMiss.fu = (S.dlgMiss.fu || 0) + 1; }
  SES.stats.n++; if (ok) SES.stats.ok++;
  const lg = L_(); lg.jp++; if (ok) lg.jpOk++;
  touchStreak(); addXp(ok ? 8 : 1); persist(); renderSes();
  if (S.settings.autoSpeak) speak(fu.o.find(o => o.ok).jp, 'ja-JP', 0.9);
  requestAnimationFrame(() => { const fb = document.querySelector('#sesBody .fb'); fb && fb.scrollIntoView({behavior:'smooth', block:'nearest'}); });
}
function L_() { return L(); }

/* ---- 日文頁：對話清單 ---- */
function dlgListHtml() {
  const miss = Object.entries(S.dlgMiss).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return `<p class="muted small">你先開口，日本人用自然的日文回答。先只用聽的抓重點，再決定怎麼接。每個情境有 5 級，回答會越來越像真的日本人。</p>
    ${miss.length ? `<div class="card flat stack" style="gap:6px"><p class="sec-title" style="margin:0">你最常漏聽的</p><p>${miss.map(([t, n]) => `${TAG[t]} <span class="muted small">${n} 次</span>`).join('　')}</p></div>` : ''}
    <button class="btn jp-b block" data-a="lsOpen">${IC.speak}耳機模式：反覆聽練過的對話</button>
    <div class="list">${DLG.map(d => { const st = dlgSt(d.id);
      return `<button class="li" data-a="dlgSit" data-v="${d.id}"><div class="grow"><div style="font-weight:800">${esc(d.name)}</div><div class="zh">${esc(d.place)}</div>
        <div class="lvdots" aria-label="通過到第 ${st.un} 級">${[1, 2, 3, 4, 5].map(l => `<i class="${st.pass[l] ? 'pass' : l === st.un ? 'cur' : ''}"></i>`).join('')}</div></div>${IC.chev}</button>`; }).join('')}</div>
    <p class="small muted">接下來會加：餐廳、飯店、購物，以及數字和時間的聽力小練習。</p>`;
}
function dlgSitSheet(sid) {
  const d = DLG_MAP[sid], st = dlgSt(sid);
  return `<h2 style="font-size:22px">${esc(d.name)}</h2><p class="muted">${esc(d.place)}・${esc(d.setup)}</p>
    <div class="list">${[1, 2, 3, 4, 5].map(l => { const lock = l > st.un, r = st.rec[l];
      return `<button class="li" data-a="dlgGo" data-v="${sid}:${l}" ${lock ? 'disabled style="opacity:.45"' : ''}><div class="grow"><div style="font-weight:800">第 ${l} 級・${LV_NAME[l]}</div>
        <div class="zh">${lock ? `先通過第 ${l - 1} 級` : st.pass[l] ? `通過 ${st.pass[l]} 次${r ? '・下次複習 ' + relDue(r.due) : ''}` : r ? '還沒通過' : '還沒練過'}</div></div>${lock ? '' : IC.chev}</button>`; }).join('')}</div>
    <button class="btn block" data-a="lsOpen" data-v="${sid}">${IC.speak}用耳機模式聽這個情境</button>
    <p class="small muted">通過＝每一題第一次就答對，而且沒有直接看字。請對方重說或說慢一點不扣分。</p>`;
}
function dlgHeroText() {
  const due = dlgDue().length, nx = dlgNext();
  return due ? `${due} 段對話要複習` : nx ? `下一段：${DLG_MAP[nx.sid].name}・第 ${nx.lv} 級` : '可以自由重練任何一級';
}
