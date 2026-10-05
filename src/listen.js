
/* ================= 耳機模式：不用操作手機，反覆聽練過的對話 ================= */
const LS = {open:false, playing:false, list:[], q:[], k:0, gen:0, zh:true, words:true, loop:true, lock:null, cur:null, sidOnly:null};
function lsPlaylist(sid) {
  const out = [];
  DLG.forEach(d => {
    if (sid && d.id !== sid) return;
    const st = dlgSt(d.id);
    for (let l = 1; l <= 5; l++) if (sid ? l <= st.un : st.rec[l]) out.push({sid:d.id, lv:l});
  });
  if (!out.length) DLG.forEach(d => out.push({sid:d.id, lv:1}));
  return out;
}
function lsBuild() {
  const q = [];
  LS.list.forEach((p, di) => {
    const d = DLG_MAP[p.sid], sc = d.lv[p.lv], rate = LV_RATE[p.lv], good = sc.fu.o.find(o => o.ok);
    const head = {d:di, title:`${d.name}・第 ${p.lv} 級`};
    q.push(Object.assign({say:`${d.name}，第 ${p.lv} 級。`, lang:'zh-TW', gap:600, show:{zh:d.setup}}, head));
    if (LS.words) DLG_W[p.sid][p.lv].forEach(([jp, ro, zh]) => {
      q.push(Object.assign({say:jp.replace(/^〜/, ''), lang:'ja-JP', rate:0.85, gap:500, show:{jp, ro, zh, who:'單字'}}, head));
      if (LS.zh) q.push(Object.assign({say:zh, lang:'zh-TW', gap:700, show:{jp, ro, zh, who:'單字'}}, head));
    });
    [['你', d.me], [sc.who, sc.r1], ['你', good], [sc.who, sc.r2]].forEach(([who, l]) => {
      const show = {jp:l.jp, ro:l.ro, zh:l.zh, who};
      q.push(Object.assign({say:l.jp, lang:'ja-JP', rate, gap:900, show}, head));
      if (LS.zh) q.push(Object.assign({say:l.zh, lang:'zh-TW', gap:700, show}, head));
      q.push(Object.assign({say:l.jp, lang:'ja-JP', rate:0.7, gap:900, show}, head));
      q.push(Object.assign({say:l.jp, lang:'ja-JP', rate, gap:1300, show}, head));
    });
    q.push(Object.assign({say:'', gap:1800, show:{zh:'（這段結束）'}}, head));
  });
  LS.q = q;
}
function lsOpen(sid) {
  closeSheet();
  LS.sidOnly = sid || null; LS.list = lsPlaylist(LS.sidOnly); lsBuild(); LS.k = 0; LS.open = true;
  let el = $('#lsv');
  if (!el) { el = document.createElement('div'); el.id = 'lsv'; el.className = 'overlay jpmode'; document.body.append(el); }
  el.hidden = false; document.body.style.overflow = 'hidden';
  lsRender();
}
function lsClose() {
  lsStop(); LS.open = false; const el = $('#lsv'); if (el) el.hidden = true; document.body.style.overflow = '';
  render();
}
async function lsWake(on) {
  try {
    if (on && !LS.lock && navigator.wakeLock) { LS.lock = await navigator.wakeLock.request('screen'); LS.lock.addEventListener?.('release', () => { LS.lock = null; }); }
    if (!on && LS.lock) { await LS.lock.release(); LS.lock = null; }
  } catch (e) { LS.lock = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && LS.playing) lsWake(true); });
