/* ================= 鎖屏聽力（oral-audio batch01） =================
   - 用真正的 <audio> 播放打包在 index.html 裡的 MP3（ORAL_AUDIO，由 oral-audio/tools/build-embed.cjs 產生），
     不用 Web Speech，所以螢幕鎖住後 iPhone 鎖定畫面／控制中心可以暫停、上一句、下一句（Media Session）。
   - 自己的設定與位置只存在 bnk-lockplay-v1 = {i, speed, auto}；不寫 bnk-state-v1，壞掉只會從第 1 句開始。
   - <audio> 放在 body 底下（#lpAudio），畫面重畫不會中斷播放。 */
const LPK = 'bnk-lockplay-v1';
const LP = {open:false, playing:false, urls:{}};
function lpItems() { return (globalThis.ORAL_AUDIO && ORAL_AUDIO.items) || []; }
function lpStored() {
  if (LP.o !== undefined) return LP.o;
  let o = null, raw = null; try { raw = localStorage.getItem(LPK); o = JSON.parse(raw || 'null'); } catch (e) { o = null; bnkBackupRaw(LPK, raw); }
  return (LP.o = o);
}
function lpPref() {
  if (LP.p) return LP.p;
  const o = lpStored(), n = lpItems().length;
  const p = {i:o && o.i >= 0 && (!n || o.i < n) ? o.i | 0 : 0, speed:o && o.speed === 'slow' ? 'slow' : 'normal', auto:!(o && o.auto === false)};
  if (n) LP.p = p; // 音檔資料還沒載完時不定案，避免把上次的位置夾成 0
  return p;
}
function lpReady() { return lpItems().length > 0; }
function lpSave() { if (!lpReady()) return; try { localStorage.setItem(LPK, JSON.stringify(lpPref())); } catch (e) {} }
/* 音檔資料放在 index.html 最後一段 script 標籤（第一個畫面先出來），載完會發 bnk-audio-ready */
window.addEventListener('bnk-audio-ready', () => { if (LP.open) lpRender(); const s = $('#lpSlot'); if (s) s.outerHTML = lpCardHtml(); });
function lpAudio() {
  let a = $('#lpAudio');
  if (!a) { a = document.createElement('audio'); a.id = 'lpAudio'; a.preload = 'auto'; a.setAttribute('playsinline', ''); document.body.append(a);
    a.addEventListener('ended', lpEnded); a.addEventListener('play', () => { LP.playing = true; lpMs(); lpRender(); });
    a.addEventListener('pause', () => { LP.playing = false; lpMs(); lpRender(); }); }
  return a;
}
// data URI → blob: URL（iOS 對長 data URI 的 <audio> 比較挑）；失敗就直接用 data URI。
function lpUrl(it, sp) {
  const k = it.id + ':' + sp; if (LP.urls[k]) return LP.urls[k];
  const d = it[sp]; let u = d;
  try { const b = atob(d.slice(d.indexOf(',') + 1)), u8 = new Uint8Array(b.length); for (let j = 0; j < b.length; j++) u8[j] = b.charCodeAt(j);
    u = URL.createObjectURL(new Blob([u8], {type:'audio/mpeg'})); } catch (e) { u = d; }
  return (LP.urls[k] = u);
}
function lpLoad(play) {
  const p = lpPref(), it = lpItems()[p.i]; if (!it) return;
  const a = lpAudio(); a.src = lpUrl(it, p.speed); a.dataset.id = it.id; a.dataset.speed = p.speed;
  lpMs(); lpSave();
  if (play) { const pr = a.play(); if (pr && pr.catch) pr.catch(() => { LP.playing = false; lpRender(); }); }
}
function lpEnded() { const p = lpPref(); if (!p.auto) { LP.playing = false; lpRender(); return; } lpGo(1, true); }
function lpGo(d, play) {
  const p = lpPref(), n = lpItems().length; if (!n) return;
  p.i = (p.i + d + n) % n;
  lpLoad(play === undefined ? LP.playing : play); lpRender();
}
function lpToggle() {
  const a = lpAudio();
  if (!a.src || a.dataset.id !== (lpItems()[lpPref().i] || {}).id || a.dataset.speed !== lpPref().speed) { lpLoad(true); return; }
  if (a.paused) { const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); } else a.pause();
}
function lpSpeed(sp) { const p = lpPref(); if (p.speed === sp) return; p.speed = sp; lpLoad(LP.playing); lpRender(); }
function lpMs() {
  const ms = navigator.mediaSession; if (!ms) return;
  const it = lpItems()[lpPref().i]; if (!it) return;
  try {
    if (typeof MediaMetadata === 'function') ms.metadata = new MediaMetadata({title:it.ja, artist:it.zh, album:`鎖屏聽力・${lpPref().speed === 'slow' ? '慢速' : '正常'}・${it.n}/${lpItems().length}`});
    if (!LP.msSet) { LP.msSet = true;
      const h = {play:() => lpToggle(), pause:() => lpAudio().pause(), stop:() => lpAudio().pause(), previoustrack:() => lpGo(-1, true), nexttrack:() => lpGo(1, true)};
      for (const [k, f] of Object.entries(h)) { try { ms.setActionHandler(k, f); } catch (e) {} } }
    ms.playbackState = LP.playing ? 'playing' : 'paused';
  } catch (e) {}
}
function lpOpen() {
  closeSheet();
  try { lsStop(); } catch (e) {} try { speechSynthesis.cancel(); } catch (e) {}
  LP.open = true;
  let el = $('#lpv');
  if (!el) { el = document.createElement('div'); el.id = 'lpv'; el.className = 'overlay jpmode'; document.body.append(el); }
  el.hidden = false; document.body.style.overflow = 'hidden';
  lpRender();
}
function lpClose() { const a = $('#lpAudio'); if (a) a.pause(); lpSave(); LP.open = false; const el = $('#lpv'); if (el) el.hidden = true; document.body.style.overflow = ''; render(); homeTop(); }
function lpRender() {
  const el = $('#lpv'); if (!el || !LP.open) return;
  const items = lpItems(), p = lpPref(), it = items[p.i];
  if (!it) { el.innerHTML = `<div class="ov-head"><button class="icon-btn" data-a="lpClose" aria-label="關閉">${IC.x}</button></div><div class="ov-body"><div class="in"><p role="status">${lpReady() ? '沒有音檔。' : '音檔載入中…（第一次打開需要多等幾秒）'}</p></div></div>`; return; }
  el.innerHTML = `<div class="ov-head"><button class="icon-btn" data-a="lpClose" aria-label="關閉鎖屏聽力">${IC.x}</button><div class="prog" aria-hidden="true"><i style="width:${(p.i + 1) / items.length * 100}%"></i></div><span class="small muted tnum">${p.i + 1}/${items.length}</span></div>
    <div class="ov-body"><div class="in">
      <div><p class="small muted">鎖屏聽力・${esc(it.task)}</p><h2 style="font-size:21px">第 ${it.n} 句</h2></div>
      <section class="card stack" style="gap:8px;min-height:170px;justify-content:center" id="lpCard" data-id="${esc(it.id)}">
        <p class="who">${esc(it.who)}</p>
        <div class="jl"><div class="xro">${esc(it.romaji)}</div><div class="jp big" lang="ja">${rubyHtml(it.jaRuby)}</div></div>
        <p class="muted" style="font-size:16px">${esc(it.zh)}</p>
      </section>
      <div class="row" style="justify-content:center;gap:12px">
        <button class="btn" data-a="lpGo" data-v="-1">上一句</button>
        <button class="btn jp-b" style="min-width:132px;min-height:64px;font-size:19px" data-a="lpToggle">${LP.playing ? '暫停' : '播放'}</button>
        <button class="btn" data-a="lpGo" data-v="1">下一句</button>
      </div>
      <div class="seg" role="group" aria-label="速度"><button data-a="lpSpeed" data-v="normal" aria-pressed="${p.speed === 'normal'}">正常</button><button data-a="lpSpeed" data-v="slow" aria-pressed="${p.speed === 'slow'}">慢速 0.8</button></div>
      <div class="row wrap" style="justify-content:center"><button class="chip" data-a="lpAuto" aria-pressed="${p.auto}">自動下一句</button></div>
      <div class="card flat stack" style="gap:6px">
        <p class="small">按播放後可以鎖螢幕，用鎖定畫面或耳機的按鈕暫停、跳句。</p>
        <p class="small muted">${ORAL_AUDIO.synthetic ? '合成語音（不是真人），重音可能不完全自然。' : ''}${esc(ORAL_AUDIO.credit)}</p>
      </div>
    </div></div>`;
}
function lpCardHtml() {
  const n = lpItems().length;
  if (!n) return `<section class="card stack" style="gap:8px" id="lpSlot"><div><p class="small muted">螢幕鎖住也能聽・交通＋生活</p><p style="font-size:19px;font-weight:800">鎖屏聽力</p>
    <p class="small muted" role="status">音檔載入中…</p></div><button class="btn jp-b block" disabled>開始聽</button></section>`;
  const p = lpPref();
  return `<section class="card stack" style="gap:8px" id="lpSlot"><div><p class="small muted">螢幕鎖住也能聽・交通＋生活</p><p style="font-size:19px;font-weight:800">鎖屏聽力</p>
    <p class="small muted">${n} 句・正常／慢速${p.i ? `・上次到第 ${p.i + 1} 句` : ''}</p></div>
    <button class="btn jp-b block" data-a="lpOpen">${p.i ? '接著聽' : '開始聽'}</button></section>`;
}
