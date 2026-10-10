// 主題開機（build.sh 串在第一段 script 最前面）：只處理「手動選了淺色／深色」的人。
// 預設「跟隨系統」完全由 CSS（prefers-color-scheme＋<meta name="color-scheme">）處理，這裡什麼都不用做。
// 偏好存在 localStorage 'bnk-theme'（'light' | 'dark'；沒有或其他值＝跟隨系統）。
// 套用後的「下一個 frame」才加 .theme-ready，讓顏色過場只在之後手動切換時出現，載入時不做動畫。
(function () {
  var d = document.documentElement, m = '';
  try { m = localStorage.getItem('bnk-theme') || ''; } catch (e) {}
  if (m !== 'light' && m !== 'dark') m = '';
  if (m) d.setAttribute('data-theme', m); else d.removeAttribute('data-theme');
  var c = { light: '#EEF1F6', dark: '#10141C' }, ms = document.querySelectorAll('meta[name="theme-color"]');
  for (var i = 0; i < ms.length; i++) { var x = ms[i]; if (!x.getAttribute('data-c')) x.setAttribute('data-c', x.content); x.content = m ? c[m] : x.getAttribute('data-c'); }
  var ready = function () { d.classList.add('theme-ready'); };
  if (window.requestAnimationFrame) requestAnimationFrame(function () { requestAnimationFrame(ready); }); else setTimeout(ready, 0);
})();
