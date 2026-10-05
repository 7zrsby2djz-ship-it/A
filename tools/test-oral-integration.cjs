// Main-app integration: native mobile tab, scoped styles and independent progress.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright')));}
(async()=>{
 const repo=path.join(__dirname,'..'),server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(fs.readFileSync(path.join(repo,'index.html')));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const bundled=process.env.KIKU_CHROMIUM_MODULE?require(process.env.KIKU_CHROMIUM_MODULE):null,engine=bundled?.default||bundled;
 const browser=await chromium.launch(engine?{headless:true,executablePath:process.env.KIKU_CHROMIUM_PATH||await engine.executablePath(),args:engine.args}:{headless:true,channel:'chromium'});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 await context.addInitScript(()=>{let timer;window.__speechCancelled=0;Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(t){this.text=t;}}});Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'ja-JP',name:'test',voiceURI:'test'}],addEventListener(){},cancel(){clearTimeout(timer);window.__speechCancelled++;},resume(){},speak(u){timer=setTimeout(()=>u.onend?.(),30);}}});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
 const tab=id=>page.locator(`.tabbar [data-v="${id}"]`);
 await tab('jp').click();assert(await page.locator('#view').innerText().then(t=>t.includes('日文')));
 const rootStyle=await page.locator('.tabbar').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,height:e.getBoundingClientRect().height}));
 const original=await page.evaluate(()=>localStorage.getItem('bnk-state-v1'));
 await tab('oral').click();assert.equal(await page.locator('#oral-module').count(),1);assert.equal(await page.locator('iframe').count(),0);
 assert.equal(await page.locator('#tabs .tab').count(),6);
 await page.locator('#oral-module [data-action="start"]').first().click();
 await page.locator('#oral-module [data-action="next"]').click();await page.locator('#oral-module [data-action="next"]').click();
 await page.locator('#oral-module [data-action="reveal"]').click();await page.locator('#oral-module [data-action="answer"][data-value="0"]').click();await page.locator('#oral-module [data-action="next"]').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('kiku-independent-v1')).session);assert.equal(before.stage,3);
 await tab('en').click();assert.equal(await page.locator('#oral-module').count(),0);assert((await page.locator('#view').innerText()).includes('英文'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('bnk-state-v1')),original);
 assert.deepEqual(await page.locator('.tabbar').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,height:e.getBoundingClientRect().height})),rootStyle);
 await tab('oral').click();assert.equal(await page.locator('#oral-module .choices').count(),1);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kiku-independent-v1')).session.stage),3);
 await page.reload();assert.equal(await page.locator('#oral-module').count(),1);assert.equal(await page.locator('#oral-module [data-action="answer"]:not([disabled])').count(),0);
 // Native speech gesture works, and switching tabs cancels speech without awarding mastery.
 await page.locator('#oral-module [data-action="audio"]:not([data-slow])').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kiku-independent-v1')).session.q[1].heard);
 assert.equal(await page.locator('#oral-module [data-action="answer"]:not([disabled])').count(),3);
 await tab('jp').click();await tab('oral').click();assert.equal(await page.locator('#oral-module [data-action="answer"]:not([disabled])').count(),0);
 await page.locator('#oral-module [data-action="reveal"]').click();await page.locator('#oral-module [data-action="answer"][data-value="0"]').click();await page.locator('#oral-module [data-action="next"]').click();
 await page.locator('#oral-module [data-action="reveal"]').click();await page.locator('#oral-module [data-action="answer"][data-value="0"]').click();await page.locator('#oral-module [data-action="next"]').click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kiku-independent-v1')).done.l01.text),1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('bnk-state-v1')),original);
 for(const width of [320,360,390,430,768]){
   await page.setViewportSize({width,height:844});
   for(const id of ['home','en','jp','oral','me']){
     await tab(id).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${id}: overflow`);
     if(id==='oral'){
       await page.locator('#oral-module .nav a[href="#home"]').click();
       for(const button of await page.locator('.tabbar .tab').all())assert(await button.evaluate(e=>e.getBoundingClientRect().width>=44));
     }
   }
 }
 await page.setViewportSize({width:390,height:844});await tab('oral').click();await page.locator('#oral-module .nav a[href="#home"]').click();
 const dir=process.env.KIKU_QA_DIR||'/tmp/kiku-integrated-qa';fs.mkdirSync(dir,{recursive:true});
 await page.screenshot({path:path.join(dir,'integrated-home.png'),fullPage:true});
 await page.locator('#oral-module [data-action="start"]').first().click();await page.screenshot({path:path.join(dir,'integrated-lesson.png'),fullPage:true});
 await page.emulateMedia({colorScheme:'dark'});await page.screenshot({path:path.join(dir,'integrated-dark.png'),fullPage:true});
 assert.deepEqual(errors,[]);await browser.close();await new Promise(r=>server.close(r));
 console.log('PASS: native oral tab; no iframe; original progress/style preserved; reload/resume; independent scoring; speech cancellation; 320–768px mobile layouts. Speech simulated.');
})().catch(e=>{console.error(e);process.exit(1);});
