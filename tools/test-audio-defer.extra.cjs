// 首屏提速回歸：鎖屏音檔放最後一段 script。音檔還在下載時：首頁已可用、鎖屏聽力顯示「載入中」、不會把上次位置蓋掉；載完後自動變成可播放。
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[];
(async()=>{
  const html=fs.readFileSync(path.join(repo,'index.html'),'utf8');
  const cut=html.lastIndexOf('<script>');assert(cut>0&&html.indexOf('globalThis.ORAL_AUDIO = {',cut)>0,'音檔在最後一段 script');
  assert(html.indexOf('globalThis.ORAL_AUDIO = {')>cut,'主程式裡沒有音檔資料');
  let release;const gate=new Promise(r=>release=r);
  const server=http.createServer(async(q,r)=>{r.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});r.write(html.slice(0,cut));await gate;r.end(html.slice(cut));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.route('https://**',r=>r.abort());
  await ctx.addInitScript(()=>{if(!sessionStorage.getItem('s')){sessionStorage.setItem('s','1');localStorage.setItem('bnk-lockplay-v1',JSON.stringify({i:5,speed:'slow',auto:true}));}});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.goto('http://127.0.0.1:'+server.address().port).catch(()=>{});
  // 音檔還沒到：首頁主按鈕已出現且可用
  await page.waitForSelector('#view [data-a=t5Go]',{timeout:20000});
  assert.equal(await page.evaluate(()=>!!globalThis.ORAL_AUDIO),false);
  await page.locator('#homeAll summary').click();
  assert.match(await page.locator('#lpSlot').innerText(),/音檔載入中/);
  // 打開別的東西、觸發存檔都不該把鎖屏位置蓋掉
  await page.evaluate(()=>{lpSave();persist();});
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('bnk-lockplay-v1'))).i,5);
  // 載入中先打開鎖屏聽力 → 顯示載入中；資料到了自動畫出第 6 句
  await page.evaluate(()=>lpOpen());assert.match(await page.locator('#lpv').innerText(),/音檔載入中/);
  release();
  await page.waitForFunction(()=>!!globalThis.ORAL_AUDIO&&/第 6 句|6\/30/.test(document.querySelector('#lpv').innerText),null,{timeout:20000});
  assert.match(await page.locator('#lpv').innerText(),/6\/30/);
  await page.locator('#lpv [data-a=lpClose]').click();
  await page.locator('#homeAll summary').click().catch(()=>{});
  await page.evaluate(()=>{const d=document.querySelector('#homeAll');if(d&&!d.open)d.open=true;});
  assert.match(await page.locator('#lpSlot').innerText(),/上次到第 6 句/);
  assert.equal(await page.locator('#lpSlot [data-a=lpOpen]').isEnabled(),true);
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('bnk-lockplay-v1'))).speed,'slow');
  assert.deepEqual(errors,[]);await browser.close();server.close();
  console.log('PASS: 音檔在最後一段 script；下載中首頁可用、鎖屏聽力顯示載入中且不覆蓋上次位置／速度；載完自動可播放。');
})().catch(e=>{console.error(e);process.exit(1);});
