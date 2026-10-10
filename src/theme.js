/* ---------- 外觀：跟隨系統／淺色／深色（QA #8） ----------
   偏好存在獨立的 localStorage 'bnk-theme'（不放進 bnk-state-v1：大 JSON 要等主程式才讀得到）。
   'auto'＝跟隨系統（移除 data-theme，交給 CSS media query）；'light'/'dark'＝html[data-theme] 手動覆寫。
   口語分頁 #oral-module 的深色區塊也同時吃 html[data-theme]（listening-jp/build-embedded.js 產生）。
   app.js 的「我的」呼叫 themeSettingsHtml()，按鈕 data-a="theme" 由 app.js 轉呼叫 themeSet(v)。 */
const THEME_KEY = 'bnk-theme', THEME_MODES = ['auto', 'light', 'dark'], THEME_COLORS = {light: '#EEF1F6', dark: '#10141C'};
function themeGet() {
  try { const v = localStorage.getItem(THEME_KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (e) { return 'auto'; }
}
function themeApply(m) {
  const d = document.documentElement;
  if (m === 'light' || m === 'dark') d.setAttribute('data-theme', m); else d.removeAttribute('data-theme');
  document.querySelectorAll('meta[name="theme-color"]').forEach(x => {
    if (!x.getAttribute('data-c')) x.setAttribute('data-c', x.content);
    x.content = THEME_COLORS[m] || x.getAttribute('data-c');
  });
}
let themeSwitchT = 0;
function themeSet(m) {
  if (!THEME_MODES.includes(m)) m = 'auto';
  try { if (m === 'auto') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, m); } catch (e) {}
  const d = document.documentElement;
  d.classList.add('theme-switching'); clearTimeout(themeSwitchT);
  themeSwitchT = setTimeout(() => d.classList.remove('theme-switching'), 320);
  themeApply(m); themeMarkUI(m);
}
function themeMarkUI(m) { document.querySelectorAll('[data-a="theme"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === m))); }
function themeSettingsHtml() {
  const cur = themeGet();
  return `<div class="set-row theme-row" style="flex-wrap:wrap"><div class="grow"><b>外觀</b><p class="small muted">深色適合晚上、鎖屏聽力時用</p></div>`
    + `<div class="seg" role="group" aria-label="外觀" style="min-width:220px">${[['auto', '跟隨系統'], ['light', '淺色'], ['dark', '深色']].map(([v, l]) =>
      `<button data-a="theme" data-v="${v}" aria-pressed="${cur === v}">${l}</button>`).join('')}</div></div>`;
}
// 別的分頁改了主題，這裡跟著換
window.addEventListener('storage', e => { if (e.key === THEME_KEY || e.key === null) { const m = themeGet(); themeApply(m); themeMarkUI(m); } });
