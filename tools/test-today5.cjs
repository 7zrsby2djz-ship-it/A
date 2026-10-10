// 今天 5 分鐘：一鍵流程（複習 → 對話 → 五個假名）、首頁「全部」、存檔相容。
// Usage: node tools/test-today5.cjs   (需要 playwright；可用 NODE_PATH 指到已安裝的 node_modules)
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[];
const rec=()=>({s:1,due:0,ok:1,ng:0,lapse:0,conf:{},t0:1,last:1,enc:1});
const old={v:1,updatedAt:5,settings:{read:'ro',romaji:true},en:{allow:{s:3,due:9e15}},tk:{bus:{lv:{1:{listen:2,done:1,text:0,repair:0,transfer:0,seen:['b1a'],last:1}}}},gm:{star:12},xp:50,
  ck:{hai:{seen:1,t:rec(),l:rec(),weak:true},iie:{seen:1,t:rec(),l:rec(),weak:true},b205_desu:{seen:1,t:rec(),l:rec(),weak:true}}};
function spy(){Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{lang:'ja-JP',name:'test'}],addEventListener(){},resume(){},cancel(){},speak(u){setTimeout(()=>u.onend&&u.onend(),10);}}});
  window.Audio=class{constructor(s){this.src=s;}play(){setTimeout(()=>this.onended&&this.onended(),10);return Promise.resolve();}pause(){}};}
(async()=>{
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync(path.join(repo,'index.html')));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('https://**',r=>r.abort());await ctx.addInitScript(spy);
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(s=>{localStorage.setItem('bnk-state-v1',JSON.stringify(s));sessionStorage.clear();},old);await page.reload();
  const t5=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bnk-today5-v1')||'null'));
  // 首頁主路線在最上面；原有自由練習收在「全部」，仍可中斷接續。
  const btn=page.locator('#view [data-a=t5Go]');
  assert.equal(await btn.count(),1);assert.equal(await btn.isVisible(),false);
  assert.equal(await page.locator('#homeAll').evaluate(d=>d.open),false);
  assert.equal(await page.locator('#homeAll [data-a=startEn]').isVisible(),false);
  await page.locator('#homeAll summary').click();assert.equal(await page.locator('#homeAll [data-a=startEn]').isVisible(),true);
  assert.match(await btn.innerText(),/開始今天 5 分鐘/);
  // 舊存檔沒被動到
  assert(await page.evaluate(()=>S.tk.bus.lv[1].listen===2&&S.en.allow.s===3&&S.gm.star===12&&S.settings.read==='ro'&&S.xp===50));
  // 第 1 步：句塊複習
  await btn.click();
  assert.equal(await page.locator('#ses').isVisible(),true);assert.equal(await page.evaluate(()=>SES.ck),true);
  assert.equal((await t5()).step,0);
  for(let i=0;i<40&&await page.evaluate(()=>!!curCard());i++){await page.locator('#ses .opt').first().click();await page.locator('#ses [data-a=next]').click();}
  await page.locator('#ses .ov-foot [data-a=sesClose]').click();
  // 自動接第 2 步：對話
  await page.waitForFunction(()=>{const r=document.querySelector('#run');return r&&!r.hidden;});
  let st=await t5();assert.equal(st.step,1);assert.equal(st.log.review,'done');
  // 中途離開 → 暫停，首頁顯示繼續，S.run 保留
  await page.locator('#run [data-a=runClose]').first().click();
  st=await t5();assert.equal(st.step,1);assert.equal(st.on,false);
  assert(await page.evaluate(()=>!!S.run));
  assert.match(await btn.innerText(),/繼續・第 2\/3 關（一段對話）/);
  // 重新整理後仍在第 2 步
  await page.reload();
  await page.locator('#homeAll summary').click();
  assert.match(await page.locator('#view [data-a=t5Go]').innerText(),/第 2\/3 關/);
  await page.locator('#view [data-a=t5Go]').click();
  assert.equal(await page.locator('#run').isVisible(),true);
  // 模擬對話走到結局（真實流程由 run.js finalizeRun 設定 RUN_END、清掉 S.run）
  await page.evaluate(()=>{RUN_END={run:JSON.parse(JSON.stringify(S.run)),types:['text'],res:'ok',text:'test'};S.run=null;closeRunView();});
  // 自動接第 3 步：五個假名
  await page.waitForFunction(()=>{const k=document.querySelector('#kn');return k&&!k.hidden;});
  st=await t5();assert.equal(st.step,2);assert.equal(st.log.dlg,'done');
  assert(await page.evaluate(()=>!!knSt().active),'kana round started');
  // 沒做完就離開（優化第4輪起：直接回首頁，不再落在假名表）→ 不算完成
  await page.locator('#kn .ov-head [data-k=leave]').click();
  assert.equal(await page.evaluate(()=>document.querySelector('#kn').hidden),true);
  st=await t5();assert.equal(st.step,2);assert.equal(st.on,false);
  // 做完一輪（模擬最後一題後 knNext）再關 → 完成
  await page.locator('#view [data-a=t5Go]').click();
  await page.evaluate(()=>{const a=knSt().active;a.i=a.items.length-1;knNext();});
  assert.equal(await page.evaluate(()=>KG.view),'done');
  await page.locator('#kn .ov-head [data-k=close]').click();
  st=await t5();assert.equal(st.step,3);assert.equal(st.log.kana,'done');
  assert.match(await page.locator('#view [data-a=t5Go]').innerText(),/再來一輪/);
  // 進度仍在原本的 key
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bnk-state-v1')));
  assert(saved.tk.bus.lv[1].listen===2&&saved.en.allow.s===3&&saved.gm.star===12&&saved.ck.hai);
  assert.equal(saved.today5,undefined,'流程狀態不寫進 bnk-state-v1');
  // 壞掉的流程 key 不影響開啟
  await page.evaluate(()=>localStorage.setItem('bnk-today5-v1','{broken'));await page.reload();
  await page.locator('#homeAll summary').click();
  assert.match(await page.locator('#view [data-a=t5Go]').innerText(),/開始今天 5 分鐘/);
  assert.deepEqual(errors,[]);
  await browser.close();server.close();
  console.log('PASS: 今天 5 分鐘 one-button flow (review → dialogue → kana), pause/resume across reload, 全部 collapsed, bnk-state-v1 untouched by flow state.');
})().catch(e=>{console.error(e);console.error(errors);process.exit(1);});
