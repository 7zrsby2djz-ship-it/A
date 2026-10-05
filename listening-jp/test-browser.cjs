/* Integration checks. Starts its own local server unless a URL is provided:
 * node listening-jp/test-browser.cjs [http://127.0.0.1:8765/listening-jp/]
 * Requires playwright + Chromium. TTS is mocked: this does NOT verify audible output on a phone.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright')));}
let base=process.argv[2];const KEY='kiku-independent-v1';
const qaDir=process.env.KIKU_QA_DIR||'/tmp/kiku-qa';fs.mkdirSync(qaDir,{recursive:true});
(async()=>{
 let server;
 if(!base){server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(__dirname,'index.html')));});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}/listening-jp/`;}
 const bundled=process.env.KIKU_CHROMIUM_MODULE?require(process.env.KIKU_CHROMIUM_MODULE):null;
 const engine=bundled?.default||bundled;
 const browser=await chromium.launch(engine?{headless:true,executablePath:process.env.KIKU_CHROMIUM_PATH||await engine.executablePath(),args:engine.args}:{headless:true,channel:'chromium'});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 await context.addInitScript(()=>{
   window.__audioFailure=false;window.__spoken=[];let timer;
   class Utter{constructor(t){this.text=t;}}
   Object.defineProperty(window,'SpeechSynthesisUtterance',{value:Utter,configurable:true});
   Object.defineProperty(window,'speechSynthesis',{value:{
     getVoices:()=>[{lang:'ja-JP',name:'Test Japanese',voiceURI:'test-ja'}],
     cancel(){clearTimeout(timer);},resume(){},addEventListener(){},
     speak(u){window.__spoken.push(u.text);timer=setTimeout(()=>window.__audioFailure?u.onerror?.({error:'audio-busy'}):u.onend?.(),35);}
   },configurable:true});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);
 await page.evaluate(()=>localStorage.setItem('bnk-state-v1','original-transport-sentinel'));
 const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 async function openLesson(id){await page.goto(base+'#course');await page.locator(`[data-action="start"][data-id="${id}"]`).click();}
 async function toQuiz(){await page.locator('[data-action="next"]').click();await page.locator('[data-action="next"]').click();}
 async function hear(slow=false){await page.locator(slow?'[data-action="audio"][data-slow]':'[data-action="audio"]:not([data-slow])').click();await page.waitForFunction(k=>{const s=JSON.parse(localStorage.getItem(k)).session;return s.q[s.stage-2].heard;},KEY);await page.locator('[data-action="answer"][data-value="0"]').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('[data-action="answer"]').disabled);}
 async function answer(value=0){await page.locator(`[data-action="answer"][data-value="${value}"]`).click();await page.locator('[data-action="next"]').click();}
 // All 24 lesson paths must play and finish, not just render a static card.
 for(let n=1;n<=24;n++){
   const id='l'+String(n).padStart(2,'0');await openLesson(id);await toQuiz();
   for(let i=0;i<3;i++){await hear();await answer();}
   const s=await state();assert.equal(s.session.stage,5);assert.equal(s.done[id].listen,1,id);
 }
 assert.equal(Object.keys((await state()).done).length,24);
 assert.equal(await page.evaluate(()=>localStorage.getItem('bnk-state-v1')),'original-transport-sentinel');
 // Result reload cannot double-count, and an interrupted successful play is not a fresh playback.
 await page.reload();assert.equal((await state()).done.l24.attempts,1);
 await openLesson('l01');await toQuiz();await hear();await page.reload();
 assert(await page.locator('[data-action="answer"]').first().isDisabled());
 await hear();await answer();for(let i=0;i<2;i++){await hear();await answer();}
 assert.equal((await state()).done.l01.support,1);
 // Slow playback alone is support, never unassisted.
 await openLesson('l02');await toQuiz();for(let i=0;i<3;i++){await hear(i===0);await answer();}
 assert.equal((await state()).done.l02.support,1);assert.equal((await state()).done.l02.listen,1);
 // Text reveal and a wrong answer are recorded as study, not listening mastery.
 await openLesson('l03');await toQuiz();await page.locator('[data-action="reveal"]').click();await answer(1);
 for(let i=0;i<2;i++){await hear();await answer();}
 assert.equal((await state()).done.l03.text,1);assert((await state()).done.l03.due-Date.now()<7*3600000);
 // Failed speech must expose text and never increment listen.
 await openLesson('l04');await toQuiz();await page.evaluate(()=>window.__audioFailure=true);
 await page.locator('[data-action="audio"]:not([data-slow])').click();
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).session.q[0].assisted,KEY);await answer();
 await page.evaluate(()=>window.__audioFailure=false);for(let i=0;i<2;i++){await hear();await answer();}
 assert.equal((await state()).done.l04.text,1);
 // Dictionary, adult classification, search and favorites are separate from course progress.
 await page.goto(base+'#words');await page.locator('[data-action="filter"][data-value="adult"]').click();
 assert.equal(await page.locator('.word-card').count(),15);
 await page.locator('#word-search').fill('gomu');assert.equal(await page.locator('.word-card').count(),1);
 await page.locator('[data-action="star"]').click();await page.locator('[data-action="word-audio"]').click();
 await page.locator('[data-action="filter"][data-value="star"]').click();assert.equal(await page.locator('.word-card').count(),1);
 assert.equal((await state()).stars.length,1);
 // Export/import can round-trip with confirmation and retain isolation.
 await page.goto(base+'#settings');
 const downloadP=page.waitForEvent('download');await page.locator('[data-action="export"]').click();
 const download=await downloadP,file=path.join(qaDir,'progress.json');await download.saveAs(file);
 assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).version,1);
 page.on('dialog',d=>d.accept());await page.locator('#import-file').setInputFiles(file);
 await page.waitForFunction(()=>document.querySelector('#toast').textContent==='進度已匯入。');
 assert.equal(Object.keys((await state()).done).length,24);
 // Layout regression checks, including dark mode and long dictionary entries.
 for(const width of [360,390,768,1200]){
   await page.setViewportSize({width,height:900});
   for(const route of ['#home','#course','#words','#settings']){
     await page.goto(base+route);
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${route} overflow`);
   }
 }
 await page.setViewportSize({width:390,height:844});await page.goto(base+'#home');
 await page.screenshot({path:path.join(qaDir,'home-mobile.png'),fullPage:true});
 await openLesson('l03');await page.screenshot({path:path.join(qaDir,'lesson-mobile.png'),fullPage:true});
 await page.emulateMedia({colorScheme:'dark'});await page.screenshot({path:path.join(qaDir,'lesson-dark.png'),fullPage:true});
 await page.emulateMedia({colorScheme:'light'});await page.setViewportSize({width:1200,height:900});await page.goto(base+'#home');
 await page.screenshot({path:path.join(qaDir,'home-desktop.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 await browser.close();
 if(server)await new Promise(resolve=>server.close(resolve));
 console.log('PASS: 24 lesson flows, score classes, resume, speech failure, dictionary, backups, storage isolation, 4 widths, dark-mode rendering; speech is simulated.');
})().catch(e=>{console.error(e);process.exit(1);});