function lsStop() { LS.playing = false; LS.gen++; try { speechSynthesis.cancel(); } catch (e) {} lsWake(false); }
function lsToggle() {
  if (LS.playing) { lsStop(); lsRender(); return; }
  if (!canSpeak) { toast('這台裝置不能播放聲音'); return; }
  LS.playing = true; LS.gen++; lsWake(true); lsStep(LS.gen); lsRender();
}
function lsStep(gen) {
  if (gen !== LS.gen || !LS.playing) return;
  if (LS.k >= LS.q.length) {
    if (!LS.loop) { lsStop(); LS.k = 0; lsRender(); return; }
    LS.k = 0;
  }
  const it = LS.q[LS.k], myK = LS.k; let fired = false;
  lsRender();
  const done = () => {
    if (fired) return; fired = true;
    if (gen !== LS.gen || !LS.playing || LS.k !== myK) return;
    setTimeout(() => { if (gen !== LS.gen || !LS.playing || LS.k !== myK) return; LS.k++; lsStep(gen); }, it.gap || 600);
  };
  if (!it.say) { done(); return; }
  speak(it.say, it.lang, it.rate, done);
  // fallback if the device never reports the end of speech
  setTimeout(done, 1500 + it.say.length * (it.lang.startsWith('ja') ? 260 : 330) / ((it.rate || 1) * S.settings.rate));
}
function lsSkip(dir) {
  const cur = LS.q[LS.k] ? LS.q[LS.k].d : 0, target = Math.max(0, Math.min(LS.list.length - 1, cur + dir));
  LS.k = LS.q.findIndex(x => x.d === target); if (LS.k < 0) LS.k = 0;
  if (LS.playing) { LS.gen++; try { speechSynthesis.cancel(); } catch (e) {} lsStep(LS.gen); } else lsRender();
}
function lsRebuild() {
  const cur = LS.q[LS.k] ? LS.q[LS.k].d : 0;
  lsBuild(); LS.k = Math.max(0, LS.q.findIndex(x => x.d === cur));
  if (LS.playing) { LS.gen++; try { speechSynthesis.cancel(); } catch (e) {} lsStep(LS.gen); } else lsRender();
}
function lsRender() {
  const el = $('#lsv'); if (!el || !LS.open) return;
  const it = LS.q[LS.k] || LS.q[0], s = it.show || {}, di = it.d;
  const opt = (k, label) => `<button class="chip" data-a="lsOpt" data-v="${k}" aria-pressed="${LS[k]}">${label}</button>`;
  el.innerHTML = `<div class="ov-head"><button class="icon-btn" data-a="lsClose" aria-label="關閉耳機模式">${IC.x}</button><div class="prog" aria-hidden="true"><i style="width:${(LS.k / Math.max(1, LS.q.length)) * 100}%"></i></div><span class="small muted tnum">${di + 1}/${LS.list.length} 段</span></div>
    <div class="ov-body"><div class="in">
      <div><p class="small muted">耳機模式${LS.sidOnly ? '・' + esc(DLG_MAP[LS.sidOnly].name) : '・練過的對話'}</p><h2 style="font-size:22px">${esc(it.title)}</h2></div>
      <section class="card stack" style="gap:8px;min-height:180px;justify-content:center">
        ${s.who ? `<p class="who">${esc(s.who)}</p>` : ''}
        ${s.jp ? jline(s.jp, s.ro, true) : ''}
        ${s.zh ? `<p class="muted" style="font-size:16px">${esc(s.zh)}</p>` : ''}
      </section>
      <div class="row" style="justify-content:center;gap:14px">
        <button class="btn" data-a="lsSkip" data-v="-1" aria-label="上一段">上一段</button>
        <button class="btn jp-b" style="min-width:140px;min-height:64px;font-size:19px" data-a="lsToggle">${LS.playing ? '暫停' : '開始播放'}</button>
        <button class="btn" data-a="lsSkip" data-v="1" aria-label="下一段">下一段</button>
      </div>
      <div class="chips" style="justify-content:center">${opt('words', '先念關鍵字')}${opt('zh', '中文解說')}${opt('loop', '全部循環')}</div>
      <div class="card flat stack" style="gap:6px">
        <p class="small">每一句的播放順序：日文 → ${LS.zh ? '中文意思 → ' : ''}慢速日文 → 正常日文。</p>
        <p class="small muted">播放時請讓螢幕保持亮著，App 會盡量讓螢幕不暗下來。iPhone 鎖定螢幕或切到別的 App，聲音就會停。</p>
        <p class="small muted">騎車時音量開小一點，留意路況。</p>
      </div>
      <p class="sec-title">這次會播的對話（${LS.list.length} 段）</p>
      <div class="list">${LS.list.map((p, i) => `<div class="li" style="${i === di ? 'background:var(--jp-soft)' : ''}"><div class="grow"><div style="font-weight:700">${esc(DLG_MAP[p.sid].name)}</div><div class="zh">第 ${p.lv} 級・${LV_NAME[p.lv]}</div></div></div>`).join('')}</div>
    </div></div>`;
}
