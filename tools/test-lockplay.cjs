// 鎖屏聽力：<audio>（不是 Web Speech）播放打包的 batch01 MP3、上一句／下一句／慢速、自動下一句、Media Session、位置另存、不動 bnk-state-v1。
// Usage: node tools/test-lockplay.cjs   (需要 playwright；可用 NODE_PATH 指到已安裝的 node_modules)
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[];
const man=JSON.parse(fs.readFileSync(path.join(repo,'oral-audio/batch01/manifest.json'),'utf8'));
const old={v:1,updatedAt:5,settings:{read:'ro',romaji:true},en:{allow:{s:3,due:9e15}},gm:{star:12},xp:50};
function spy(){window.__spoken=0;Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],addEventListener(){},resume(){},cancel(){},speak(){window.__spoken++;}}});
  window.__ms={};if(!navigator.mediaSession)Object.defineProperty(navigator,'mediaSession',{configurable:true,value:{}});
  const ms=navigator.mediaSession;ms.setActionHandler=(k,f)=>{window.__ms[k]=f;};}
(async()=>{
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync(path.join(repo,'index.html')));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('https://**',r=>r.abort());await ctx.addInitScript(spy);
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(s=>{localStorage.setItem('bnk-state-v1',JSON.stringify(s));sessionStorage.clear();},old);await page.reload();
  // 打包內容與 manifest 一致
  const items=await page.evaluate(()=>ORAL_AUDIO.items.map(x=>({id:x.id,ja:x.ja,zh:x.zh,n:x.normal.length,s:x.slow.length})));
  assert.equal(items.length,man.items.length);
  items.forEach((x,i)=>{assert.equal(x.id,man.items[i].id);assert.equal(x.ja,man.items[i].ja);assert.equal(x.zh,man.items[i].zh);assert(x.n>1000&&x.s>x.n*0.9);});
  // 在「全部」裡面
  await page.locator('#homeAll summary').click();
  const card=page.locator('#homeAll [data-a=lpOpen]');assert.equal(await card.isVisible(),true);
  await card.click();assert.equal(await page.locator('#lpv').isVisible(),true);
  const cur=()=>page.locator('#lpCard').getAttribute('data-id');
  assert.equal(await cur(),man.items[0].id);
  assert.match(await page.locator('#lpv').innerText(),new RegExp(man.items[0].zh.slice(0,6)));
  // 播放：真的解碼 MP3，時間在前進
  await page.locator('#lpv [data-a=lpToggle]').click();
  await page.waitForFunction(()=>{const a=document.querySelector('#lpAudio');return a&&!a.paused&&a.currentTime>0.2;},null,{timeout:10000});
  let st=await page.evaluate(()=>{const a=document.querySelector('#lpAudio');return {src:a.src.slice(0,5),dur:a.duration,sp:a.dataset.speed,ms:navigator.mediaSession.metadata&&navigator.mediaSession.metadata.title,h:Object.keys(window.__ms).sort()};});
  assert.equal(st.sp,'normal');assert(Math.abs(st.dur-man.items[0].audio.normal.durationSeconds)<0.15,'duration '+st.dur);
  assert.equal(st.ms,man.items[0].ja);
  for(const k of ['nexttrack','pause','play','previoustrack'])assert(st.h.includes(k),'media session '+k);
  assert.match(await page.locator('#lpv [data-a=lpToggle]').innerText(),/暫停/);
  // 自動下一句（播完 → 第 2 句繼續播）
  await page.evaluate(()=>{const a=document.querySelector('#lpAudio');a.currentTime=Math.max(0,a.duration-0.05);});
  await page.waitForFunction(id=>document.querySelector('#lpCard').dataset.id===id,man.items[1].id,{timeout:10000});
  await page.waitForFunction(()=>{const a=document.querySelector('#lpAudio');return !a.paused&&a.currentTime>0.1;},null,{timeout:10000});
  // 鎖定畫面按鈕（Media Session）：下一句、上一句、暫停
  await page.evaluate(()=>window.__ms.nexttrack());assert.equal(await cur(),man.items[2].id);
  await page.evaluate(()=>window.__ms.previoustrack());assert.equal(await cur(),man.items[1].id);
  await page.evaluate(()=>window.__ms.pause());
  await page.waitForFunction(()=>document.querySelector('#lpAudio').paused);
  assert.match(await page.locator('#lpv [data-a=lpToggle]').innerText(),/播放/);
  // 慢速：換成 slow 檔、長度約 1/0.8
  await page.locator('#lpv [data-a=lpSpeed][data-v=slow]').click();
  await page.locator('#lpv [data-a=lpToggle]').click();
  await page.waitForFunction(()=>{const a=document.querySelector('#lpAudio');return a.dataset.speed==='slow'&&!a.paused&&a.currentTime>0.1;},null,{timeout:10000});
  const sd=await page.evaluate(()=>document.querySelector('#lpAudio').duration);
  assert(Math.abs(sd-man.items[1].audio.slow.durationSeconds)<0.15,'slow duration '+sd);
  // 上一句越過第 1 句會繞到最後一句；按鈕操作
  await page.locator('#lpv [data-a=lpGo][data-v="-1"]').click();await page.locator('#lpv [data-a=lpGo][data-v="-1"]').click();
  assert.equal(await cur(),man.items[man.items.length-1].id);
  await page.locator('#lpv [data-a=lpGo][data-v="1"]').click();await page.locator('#lpv [data-a=lpGo][data-v="1"]').click();
  assert.equal(await cur(),man.items[1].id);
  // 關閉 → 停止；位置與速度另存，重新整理後接著聽
  await page.locator('#lpv [data-a=lpClose]').click();
  assert.equal(await page.evaluate(()=>document.querySelector('#lpAudio').paused),true);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('bnk-lockplay-v1'))),{i:1,speed:'slow',auto:true});
  await page.reload();await page.locator('#homeAll summary').click();
  assert.match(await page.locator('#homeAll [data-a=lpOpen]').innerText(),/接著聽/);
  await page.locator('#homeAll [data-a=lpOpen]').click();assert.equal(await cur(),man.items[1].id);
  // 沒用 Web Speech；bnk-state-v1 沒被這個功能改動
  assert.equal(await page.evaluate(()=>window.__spoken),0);
  const after=JSON.parse(await page.evaluate(()=>localStorage.getItem('bnk-state-v1')));
  assert(after.en.allow.s===3&&after.gm.star===12&&after.xp===50&&after.settings.read==='ro');
  assert.equal(after.lockplay,undefined);
  assert.deepEqual(errors,[]);
  await browser.close();server.close();
  console.log(`PASS: 鎖屏聽力 ${items.length} sentences × normal/slow via <audio> (decoded in Chromium), auto-next, prev/next/pause via Media Session handlers, position in bnk-lockplay-v1, bnk-state-v1 untouched, no Web Speech. Real iPhone lock-screen behaviour NOT tested.`);
})().catch(e=>{console.error(e);console.error(errors);process.exit(1);});
