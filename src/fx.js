/* ================= fx：動畫＋音效的單一出口（設計見 jp-site-design/proposal.md B、C 段） =================
   - 音效：Kenney Interface Sounds（CC0，assets/sfx/），base64 內嵌在 SFX_DATA（src/sfx.generated.js）。
   - 全 App 只建一個 AudioContext（小店遊戲 game.js 的 sfx() 也走這裡），而且只在「音效開著＋使用者點過畫面」之後才建。
   - 語音優先：日文語音（speechSynthesis）、鎖屏聽力（LP）、耳機模式（LS）、口語分頁播放時一律不出音效；
     語音一開始（u.onstart）就把音效靜音（fx.duck）。答題時用 fx.sfxThen：先播短音效，再念日文，永遠不疊在一起。
   - 減少動畫：S.settings.motion === 'reduce' 或系統 prefers-reduced-motion 時，所有 JS 動畫（pop、shake、彩帶、count-up、
     轉場、進度條補間）都直接跳到結果；音效是另一個開關，照樣播。 */
const FX_KIND = {tap:['select_001', .2], ok:['confirmation_001', .35], bad:['error_008', .25], combo:['maximize_006', .3], done:['confirmation_004', .35]};
const FX_COMBO_AT = n => n === 3 || n === 5 || (n >= 10 && n % 5 === 0);
const fx = {
  ac:null, master:null, buf:{}, live:[], speechUnlocked:false, combo:0, prog:{}, card:{}, seen:new WeakSet(), log:[],
  reduced() { try { return (typeof S !== 'undefined' && S.settings && S.settings.motion === 'reduce') || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } },
  on() { return typeof S !== 'undefined' && S.settings && S.settings.sfx !== false; },
  /* 語音或其他音訊正在播 → 不出音效 */
  busy() {
    try { if (window.speechSynthesis && speechSynthesis.speaking) return 'speech'; } catch (e) {}
    if (typeof LP !== 'undefined' && LP.playing) return 'lockplay';
    if (typeof LS !== 'undefined' && LS.playing) return 'listen';
    if (typeof UI !== 'undefined' && UI.tab === 'oral') return 'oral';
    return '';
  },
  /* 只有音效開著才建 AudioContext；第一次在使用者手勢裡 resume（iOS） */
  ctx() {
    if (!fx.on()) return null;
    if (!fx.ac) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { fx.ac = new AC(); fx.master = fx.ac.createGain(); fx.master.connect(fx.ac.destination); } catch (e) { fx.ac = null; return null; }
      fx.decode();
    }
    if (fx.ac.state === 'suspended') try { fx.ac.resume(); } catch (e) {}
    return fx.ac;
  },
  decode() {
    const data = typeof SFX_DATA !== 'undefined' ? SFX_DATA : {};
    Object.keys(FX_KIND).forEach(k => {
      const src = data[FX_KIND[k][0]]; if (!src || fx.buf[k]) return;
      try {
        const bin = atob(src.split(',')[1]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        const p = fx.ac.decodeAudioData(u8.buffer, b => { fx.buf[k] = b; }, () => {}); if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    });
  },
  /* 播一個短音效；回傳音效長度（秒），沒播就回傳 0 */
  sfx(kind, opt) {
    opt = opt || {};
    if (!fx.on() || !FX_KIND[kind]) return 0;
    const why = fx.busy(); if (why) { fx.log.push({t:Date.now(), ev:'skip:' + kind, why}); return 0; }
    const ac = fx.ctx(), b = fx.buf[kind]; if (!ac || !b) return 0;
    try {
      const s = ac.createBufferSource(), g = ac.createGain();
      s.buffer = b; s.playbackRate.value = opt.rate || 1; g.gain.value = FX_KIND[kind][1];
      fx.master.gain.cancelScheduledValues(ac.currentTime); fx.master.gain.setValueAtTime(1, ac.currentTime);
      s.connect(g); g.connect(fx.master); s.start();
      fx.live.push(s); s.onended = () => { fx.live = fx.live.filter(x => x !== s); };
      fx.log.push({t:Date.now(), ev:'sfx:' + kind});
      return b.duration / (opt.rate || 1);
    } catch (e) { return 0; }
  },
  /* 先短音效、後語音。fn（念日文）一定會被呼叫；語音還沒在手勢裡解鎖前（iOS），直接念、不出音效。 */
  sfxThen(kind, fn, opt) {
    if (!fn) { fx.sfx(kind, opt); return; }
    if (!fx.speechUnlocked && typeof canSpeak !== 'undefined' && canSpeak) { fn(); return; }
    const d = fx.sfx(kind, opt);
    if (!d) { fn(); return; }
    setTimeout(fn, Math.max(250, Math.min(450, Math.round(d * 1000) + 60)));
  },
  /* 語音開始：50 ms 內把音效降到 0，停掉還在播的音效 */
  duck() {
    fx.speechUnlocked = true; fx.log.push({t:Date.now(), ev:'speak'});
    if (!fx.ac) return;
    try { const t = fx.ac.currentTime; fx.master.gain.cancelScheduledValues(t); fx.master.gain.setValueAtTime(fx.master.gain.value, t); fx.master.gain.linearRampToValueAtTime(0, t + .05); } catch (e) {}
    fx.live.forEach(s => { try { s.stop(fx.ac.currentTime + .05); } catch (e) {} }); fx.live = [];
  },

  /* ---------- 動畫小工具（全部走 WAAPI，減少動畫時不做） ---------- */
  anim(el, kf, o) { if (!el || fx.reduced() || !el.animate) return null; try { return el.animate(kf, o); } catch (e) { return null; } },
  pop(el) { return fx.anim(el, [{transform:'scale(1)'}, {transform:'scale(1.04)', offset:.45}, {transform:'scale(1)'}], {duration:180, easing:'cubic-bezier(.3,1.6,.5,1)'}); },
  shake(el) { return fx.anim(el, [{transform:'none'}, {transform:'translateX(-6px)'}, {transform:'translateX(6px)'}, {transform:'translateX(-4px)'}, {transform:'translateX(3px)'}, {transform:'none'}], {duration:300, easing:'ease-out'}); },
  progress(bar, from, to) {
    if (!bar) return; bar.style.width = to + '%';
    if (from === undefined || from === to) return;
    fx.anim(bar, [{width:from + '%'}, {width:to + '%'}], {duration:350, easing:'ease-out'});
  },
  shine(bar) { fx.anim(bar, [{filter:'brightness(1)'}, {filter:'brightness(1.45)', offset:.3}, {filter:'brightness(1)'}], {duration:400, easing:'ease-out'}); },
  countUp(el, from, to) {
    if (!el) return; const fin = () => { el.textContent = to; };
    if (fx.reduced() || from === to) { fin(); return; }
    const t0 = performance.now(), dur = 600;
    const step = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); else fin(); };
    el.textContent = from; requestAnimationFrame(step);
  },
  /* 彩帶：移植 zh/src/app_main.js 的 CSS confetti()，顏色改用 CSS 變數 */
  confetti() {
    if (fx.reduced()) return;
    const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
    const cols = ['var(--r-purpose)', 'var(--r-place)', 'var(--r-thing)', 'var(--r-num)', 'var(--r-way)', 'var(--en)', 'var(--jp)'];
    for (let i = 0; i < 46; i++) {
      const c = document.createElement('i');
      c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length];
      c.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px'); c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      c.style.animationDuration = (1.4 + Math.random() * 1.2) + 's'; c.style.animationDelay = (Math.random() * .25) + 's';
      if (i % 3 === 0) { c.style.borderRadius = '50%'; c.style.width = c.style.height = '9px'; }
      box.appendChild(c);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 3000);
  },
  /* 某個物件（一次練習、一段對話結果…）只慶祝一次 */
  once(o) { if (!o || typeof o !== 'object' || fx.seen.has(o)) return false; fx.seen.add(o); return true; },

  /* ---------- 連對（只在記憶體，不寫存檔） ---------- */
  resetCombo() { fx.combo = 0; },
  badgeHtml() { return fx.combo >= 3 ? `<span class="fx-combo" role="status" aria-label="連續答對 ${fx.combo} 題"><span aria-hidden="true">🔥</span> 連對 ${fx.combo}</span>` : ''; },
  /* 作答之後（畫面已重畫）呼叫：ok＝true／false／null（部分對，不算）。speakFn＝原本要念的日文。 */
  answer(root, ok, speakFn) {
    root = typeof root === 'string' ? document.querySelector(root) : root;
    let kind = ok ? 'ok' : 'bad', opt;
    if (ok === true) { fx.combo++; if (FX_COMBO_AT(fx.combo)) { kind = 'combo'; opt = {rate:1 + .05 * (fx.combo < 5 ? 0 : fx.combo === 5 ? 1 : fx.combo / 5)}; } }
    else if (ok === false) fx.combo = 0;
    if (ok === null) { if (speakFn) speakFn(); } else fx.sfxThen(kind, speakFn, opt);
    if (!root) return;
    const head = root.querySelector('.ov-head'), bar = root.querySelector('.ov-head .prog');
    fx.decorHead(root);
    const badge = head && head.querySelector('.fx-combo');
    if (ok === true) {
      root.querySelectorAll('.opt.correct').forEach(fx.pop);
      if (bar) fx.shine(bar.querySelector('i'));
      if (badge && FX_COMBO_AT(fx.combo)) fx.anim(badge, [{transform:'scale(.4) rotate(-8deg)', opacity:0}, {transform:'scale(1.15) rotate(4deg)', opacity:1, offset:.5}, {transform:'rotate(-3deg)', offset:.75}, {transform:'none', opacity:1}], {duration:600, easing:'ease-out'});
    } else if (ok === false) {
      root.querySelectorAll('.opt.wrong, .blk.bad').forEach(fx.shake);
      if (fx._lastBadge && head) { const g = document.createElement('span'); g.className = 'fx-combo fx-combo-out'; g.setAttribute('aria-hidden', 'true'); g.textContent = '連對 ' + fx._lastBadge; head.appendChild(g);
        const a = fx.anim(g, [{transform:'none', opacity:1}, {transform:'scale(.5)', opacity:0}], {duration:260, easing:'ease-in'}); if (a) a.onfinish = () => g.remove(); else g.remove(); }
    }
    fx._lastBadge = fx.combo >= 3 ? fx.combo : 0;
  },
  /* 每次重畫練習畫面後呼叫：補上連對膠囊、進度條補間、換題時新卡從右邊滑入 */
  decorHead(root) {
    const head = root && root.querySelector('.ov-head'); if (!head) return;
    const old = head.querySelector('.fx-combo:not(.fx-combo-out)'); if (old) old.remove();
    const bar = head.querySelector('.prog'); if (bar) bar.classList.toggle('fx-hot', fx.combo >= 3);
    if (fx.combo >= 3) { const t = document.createElement('template'); t.innerHTML = fx.badgeHtml(); (bar || head.lastElementChild).after(t.content); }
  },
  after(root, key, cardKey) {
    if (!root) return;
    fx.decorHead(root);
    const bar = root.querySelector('.prog i');
    if (bar) { const to = parseFloat(bar.style.width) || 0; fx.progress(bar, fx.prog[key], to); fx.prog[key] = to; }
    if (cardKey !== undefined) {
      const prev = fx.card[key]; fx.card[key] = cardKey;
      if (prev !== undefined && prev !== cardKey) fx.anim(root.querySelector('.ov-body .in'), [{opacity:0, transform:'translateX(28px)'}, {opacity:1, transform:'none'}], {duration:200, easing:'cubic-bezier(.2,.8,.3,1)'});
    }
  },
  /* 開新的練習／對話／五十音一輪：連對歸零、進度條從 0 開始 */
  start(key) { fx.combo = 0; fx._lastBadge = 0; delete fx.prog[key]; delete fx.card[key]; },

  /* ---------- 完成慶祝 ---------- */
  celebrate(root, opt) {
    opt = opt || {};
    fx.sfx('done');
    if (!root) return;
    const hero = root.querySelector('.done-hero');
    if (hero) {
      [...hero.querySelectorAll('.tower i')].slice(0, 8).forEach((b, i) => fx.anim(b, [{transform:'translateY(-48px)', opacity:0}, {transform:'translateY(2px)', opacity:1, offset:.8}, {transform:'none', opacity:1}], {duration:320, delay:i * 60, easing:'cubic-bezier(.3,1.3,.5,1)', fill:'backwards'}));
      hero.querySelectorAll('[data-count]').forEach(el => fx.countUp(el, +(el.dataset.from || 0), +el.dataset.count));
      if (opt.perfect && !hero.querySelector('.fx-star')) { const s = document.createElement('div'); s.className = 'fx-star'; s.setAttribute('aria-hidden', 'true'); s.textContent = '⭐'; hero.prepend(s);
        fx.anim(s, [{transform:'scale(.3) rotate(-40deg)', opacity:0}, {transform:'scale(1.2) rotate(8deg)', opacity:1, offset:.6}, {transform:'none', opacity:1}], {duration:520, delay:300, easing:'ease-out', fill:'backwards'}); }
    }
    setTimeout(fx.confetti, fx.reduced() ? 0 : 250);
  },
  /* 今天 5 分鐘全部完成：全螢幕慶祝卡，3 個 ✓ 依序亮起（取代原本只跳 toast） */
  t5Done(steps, log) {
    $('#fxT5')?.remove();
    const el = document.createElement('div'); el.id = 'fxT5'; el.className = 'fx-t5'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '今天 5 分鐘完成');
    el.innerHTML = `<div class="fx-t5-card"><p class="fx-t5-title">今天 5 分鐘完成！</p><ol>${steps.map((s, i) => `<li><span class="fx-t5-ck" aria-hidden="true">${log[s.id] === 'skip' ? '–' : '✓'}</span>第 ${i + 1} 關：${esc(s.name)}<span class="small muted">${log[s.id] === 'skip' ? '（跳過）' : ''}</span></li>`).join('')}</ol><button class="btn primary block" data-fx="t5ok">好</button></div>`;
    const close = () => { clearTimeout(tm); el.remove(); };
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-fx=t5ok]')) close(); });
    document.body.append(el); const tm = setTimeout(close, 6000);
    el.querySelectorAll('.fx-t5-ck').forEach((c, i) => fx.anim(c, [{transform:'scale(0)', opacity:0}, {transform:'scale(1.25)', opacity:1, offset:.6}, {transform:'none', opacity:1}], {duration:360, delay:250 + i * 300, easing:'ease-out', fill:'backwards'}));
    fx.anim(el.querySelector('.fx-t5-card'), [{transform:'translateY(40px) scale(.94)', opacity:0}, {transform:'none', opacity:1}], {duration:260, easing:'cubic-bezier(.2,1.2,.4,1)'});
    fx.sfx('done'); setTimeout(fx.confetti, 300);
    el.querySelector('[data-fx=t5ok]').focus({preventScroll:true});
  },
  levelUp() { document.querySelectorAll('.topbar .tower').forEach(t => fx.anim(t, [{filter:'drop-shadow(0 0 0 transparent)', transform:'none'}, {filter:'drop-shadow(0 0 10px var(--warn))', transform:'translateY(-4px) scale(1.12)', offset:.4}, {filter:'drop-shadow(0 0 0 transparent)', transform:'none'}], {duration:900, easing:'ease-out'})); },

  /* ---------- 換頁：畫面一律「同步」換好（其他程式和輔助工具都假設點分頁後 #view 立刻是新內容），再做 CSS 淡入＋上移。
     沒有用 document.startViewTransition：它的 update 會延到下一個畫格才執行，實測讓 4 支既有回歸測試（點分頁後立即讀畫面）失敗。 */
  view(update) {
    update();
    if (fx.reduced()) return;
    const v = $('#view'); if (v) { v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in'); }
  },
  /* 把「減少動畫」設定套到 <html>，CSS 動畫也一起關 */
  apply() { document.documentElement.classList.toggle('fx-reduce', !!(typeof S !== 'undefined' && S.settings && S.settings.motion === 'reduce')); },
  demo() {
    if (!fx.on()) { toast('音效目前關閉'); return; }
    fx.ctx(); fx.decode();
    setTimeout(() => { if (!fx.sfx('ok')) toast(fx.busy() ? '正在播放語音，等它念完再試' : '這台裝置播不出音效'); else setTimeout(() => fx.sfx('combo'), 450); }, 120);
  }
};
/* 第一次點畫面就解鎖 AudioContext（只在音效開著時建立；沿用 game.js 原本的 resume 寫法） */
document.addEventListener('pointerdown', () => { if (fx.on()) fx.ctx(); }, {capture:true, passive:true});
/* 「我的」設定列：音效開關＋試聽、動畫跟隨系統／減少（app.js vMe 的插入點呼叫） */
function fxSettingsHtml() {
  const on = S.settings.sfx !== false, m = S.settings.motion === 'reduce' ? 'reduce' : 'auto';
  return `<div class="set-row" style="flex-wrap:wrap"><div class="grow"><b>音效</b><p class="small muted">答對、答錯、完成時的短音效；日文發音時自動停下</p></div><div class="row" style="gap:10px"><button class="btn sm" data-a="fxTest">試聽</button><button class="switch" role="switch" aria-checked="${on}" aria-label="音效" data-a="set" data-k="sfx" data-v="${!on}"></button></div></div>
      <div class="set-row" style="flex-wrap:wrap"><div class="grow"><b>動畫</b><p class="small muted">「減少」會關掉彈跳、彩帶與換頁動畫</p></div><div class="seg" style="min-width:180px">${[['auto', '跟隨系統'], ['reduce', '減少']].map(([v, l]) => `<button data-a="set" data-k="motion" data-v="${v}" aria-pressed="${m === v}">${l}</button>`).join('')}</div></div>`;
}
