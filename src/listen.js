
/* ================= 耳機模式 =================
   模式：教學（日文→中文→慢速→日文）／連播（熟悉的對話，只放日文）／接話（輪到你時留空，再放參考答案）
   優先播放已經練過的對話；記住播放位置。
   ============================================= */
const LSM = {teach:'教學', flow:'連播', gap:'接話'};
const LS = {open:false, playing:false, list:[], q:[], k:0, gen:0, lock:null, scope:null};
function lsPref() { if (!S.lsp) S.lsp = {mode:'teach', zh:true, pause:1, loop:true, pos:{}}; return S.lsp; }
function goldenPath(v) {
  const out = []; let id = v.start, guard = 0;
  while (id && guard++ < 30) {
    const n = v.nodes[id]; if (!n) break;
    if (n.t === 'say') { out.push({me:true, who:'你', c:n.c, zh:n.zh}); id = n.next; }
    else if (n.t === 'hear') { out.push({me:false, who:n.who || v.who, c:n.c, zh:n.zh}); id = n.next; }
    else if (n.t === 'act') { const o = n.o.find(x => x.g === 'ok' && x.next && !x.fix) || n.o.find(x => x.g === 'ok' && x.next); if (o.c) out.push({me:true, who:'你', c:o.c, zh:o.zh}); id = o.next; }
    else break;
  }
  return out;
}
function lsPlaylist(scope) {
  const out = [];
  TASKS.forEach(t => { if (scope && t.id !== scope) return;
    for (let lv = 1; lv <= t.levels; lv++) { const s = lvPeek(t.id, lv); (s ? s.seen : []).forEach(vid => out.push({vid, last:s.last})); } });
  out.sort((a, b) => b.last - a.last);
  if (!out.length) { const t = scope ? TASK[scope] : TASKS[0]; out.push({vid:t.v[1].find(v => !v.tr).id, preview:true}); }
  return out;
}
function lsKey() { return (LS.scope || 'all') + ':' + lsPref().mode; }
function lsBuild() {
  const p = lsPref(), q = [], gapMul = p.pause;
  LS.list.forEach((it, di) => {
    const v = VAR[it.vid], t = TASK[v.tid], rate = LVR[v.lv], head = {d:di, title:`${t.name}・第 ${v.lv} 級`};
    const say = (text, lang, r, gap, show) => q.push(Object.assign({say:text, lang, rate:r, gap:Math.round(gap * gapMul), show}, head));
    say(`${t.name}，第 ${v.lv} 級。`, 'zh-TW', 1, 500, {zh:v.setup || t.setup});
    const lines = goldenPath(v);
    if (p.mode === 'teach') {
      const weak = [...new Set(lines.filter(l => !l.me).flatMap(l => l.c))].filter(id => CRIT.has(CK[id].cat) && (!S.ck[id] || S.ck[id].l.s < 2)).slice(0, 4);
      weak.forEach(id => { say(spokenJp(CK[id].jp), 'ja-JP', 0.85, 400, {c:[id], zh:CK[id].zh, who:'句塊'}); say(CK[id].zh, 'zh-TW', 1, 600, {c:[id], zh:CK[id].zh, who:'句塊'}); });
    }
    lines.forEach(l => {
      const show = {c:l.c, zh:l.zh, who:l.who}, text = lineText(l.c);
      if (p.mode === 'teach') { say(text, 'ja-JP', rate, 800, show); if (p.zh) say(l.zh, 'zh-TW', 1, 600, show); say(text, 'ja-JP', 0.7, 800, show); say(text, 'ja-JP', rate, 1200, show); }
      else if (p.mode === 'flow') { say(text, 'ja-JP', rate, 900, show); if (p.zh) say(l.zh, 'zh-TW', 1, 900, show); }
      else {
        if (l.me) { if (p.zh) say('你說：' + l.zh, 'zh-TW', 1, 300, Object.assign({}, show, {hide:true})); q.push(Object.assign({say:'', gap:Math.round(5000 * gapMul), show:Object.assign({}, show, {hide:true, yourTurn:true})}, head)); say(text, 'ja-JP', 0.9, 1200, show); }
        else { say(text, 'ja-JP', rate, 1000, show); if (p.zh) say(l.zh, 'zh-TW', 1, 800, show); }
      }
    });
    q.push(Object.assign({say:'', gap:Math.round(1500 * gapMul), show:{zh:'（這段結束）'}}, head));
  });
  LS.q = q;
}
function lsOpen(scope) {
  closeSheet();
  LS.scope = scope || null; LS.list = lsPlaylist(LS.scope); lsBuild();
  const pos = lsPref().pos[lsKey()]; LS.k = pos && pos < LS.q.length ? pos : 0;
  LS.open = true;
  let el = $('#lsv');
  if (!el) { el = document.createElement('div'); el.id = 'lsv'; el.className = 'overlay jpmode'; document.body.append(el); }
  el.hidden = false; document.body.style.overflow = 'hidden';
  lsRender();
}
function lsSavePos() { const p = lsPref(); p.pos[lsKey()] = LS.k; saveLocal(); }
function lsClose() { lsStop(); lsSavePos(); persist(); LS.open = false; const el = $('#lsv'); if (el) el.hidden = true; document.body.style.overflow = ''; render(); }
async function lsWake(on) {
  try {
    if (on && !LS.lock && navigator.wakeLock) { LS.lock = await navigator.wakeLock.request('screen'); LS.lock.addEventListener?.('release', () => { LS.lock = null; }); }
    if (!on && LS.lock) { await LS.lock.release(); LS.lock = null; }
  } catch (e) { LS.lock = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && LS.playing) lsWake(true); });
