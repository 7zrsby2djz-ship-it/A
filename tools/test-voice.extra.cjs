// 日文聲音統一：對話、五十音、口語聽力都用同一個挑選結果（加強版優先、Eddy 等機械音最後）；「我的」可指定並試聽；鎖屏聽力不用 Web Speech。
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[];
function mock(){
  const V=[{name:'Eddy（日文（日本））',lang:'ja-JP',voiceURI:'com.apple.eloquence.ja-JP.Eddy',localService:true},
    {name:'Kyoko',lang:'ja-JP',voiceURI:'com.apple.voice.compact.ja-JP.Kyoko',localService:true},
    {name:'Kyoko (Enhanced)',lang:'ja-JP',voiceURI:'com.apple.voice.enhanced.ja-JP.Kyoko',localService:true},
    {name:'Samantha',lang:'en-US',voiceURI:'com.apple.voice.compact.en-US.Samantha',localService:true},
    {name:'Meijia',lang:'zh-TW',voiceURI:'com.apple.voice.compact.zh-TW.Meijia',localService:true}];
  window.__said=[];
  window.SpeechSynthesisUtterance=class{constructor(t){this.text=t;this.lang='';this.voice=null;this.rate=1;}};
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>V,addEventListener(){},removeEventListener(){},resume(){},cancel(){},pause(){},speaking:false,pending:false,
    speak(u){window.__said.push({t:u.text,lang:u.lang,v:u.voice&&u.voice.name});setTimeout(()=>{u.onstart&&u.onstart();u.onend&&u.onend({});},10);}}});
}
(async()=>{
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync(path.join(repo,'index.html')));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.route('https://**',r=>r.abort());await ctx.addInitScript(mock);
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const said=()=>page.evaluate(()=>window.__said.splice(0));
  const jaVoicesUsed=async()=>[...new Set((await said()).filter(x=>/^ja/.test(x.lang)).map(x=>x.v))];
  assert.equal(await page.evaluate(()=>pickJaVoice().name),'Kyoko (Enhanced)');
  // 對話用的 speak()
  await page.evaluate(()=>speak('こんにちは','ja-JP'));
  // 五十音單音與單字
  await page.evaluate(()=>new Promise(r=>knSay('あ',.8,()=>r())));
  // 口語聽力試聽
  await page.locator('#tabs [data-v=oral]').click();await page.evaluate(()=>{location.hash='#settings';});await page.waitForTimeout(200);
  await page.locator('#oral-module [data-action=test-audio]').click();await page.waitForTimeout(300);
  assert.deepEqual(await jaVoicesUsed(),['Kyoko (Enhanced)'],'全部用同一個加強版聲音');
  // 中文仍用中文聲音
  await page.evaluate(()=>speak('你好','zh-TW'));assert.equal((await said())[0].v,'Meijia');
  // 「我的」：選單（機械音標示）、指定 Kyoko、試聽
  await page.locator('#tabs [data-v=me]').click();
  const opts=await page.locator('#jaVoiceSel option').allInnerTexts();
  assert(opts.some(o=>/Eddy.*機械音/.test(o))&&opts.some(o=>/Kyoko \(Enhanced\)（加強版）/.test(o)),opts.join('|'));
  assert(!opts.some(o=>/Samantha|Meijia/.test(o)),'只列日文聲音');
  await page.selectOption('#jaVoiceSel','com.apple.voice.compact.ja-JP.Kyoko');await said();
  await page.locator('#view [data-a=jaVoiceTest]').click();
  await page.evaluate(()=>new Promise(r=>knSay('い',.8,()=>r())));
  await page.locator('#tabs [data-v=oral]').click();await page.evaluate(()=>{location.hash='#settings';});await page.waitForTimeout(200);
  await page.locator('#oral-module [data-action=test-audio]').click();await page.waitForTimeout(300);
  assert.deepEqual(await jaVoicesUsed(),['Kyoko'],'指定後全部改用 Kyoko');
  await page.reload();assert.equal(await page.evaluate(()=>S.settings.jaVoice),'com.apple.voice.compact.ja-JP.Kyoko','設定有存');
  // 鎖屏聽力不用 Web Speech
  await page.waitForFunction(()=>!!globalThis.ORAL_AUDIO);await said();
  await page.evaluate(()=>{HTMLMediaElement.prototype.play=function(){return Promise.resolve();};lpOpen();});
  await page.locator('#lpv [data-a=lpToggle]').click();await page.waitForTimeout(200);
  assert.equal((await said()).length,0,'鎖屏聽力沒有呼叫 Web Speech');
  assert.deepEqual(errors,[]);await browser.close();server.close();
  console.log('PASS: 對話／五十音／口語聽力共用 pickJaVoice（加強版優先、Eddy 機械音最後），中文仍用中文聲音；「我的」可指定、試聽、會保存；鎖屏聽力不用 Web Speech。');
})().catch(e=>{console.error(e);process.exit(1);});
