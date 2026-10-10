// 離線 service worker 回歸：首次載入後離線可開、上線後拿到新版（network-first）、網路 3 秒沒回應改用快取、
// 不攔截 zh/ 等其他路徑、「清除快取並重新載入」會取消註冊並刪快取；非 https（沒加 swtest）不註冊。
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[];
const types={'.html':'text/html;charset=utf-8','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.js':'text/javascript'};
(async()=>{
  const files={};for(const f of ['index.html','sw.js','manifest.webmanifest','apple-touch-icon.png','icon-192.png','icon-512.png','favicon-32.png','favicon.ico'])files['/'+f]=fs.readFileSync(path.join(repo,f));
  files['/zh/index.html']=Buffer.from('<!doctype html><title>zh</title><p>zh page');
  let delay=0,hits={};
  const server=http.createServer(async(q,r)=>{let u=q.url.split('?')[0];if(u==='/')u='/index.html';hits[u]=(hits[u]||0)+1;
    if(u==='/index.html'&&delay)await new Promise(x=>setTimeout(x,delay));
    const b=files[u];if(!b){r.statusCode=404;return r.end('nf');}r.setHeader('Content-Type',types[path.extname(u)]||'application/octet-stream');r.setHeader('Cache-Control','max-age=600');r.end(b);});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port+'/';
  const browser=await chromium.launch({headless:true});
  // 0) 沒有 swtest（等同 http 一般網址）不註冊
  {const ctx=await browser.newContext();await ctx.route('https://**',r=>r.abort());const p=await ctx.newPage();await p.goto(base);await p.waitForTimeout(800);
   assert.equal(await p.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length),0,'非 https 不註冊');await ctx.close();}
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.route('https://**',r=>r.abort());
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  const url=base+'?swtest=1';
  await page.goto(url);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  assert(await page.evaluate(async()=>(await caches.keys()).some(k=>k.startsWith('bnk-app-'))));
  // 1) 離線：首頁仍能開、主按鈕在、鎖屏音檔資料在
  await ctx.setOffline(true);
  await page.reload();await page.waitForSelector('#view .course-hero .btn.primary');
  assert(await page.evaluate(()=>!!globalThis.ORAL_AUDIO&&ORAL_AUDIO.items.length===30),'離線時鎖屏音檔仍在');
  // zh/ 不被攔截：離線時打不開（沒被 SW 回應）
  const zh=await page.evaluate(async b=>{try{const r=await fetch(b+'zh/index.html');return r.status;}catch(e){return 'fail';}},base);
  assert.equal(zh,'fail','zh/ 不經過 SW 快取');
  await ctx.setOffline(false);
  // 2) 上線後有新版：network-first 直接拿到新版
  files['/index.html']=Buffer.from(String(files['/index.html']).replace('<title>按鈕與積木</title>','<title>按鈕與積木 v2</title>'));
  await page.reload();await page.waitForSelector('#view .course-hero .btn.primary');
  assert.equal(await page.title(),'按鈕與積木 v2','上線後拿到新版');
  // 3) 網路很慢（>3 秒）：3 秒左右改用快取（v2），背景再更新
  files['/index.html']=Buffer.from(String(files['/index.html']).replace('按鈕與積木 v2','按鈕與積木 v3'));
  delay=6000;const t0=Date.now();
  await page.reload({waitUntil:'domcontentloaded'});const took=Date.now()-t0;
  assert.equal(await page.title(),'按鈕與積木 v2','慢網路時先用快取');assert(took<5500,'約 3 秒內回應，實際 '+took+'ms');
  await page.waitForTimeout(4000);delay=0;
  await page.reload();assert.equal(await page.title(),'按鈕與積木 v3','背景更新後下次就是新版');
  // 4) sw.js 換版：舊快取被清掉
  const before=await page.evaluate(async()=>(await caches.keys()).filter(k=>k.startsWith('bnk-app-')));
  files['/sw.js']=Buffer.from(String(files['/sw.js']).replace(/const VERSION = '[^']+'/,"const VERSION = 'testv2'"));
  await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  await page.waitForFunction(async()=>{const k=await caches.keys();return k.includes('bnk-app-testv2')&&k.filter(x=>x.startsWith('bnk-app-')).length===1;},null,{timeout:15000});
  assert(before.length===1&&before[0]!=='bnk-app-testv2');
  // 5) 「我的 → 清除快取並重新載入」：取消註冊、刪快取，進度不動
  const cleared=await page.evaluate(async()=>{await swClear();return {regs:(await navigator.serviceWorker.getRegistrations()).length,caches:(await caches.keys()).filter(k=>k.startsWith('bnk-')).length};});
  assert.deepEqual(cleared,{regs:0,caches:0},'清除後沒有 SW、沒有快取');
  await page.evaluate(()=>{S.xp=77;persist();});
  await page.locator('#tabs [data-v=me]').click();
  await Promise.all([page.waitForEvent('load'),page.locator('#view [data-a=swReset]').click()]);
  await page.waitForTimeout(300);
  const st=await page.evaluate(async()=>({regs:(await navigator.serviceWorker.getRegistrations()).length,caches:(await caches.keys()).filter(k=>k.startsWith('bnk-')).length,xp:S.xp}));
  // 重新載入後（有 swtest）會重新註冊，所以只檢查快取被清空過、進度保留
  assert.equal(st.xp,77,'進度沒被刪');
  assert.deepEqual(errors,[]);await browser.close();server.close();
  console.log('PASS: 非 https 不註冊；離線可開首頁（含鎖屏音檔）；zh/ 不攔截；上線拿新版；慢網路 3 秒改用快取再背景更新；sw 換版清舊快取；清除快取按鈕不動進度。');
})().catch(e=>{console.error(e);process.exit(1);});