function lsStop() { LS.playing = false; LS.gen++; try { speechSynthesis.cancel(); } catch (e) {} lsWake(false); }
function lsToggle() {
  if (LS.playing) { lsStop(); lsSavePos(); lsRender(); return; }
  if (!canSpeak) { toast('這台裝置不能播放聲音'); return; }
  LS.playing = true; LS.gen++; lsWake(true); lsStep(LS.gen); lsRender();
}
function lsStep(gen) {
  if (gen !== LS.gen || !LS.playing) return;
  if (LS.k >= LS.q.length) { if (!lsPref().loop) { lsStop(); LS.k = 0; lsSavePos(); lsRender(); return; } LS.k = 0; }
  const it = LS.q[LS.k], myK = LS.k; let fired = false;
  lsRender(); if (LS.k % 4 === 0) lsSavePos();
  const done = () => {
    if (fired) return; fired = true;
    if (gen !== LS.gen || !LS.playing || LS.k !== myK) return;
    setTimeout(() => { if (gen !== LS.gen || !LS.playing || LS.k !== myK) return; LS.k++; lsStep(gen); }, it.gap || 600);
  };
  if (!it.say) { done(); return; }
  speak(it.say, it.lang, it.rate, done);
  setTimeout(done, 1500 + it.say.length * (it.lang.startsWith('ja') ? 260 : 330) / ((it.rate || 1) * S.settings.rate));
}
function lsSkip(dir) {
  const cur = LS.q[LS.k] ? LS.q[LS.k].d : 0, target = Math.max(0, Math.min(LS.list.length - 1, cur + dir));
  LS.k = Math.max(0, LS.q.findIndex(x => x.d === target)); lsSavePos();
  if (LS.playing) { LS.gen++; try { speechSynthesis.cancel(); } catch (e) {} lsStep(LS.gen); } else lsRender();
}
function lsSet(k, v) {
  const p = lsPref(), cur = LS.q[LS.k] ? LS.q[LS.k].d : 0;
  if (k === 'mode') p.mode = v; else if (k === 'pause') p.pause = +v; else p[k] = !p[k];
  lsBuild(); LS.k = Math.max(0, LS.q.findIndex(x => x.d === cur)); persist();
  if (LS.playing) { LS.gen++; try { speechSynthesis.cancel(); } catch (e) {} lsStep(LS.gen); } else lsRender();
}
function lsRender() {
  const el = $('#lsv'); if (!el || !LS.open) return;
  const p = lsPref(), it = LS.q[LS.k] || LS.q[0], s = it.show || {}, di = it.d;
  const preview = LS.list.some(x => x.preview);
  el.innerHTML = `<div class="ov-head"><button class="icon-btn" data-a="lsClose" aria-label="關閉耳機模式">${IC.x}</button><div class="prog" aria-hidden="true"><i style="width:${(LS.k / Math.max(1, LS.q.length)) * 100}%"></i></div><span class="small muted tnum">${di + 1}/${LS.list.length} 段</span></div>
    <div class="ov-body"><div class="in">
      <div><p class="small muted">耳機模式・${LSM[p.mode]}${LS.scope ? '・' + esc(TASK[LS.scope].name) : '・練過的對話'}</p><h2 style="font-size:21px">${esc(it.title)}</h2></div>
      ${preview ? '<p class="small muted">你還沒練過對話，先放第 1 級給你預習。</p>' : ''}
      <section class="card stack" style="gap:8px;min-height:170px;justify-content:center">
        ${s.who ? `<p class="who">${esc(s.who)}</p>` : ''}
        ${s.yourTurn ? '<p style="font-size:20px;font-weight:800">輪到你說</p><p class="muted">先自己說，等一下會播參考答案。</p>' : s.c && !s.hide ? lineHtml(s.c, {big:true}) : ''}
        ${s.zh && !s.yourTurn ? `<p class="muted" style="font-size:16px">${esc(s.zh)}</p>` : ''}
      </section>
      <div class="row" style="justify-content:center;gap:12px">
        <button class="btn" data-a="lsSkip" data-v="-1">上一段</button>
        <button class="btn jp-b" style="min-width:132px;min-height:64px;font-size:19px" data-a="lsToggle">${LS.playing ? '暫停' : '播放'}</button>
        <button class="btn" data-a="lsSkip" data-v="1">下一段</button>
      </div>
      <div class="seg" role="group" aria-label="模式">${Object.entries(LSM).map(([k, l]) => `<button data-a="lsSet" data-k="mode" data-v="${k}" aria-pressed="${p.mode === k}">${l}</button>`).join('')}</div>
      <p class="small muted">${p.mode === 'teach' ? '教學：先念不熟的句塊，每句播「日文→中文→慢速→日文」。' : p.mode === 'flow' ? '連播：熟悉的對話照正常速度連著播，不重複。' : '接話：輪到你時留空，先自己說，再播參考答案。'}</p>
      <div class="row wrap" style="justify-content:center">
        <button class="chip" data-a="lsSet" data-k="zh" aria-pressed="${p.zh}">中文解說</button>
        <button class="chip" data-a="lsSet" data-k="loop" aria-pressed="${p.loop}">全部循環</button>
        ${[[0.6, '停頓短'], [1, '停頓中'], [1.6, '停頓長']].map(([v, l]) => `<button class="chip" data-a="lsSet" data-k="pause" data-v="${v}" aria-pressed="${p.pause === v}">${l}</button>`).join('')}
      </div>
      <div class="card flat stack" style="gap:6px">
        <p class="small">播放時請讓螢幕保持亮著，App 會盡量讓螢幕不暗。iPhone 鎖定螢幕或切到別的 App，聲音會停（目前不支援鎖屏播放）。</p>
        <p class="small muted">騎車時音量開小一點，留意路況。</p>
      </div>
      <p class="sec-title">播放清單（${LS.list.length} 段，最近練的在前）</p>
      <div class="list">${LS.list.map((x, i) => { const v = VAR[x.vid]; return `<div class="li" style="${i === di ? 'background:var(--jp-soft)' : ''}"><div class="grow"><div style="font-weight:700">${esc(TASK[v.tid].name)}・第 ${v.lv} 級</div><div class="zh">${esc(v.note || '')}${v.tr ? '・換說法' : ''}</div></div></div>`; }).join('')}</div>
    </div></div>`;
}
