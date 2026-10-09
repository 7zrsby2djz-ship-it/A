/* 按鈕與積木 service worker（離線可用）。由 build.sh 從 src/sw.js 產生根目錄 sw.js，版本字串換成 index.html 的雜湊。
   保守策略：
   - 只處理本 App 首頁（./、./index.html）與圖示／manifest；zh/、listening-jp/ 等其他路徑一律不碰，交給瀏覽器。
   - 首頁 network-first：先上網拿最新版（no-cache 重新驗證），3 秒沒回應或離線才用快取；網路之後回來會更新快取。
   - 新版上線後 sw.js 內容（版本）改變，瀏覽器會自動換新 worker，並刪掉舊版快取。
   - 「我的 → 清除快取並重新載入」會取消註冊並刪掉 bnk- 開頭的快取（不動進度）。 */
const VERSION = '__VERSION__';
const CACHE = 'bnk-app-' + VERSION;
const SCOPE = new URL('./', self.location).href;
const PAGE = new URL('./index.html', self.location).href;
const ASSETS = ['manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'favicon-32.png', 'favicon.ico'].map(p => new URL(p, self.location).href);
const TIMEOUT = 3000;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all([PAGE, ...ASSETS].map(u => fetch(u, {cache: 'no-cache'}).then(r => r.ok ? c.put(u, r) : null).catch(() => null)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('bnk-app-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
function isPage(url) { const u = url.split('#')[0].split('?')[0]; return u === SCOPE || u === PAGE; }
async function pageFromNetworkFirst(req) {
  const c = await caches.open(CACHE);
  const net = fetch(req.url, {cache: 'no-cache', credentials: 'same-origin'}).then(r => { if (r && r.ok) c.put(PAGE, r.clone()).catch(() => {}); return r; });
  const cached = () => c.match(PAGE);
  let timer;
  const timeout = new Promise(res => { timer = setTimeout(() => res('timeout'), TIMEOUT); });
  try {
    const first = await Promise.race([net, timeout]);
    if (first !== 'timeout') { clearTimeout(timer); if (first.ok) return first; return (await cached()) || first; }
    const old = await cached();
    if (old) { net.catch(() => {}); return old; }
    return await net;
  } catch (err) {
    clearTimeout(timer);
    const old = await cached(); if (old) return old;
    throw err;
  }
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE)) return;
  if (req.mode === 'navigate' && isPage(req.url)) { e.respondWith(pageFromNetworkFirst(req)); return; }
  const u = req.url.split('?')[0];
  if (ASSETS.includes(u)) e.respondWith(caches.open(CACHE).then(c => c.match(u).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(u, r.clone()); return r; }))));
  // 其他請求（zh/、listening-jp/、音檔、外部字型…）不處理
});
