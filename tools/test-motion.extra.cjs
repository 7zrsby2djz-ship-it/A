// 動畫＋音效（design/motion-sfx）回歸：
// 音效關閉不建 AudioContext、全 App 只有一個；語音播放中不出音效；sfxThen 一定會念、而且「音效 → ≥250ms → 語音」；
// 減少動畫（系統或「我的」設定）時沒有彩帶、沒有 JS 動畫；連對膠囊；完成慶祝；我的頁設定會保存；對話內不再有「第 N 步」；放棄對話同步今天 5 分鐘。
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[];
assert(fs.existsSync(path.join(repo,'assets/sfx/LICENSE-Kenney-CC0.txt')),'Kenney 授權檔要在 repo 裡');
assert.match(fs.readFileSync(path.join(repo,'assets/sfx/LICENSE-Kenney-CC0.txt'),'utf8'),/Creative Commons Zero, CC0/);
// 假語音：記錄 speak 的時間，onstart／onend 都會觸發；speaking 期間為 true
function fakes(){
  window.__ev=[];window.__acN=0;const RealAC=window.AudioContext;
  window.AudioContext=function(){window.__acN++;return new RealAC();};window.webkitAudioContext=window.AudioContext;
  const ss={speaking:false,getVoices:()=>[{lang:'ja-JP',name:'test',voiceURI:'test'}],addEventListener(){},resume(){},cancel(){ss.speaking=false;},
    speak(u){window.__ev.push({ev:'speak',t:performance.now(),text:u.text});ss.speaking=true;setTimeout(()=>{u.onstart&&u.onstart();},5);setTimeout(()=>{ss.speaking=false;u.onend&&u.onend();},120);}};
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:ss});
  window.SpeechSynthesisUtterance=window.SpeechSynthesisUtterance||function(t){this.text=t;};
}
(async()=>{
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync(path.join(repo,'index.html')));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const open=async(opt={},settings={})=>{
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',...opt});await ctx.route('https://**',r=>r.abort());
    await ctx.addInitScript(fakes);const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await page.evaluate(s=>{localStorage.clear();localStorage.setItem('bnk-state-v1',JSON.stringify({v:1,updatedAt:5,settings:Object.assign({read:'furi',autoSpeak:true},s),xp:120}));},settings);
    await page.reload();await page.waitForFunction(()=>typeof fx==='object');return {ctx,page};
  };
  // 一次英文練習：n 題，全部是選擇題
  const startEnQ=(page,n)=>page.evaluate(n=>{const ids=allEnIds().slice(0,n);startSession('en',ids.map(id=>({t:'q',id})),'test');},n);
  const answer=(page,ok)=>page.evaluate(ok=>{const c=curCard();const i=ok?c.q.opts.indexOf(c.q.id):c.q.opts.findIndex(o=>o!==c.q.id);document.querySelectorAll('#ses .opt')[i].click();},ok);

  // ---- 1. 音效關閉：點畫面、作答、小店音效都不建立 AudioContext ----
  {const {ctx,page}=await open({}, {sfx:false});
    await page.locator('#tabs [data-v=me]').click();await page.locator('#tabs [data-v=home]').click();
    await startEnQ(page,2);await answer(page,true);await page.evaluate(()=>{sfx('ok');fx.sfx('ok');});
    assert.equal(await page.evaluate(()=>window.__acN),0,'音效關閉時不應建立 AudioContext');
    assert.equal(await page.evaluate(()=>{let called=0;fx.sfxThen('ok',()=>called++);return called;}),1,'音效關閉時 sfxThen 仍立即呼叫 fn');
    await ctx.close();}

  // ---- 2. 音效開啟：只有一個 AudioContext；語音優先；sfxThen 的順序與間隔 ----
  {const {ctx,page}=await open();
    assert.equal(await page.evaluate(()=>Object.keys(SFX_DATA).length),5,'內嵌 5 個 Kenney 音效');
    await page.locator('#tabs [data-v=me]').click();await page.waitForTimeout(100);
    await page.evaluate(()=>{sfx('ok');fx.sfx('tap');sfx('coin');});
    assert.equal(await page.evaluate(()=>window.__acN),1,'全 App 只建一個 AudioContext（含小店 sfx）');
    await page.waitForFunction(()=>Object.keys(fx.buf).length===5,null,{timeout:5000});
    // 語音中：不出音效；fn 照樣立即呼叫
    const busy=await page.evaluate(()=>{speechSynthesis.speaking=true;const d=fx.sfx('ok');let called=0;fx.speechUnlocked=true;fx.sfxThen('bad',()=>called++);speechSynthesis.speaking=false;return {d,called};});
    assert.equal(busy.d,0,'語音播放中 fx.sfx 不播');assert.equal(busy.called,1,'語音播放中 sfxThen 直接呼叫 fn');
    // 鎖屏聽力、耳機模式播放中也不播
    assert.equal(await page.evaluate(()=>{LP.playing=true;const a=fx.sfx('ok');LP.playing=false;LS.playing=true;const b=fx.sfx('ok');LS.playing=false;return a+b;}),0);
    // 語音還沒解鎖（iOS）：直接念、不出音效
    assert.deepEqual(await page.evaluate(()=>{fx.speechUnlocked=false;fx.log=[];let c=0;fx.sfxThen('ok',()=>c++);return [c,fx.log.length];}),[1,0]);
    // 作答時序：sfx:ok → (≥250ms) → speak，speak 期間不出音效
    await page.evaluate(()=>{fx.speechUnlocked=true;fx.log=[];window.__ev=[];});
    await page.locator('#tabs [data-v=home]').click();await startEnQ(page,4);
    await page.waitForTimeout(400);await page.evaluate(()=>{fx.log=[];window.__ev=[];speechSynthesis.cancel();});
    const t0=await page.evaluate(()=>performance.now());await answer(page,true);await page.waitForTimeout(700);
    const ev=await page.evaluate(()=>({log:fx.log.map(x=>x.ev),speak:window.__ev.map(x=>x.t)}));
    assert.equal(ev.log[0],'sfx:ok','答對先播 ok 音效：'+ev.log.join(','));
    assert.equal(ev.speak.length,1,'之後才念');assert(ev.speak[0]-t0>=240,'音效和語音至少間隔約 250ms：'+(ev.speak[0]-t0));
    assert(!ev.log.slice(1).some(x=>x.startsWith('sfx:')),'念的期間沒有其他音效');
    // 語音一開始 → duck：master gain 往 0
    assert.equal(await page.evaluate(()=>fx.master.gain.value<1||fx.live.length===0),true);
    await ctx.close();}

  // ---- 3. 動畫開：pop、連對膠囊、進度條補間、完成彩帶與 count-up ----
  {const {ctx,page}=await open({}, {autoSpeak:false});
    await startEnQ(page,4);
    await answer(page,true);
    assert(await page.evaluate(()=>document.querySelector('#ses .opt.correct').getAnimations().length>0),'答對的選項會 pop');
    await page.locator('#ses [data-a=next]').click();
    assert(await page.evaluate(()=>document.querySelector('#ses .prog i').getAnimations().length>0),'進度條從上次寬度補間');
    await answer(page,true);await page.locator('#ses [data-a=next]').click();await answer(page,true);
    assert.match(await page.locator('#ses .ov-head .fx-combo').innerText(),/連對 3/);
    assert(await page.evaluate(()=>document.querySelector('#ses .prog').classList.contains('fx-hot')));
    await page.locator('#ses [data-a=next]').click();
    assert.equal(await page.locator('#ses .ov-head .fx-combo').count(),1,'換題後膠囊還在');
    await answer(page,false);
    assert.equal(await page.locator('#ses .ov-head .fx-combo:not(.fx-combo-out)').count(),0,'答錯歸零');
    assert(await page.evaluate(()=>document.querySelector('#ses .opt.wrong').getAnimations().length>0),'答錯的選項會 shake');
    assert.equal(await page.evaluate(()=>fx.combo),0);
    await page.evaluate(()=>{while(curCard()){SES.res=null;nextCard();}});
    await page.waitForTimeout(400);assert.equal(await page.locator('.confetti').count(),1,'完成一課有彩帶');
    assert.equal(await page.locator('#ses .done-hero [data-count]').count()>=2,true,'數字 count-up');
    await page.waitForTimeout(800);
    const txt=await page.locator('#ses .done-hero').innerText();const st=await page.evaluate(()=>SES.stats);
    assert(txt.includes(`答對 ${st.ok} / ${st.n} 題`),'count-up 結束後顯示最終值：'+txt);
    await ctx.close();}

  // ---- 4. 系統減少動畫：沒有彩帶、沒有 JS 動畫，數字直接是最終值 ----
  for(const mode of ['system','setting']){
    const {ctx,page}=await open(mode==='system'?{reducedMotion:'reduce'}:{}, mode==='setting'?{autoSpeak:false,motion:'reduce'}:{autoSpeak:false});
    if(mode==='setting')assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('fx-reduce')),true);
    await startEnQ(page,3);await answer(page,true);
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a instanceof Animation&&!(a instanceof CSSAnimation)&&!(a instanceof CSSTransition)).length),0,mode+'：沒有 JS 動畫');
    await page.locator('#ses [data-a=next]').click();await answer(page,false);
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>!(a instanceof CSSAnimation)&&!(a instanceof CSSTransition)).length),0);
    await page.evaluate(()=>{while(curCard()){SES.res=null;nextCard();}});
    await page.waitForTimeout(400);assert.equal(await page.locator('.confetti').count(),0,mode+'：沒有彩帶');
    const st=await page.evaluate(()=>SES.stats);assert((await page.locator('#ses .done-hero').innerText()).includes(`答對 ${st.ok} / ${st.n} 題`));
    if(mode==='setting')assert.equal(await page.evaluate(()=>document.getAnimations().length),0,'設定「減少」時 CSS 動畫也關掉');
    await ctx.close();}

  // ---- 5. 我的：音效開關、動畫設定會保存；試聽 ----
  {const {ctx,page}=await open();
    await page.locator('#tabs [data-v=me]').click();await page.waitForTimeout(100);
    const sw=page.locator('#view [data-a=set][data-k=sfx]');assert.equal(await sw.getAttribute('aria-checked'),'true');
    await sw.click();assert.equal(await page.evaluate(()=>S.settings.sfx),false);
    await page.locator('#view [data-a=set][data-k=motion][data-v=reduce]').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('bnk-state-v1')).settings.motion),'reduce');
    await page.reload();await page.locator('#tabs [data-v=me]').click();await page.waitForTimeout(100);
    assert.equal(await page.locator('#view [data-a=set][data-k=sfx]').getAttribute('aria-checked'),'false');
    assert.equal(await page.locator('#view [data-a=set][data-k=motion][data-v=reduce]').getAttribute('aria-pressed'),'true');
    await page.locator('#view [data-a=fxTest]').click();assert.match(await page.locator('#toast').innerText(),/音效目前關閉/);
    await ctx.close();}

  // ---- 6. QA#4/#5：對話內不再有「第 N 步」、改進度條；放棄對話時今天 5 分鐘記成跳過 ----
  {const {ctx,page}=await open({}, {autoSpeak:false});
    await page.evaluate(()=>{const r=recommend();startRun(r.tid,r.lv);});
    const head=await page.locator('#run .ov-head').innerText();
    assert.doesNotMatch(head,/第 \d+ 步/);assert.match(head,/對話進行中/);
    const pct=await page.evaluate(()=>parseFloat(document.querySelector('#run .prog.mini i').style.width));assert(pct>0&&pct<100,'對話進度 '+pct);
    await page.evaluate(()=>closeRunView(true));
    await page.evaluate(()=>{const st=t5St();st.step=1;st.on=false;st.log={review:'skip'};t5Save();render();});
    await page.evaluate(()=>{document.querySelector('#homeAll').open=true;});
    assert.match(await page.locator('#view').innerText(),/這段是今天 5 分鐘的第 2 關/);
    assert.doesNotMatch(await page.locator('#view').innerText(),/第 \d+(\/\d+)? 步/,'首頁不再出現「第 N 步」');
    await page.locator('#view [data-a=runDrop]').first().click();
    assert.deepEqual(await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('bnk-today5-v1'));return [s.step,s.log.dlg];}),[2,'skip']);
    assert.match(await page.locator('#view [data-a=t5Go]').innerText(),/第 3\/3 關/);
    // 今天 5 分鐘全部完成：慶祝卡（3 關），可以關掉
    await page.evaluate(()=>t5Finish());
    assert.equal(await page.locator('#fxT5 li').count(),3);await page.locator('#fxT5 [data-fx=t5ok]').click();
    assert.equal(await page.locator('#fxT5').count(),0);
    await ctx.close();}

  assert.deepEqual(errors,[]);
  await browser.close();server.close();
  console.log('PASS: 音效關閉不建 AudioContext、全 App 一個；語音／鎖屏／耳機播放中不出音效；音效→≥250ms→語音；減少動畫（系統與設定）無彩帶、無 JS 動畫；連對膠囊、進度補間、完成彩帶與 count-up；我的頁設定保存；對話改進度條、放棄同步今天 5 分鐘。');
})().catch(e=>{console.error(e);console.error(errors);process.exit(1);});
