// Kana 1.1: existing save compatibility, expanded anchors, offline human audio and scoring.
// Usage: node tools/test-kana.cjs [KANA_CHROMIUM_PATH may select an installed browser].
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright')));}
const repo=path.resolve(__dirname,'..'),errors=[];
const old={v:1,updatedAt:5,settings:{read:'ro',romaji:true},en:{allow:{s:3}},tk:{bus:{lv:{1:{listen:2}}}},gm:{star:12},xp:50,
  kana:{v:1,prefs:{script:'mixed',romaji:false},cards:{'hira:e':{hear:{attempts:2,correct:1,assisted:0,due:0,days:['2026-10-06']}}},wordFamiliarity:{eki:'unfamiliar'},active:null}};
function spy(){
  window.__spoken=[];window.__audios=[];window.__audioMode='ok';window.__late=[];
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    getVoices:()=>[{lang:'ja-JP',name:'test'}],addEventListener(){},resume(){},cancel(){},
    speak(u){window.__spoken.push(u.text);setTimeout(()=>u.onend&&u.onend(),20);}
  }});
  window.Audio=class{
    constructor(src){this.src=src;this.currentTime=0;window.__audios.push(this);}
    play(){window.__late.push({audio:this,end:this.onended});
      if(window.__audioMode==='reject')return Promise.reject(new Error('not playable'));
      if(window.__audioMode==='error')setTimeout(()=>this.onerror&&this.onerror(),20);
      else if(window.__audioMode==='ok')setTimeout(()=>this.onended&&this.onended(),20);
      return Promise.resolve();}
    pause(){this.paused=true;}
  };
}
(async()=>{
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(fs.readFileSync(path.join(repo,'index.html')));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const launch={headless:true};
  if(process.env.KANA_CHROMIUM_PATH){launch.executablePath=process.env.KANA_CHROMIUM_PATH;launch.args=['--no-sandbox','--disable-dev-shm-usage'];}
  const browser=await chromium.launch(launch);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.route('https://**',r=>r.abort());await context.addInitScript(spy);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(s=>localStorage.setItem('bnk-state-v1',JSON.stringify(s)),old);await page.reload();
  assert.equal(await page.evaluate(()=>S.settings.read),'ro');
  assert.equal(await page.evaluate(()=>knSt().prefs.romaji),false);
  assert.equal(await page.evaluate(()=>knCard('hira:e').hear.correct),1);
  assert.equal(await page.evaluate(()=>knSt().wordFamiliarity.eki),'unfamiliar');
  assert(await page.evaluate(()=>S.tk.bus.lv[1].listen===2&&S.en.allow.s===3&&S.gm.star===12));
  assert.equal(await page.evaluate(()=>KD.words.length),324);
  assert.equal(await page.evaluate(()=>Object.keys(K_AUDIO.clips).length),44);
  await page.evaluate(()=>{UI.tab='jp';render();knOpen();});
  assert.equal(await page.locator('#kn .kcell:not(.empty)').count(),46);
  for(const mode of ['hira','kata','mixed']){
    await page.locator(`#kn [data-k=mode][data-v=${mode}]`).click();
    assert.equal(await page.evaluate(()=>knSt().prefs.script),mode);
  }
  await page.locator('#kn [data-k=open][data-v="hira:e"]').click();
  // An old familiarity flag reorders but never loses its word; extras are collapsed.
  assert.equal(await page.locator('#kn .kword:visible').count(),2);
  assert.equal(await page.locator('#kn .kextras').count(),1);
  await page.locator('#kn .kextras summary').click();
  assert.equal(await page.locator('#kn .kword:visible').count(),4);
  assert((await page.locator('#kn').innerText()).includes('英語'));
  await page.locator('#kn [data-k=sayKana]').click();await page.waitForFunction(()=>!KG.audio);
  assert.equal(await page.evaluate(()=>__spoken.length),0,'A single kana must not use TTS');
  assert(await page.evaluate(()=>__audios.at(-1).src.startsWith('data:audio/mpeg;base64,')));
  await page.locator('#kn [data-k=sayWord]').first().click();await page.waitForFunction(()=>__spoken.length===1);
  await page.locator('#kn [data-k=peek]').click();assert.equal(await page.evaluate(()=>KG.peek),true);
  await page.locator('#kn [data-k=open][data-v="hira:o"]').click();assert.equal(await page.evaluate(()=>KG.peek),false);
  // Every added anchor can be presented without changing the old progress keys.
  for(const key of ['hira:n','hira:wo','kata:wo','kata:mu','hira:ri','kata:ki','kata:te']){
    await page.evaluate(k=>{KG.key=k;KG.view='card';knRender();},key);
    if(key==='hira:n'||key==='hira:wo'||key==='kata:wo')assert.equal(await page.locator('#kn [data-k=sayKana]').count(),0);
  }
  assert(await page.evaluate(()=>Object.values(KA).every(a=>a.wordRefs.every(r=>!['battery','grey'].includes(r.wordId)))));
  assert(!(await page.evaluate(()=>knQuestion('hear','hira:o',[]).opts)).includes('hira:wo'));
  assert(!(await page.evaluate(()=>knPlanFor('hira:n'))).includes('hear'));
  assert(!(await page.evaluate(()=>knPlanFor('hira:wo'))).includes('hear'));
  const rotated=await page.evaluate(()=>{const c=knCard('hira:a',true);return [0,1,2,3].map(n=>{c.wordLink.attempts=n;return knQuestion('wordLink','hira:a',[]).word;});});
  assert.equal(new Set(rotated).size,4);
  await page.evaluate(()=>{knSt().wordFamiliarity.ame='unfamiliar';knCard('hira:a').wordLink.attempts=2;});
  assert.notEqual(await page.evaluate(()=>knQuestion('wordLink','hira:a',[]).word),'ame');
  // Expanded ム words genuinely begin with ム; the original ハム example stays contextual.
  assert.equal(await page.evaluate(()=>KA['kata:mu'].wordRefs[0].matchType),'contains_rare_katakana');
  assert.equal(await page.evaluate(()=>KA['kata:mu'].wordRefs[1].matchType),'head');
  await page.evaluate(()=>{knCard('kata:mu',true).wordLink.attempts=1;const q=knQuestion('wordLink','kata:mu',[]);knSt().active={mode:'kata',targets:[q.key],items:[q,{type:'learn',key:'kata:a'},{type:'learn',key:'kata:e'}],i:0,ans:{},requeued:{}};KG.view='round';KG.peek=false;KG.play={};knRender();});
  const word=await page.evaluate(()=>knCur().word);assert.equal(word,'muubii');
  await page.evaluate(()=>knAnswer(knCur().opts.find(k=>k!==knCur().key)));
  assert.equal(await page.evaluate(()=>knSt().active.items[3].word),word,'A retry must preserve the same word');
  // Hear credit is blocked until the recording ends successfully.
  async function hearQuestion(){await page.evaluate(()=>{const q=knQuestion('hear','hira:ka',[]);knSt().active={mode:'hira',targets:[q.key],items:[q,{type:'learn',key:'hira:e'}],i:0,ans:{},requeued:{}};KG.view='round';KG.peek=false;KG.play={};knRender();});}
  await hearQuestion();const before=await page.evaluate(()=>knCard('hira:ka',true).hear.correct);
  await page.evaluate(()=>knAnswer(knCur().key));assert.equal(await page.evaluate(()=>knSt().active.ans[0]),undefined);
  await page.evaluate(()=>__audioMode='reject');await page.locator('#kn [data-k=play]').first().click();await page.waitForFunction(()=>KG.play.fail);
  assert.equal(await page.evaluate(()=>KG.play.fail),'recording');
  assert.equal(await page.locator('#kn [data-k=ans]:not([disabled])').count(),0);
  await page.evaluate(()=>__audioMode='ok');await page.locator('#kn [data-k=play]').first().click();await page.waitForFunction(()=>KG.play.ok);
  await page.evaluate(()=>knAnswer(knCur().key));assert.equal(await page.evaluate(()=>knCard('hira:ka').hear.correct),before+1);
  await page.evaluate(()=>knAnswer(knCur().key));assert.equal(await page.evaluate(()=>knCard('hira:ka').hear.correct),before+1,'No double scoring');
  await hearQuestion();await page.evaluate(()=>__audioMode='ok');await page.locator('#kn [data-k=playSlow]').click();await page.waitForFunction(()=>KG.play.ok);
  assert.equal(await page.evaluate(()=>__audios.at(-1).playbackRate),.8);
  assert.equal(await page.evaluate(()=>__audios.at(-1).preservesPitch),true);
  // No Japanese synthesizer voice is required for human recordings.
  await page.evaluate(()=>{VOICES=[{lang:'en-US'}];});
  await page.locator('#kn [data-k=play]').click();await page.waitForFunction(()=>KG.play.ok);
  await page.evaluate(()=>{VOICES=[{lang:'ja-JP'}];__audioMode='hang';});
  await page.locator('#kn [data-k=play]').click();await page.locator('#kn [data-k=noaudio]').click();
  await page.evaluate(()=>__late.forEach(x=>x.end&&x.end()));assert.equal(await page.evaluate(()=>KG.play.ok),undefined);
  const h0=await page.evaluate(()=>knCard('hira:ka').hear.correct);
  await page.evaluate(()=>knAnswer(knCur().key));assert.equal(await page.evaluate(()=>knCard('hira:ka').hear.correct),h0);
  assert.equal(await page.evaluate(()=>knSt().active.ans[0].assisted),true);
  await page.evaluate(()=>knNext());const position=await page.evaluate(()=>knSt().active.i);
  const cards=await page.evaluate(()=>JSON.stringify(knSt().cards));await page.reload();
  assert.equal(await page.evaluate(()=>knSt().active.i),position);
  assert.equal(await page.evaluate(()=>JSON.stringify(knSt().cards)),cards);
  await page.evaluate(()=>{UI.tab='jp';render();knOpen('go');});assert.equal(await page.evaluate(()=>KG.view),'round');
  assert.equal(await page.evaluate(()=>KG.play.ok),undefined);
  await page.evaluate(()=>{knSt().active=null;knSt().prefs.script='kata';knStartRound();});
  assert((await page.evaluate(()=>knSt().active.targets)).every(k=>k.startsWith('kata:')));
  // Finish a normal round; all four score categories and old course state survive.
  await page.evaluate(()=>{__audioMode='ok';});
  for(let guard=0;await page.evaluate(()=>!!knSt().active)&&guard<60;guard++){
    const type=await page.evaluate(()=>knCur().type);
    if(type==='learn')await page.evaluate(()=>knNext());
    else if(type==='view')await page.evaluate(()=>knSelfRate(true));
    else{if(type==='hear'){await page.locator('#kn [data-k=play]').click();await page.waitForFunction(()=>KG.play.ok);}
      await page.evaluate(()=>{knAnswer(knCur().key);knNext();});}
  }
  assert.equal(await page.evaluate(()=>KG.view),'done');
  assert(await page.evaluate(()=>S.tk.bus.lv[1].listen===2&&S.en.allow.s===3&&S.gm.star===12&&S.settings.read==='ro'));
  const qa=process.env.KANA_QA_DIR||'/tmp/kana-qa';fs.mkdirSync(qa,{recursive:true});
  for(const width of [360,390,430])for(const dark of [false,true]){
    await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme:dark?'dark':'light'});
    await page.evaluate(()=>{KG.view='home';knRender();});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#kn .ov-body').scrollWidth<=innerWidth));
    assert(await page.locator('#kn .kcell:not(.empty)').first().evaluate(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44;}));
    if(width===390)await page.screenshot({path:path.join(qa,`home-${dark?'dark':'light'}.png`)});
    await page.evaluate(()=>{KG.key='hira:e';KG.view='card';knRender();});
    await page.locator('#kn .kextras summary').click();assert(await page.evaluate(()=>document.querySelector('#kn .ov-body').scrollWidth<=innerWidth));
    if(width===390&&!dark)await page.screenshot({path:path.join(qa,'expanded-card.png')});
  }
  assert.deepEqual(errors,[]);await context.close();
  // Real browser decoding + playback with the network offline (audio quality is a true-device check).
  const real=await browser.newContext({viewport:{width:390,height:844}});
  await real.route('https://**',r=>r.abort());const audioPage=await real.newPage();await audioPage.goto('http://127.0.0.1:'+server.address().port);await real.setOffline(true);
  const decoded=await audioPage.evaluate(async()=>{const ac=new AudioContext(),out=[];for(const [id,src]of Object.entries(K_AUDIO.clips)){
    const bytes=Uint8Array.from(atob(src.split(',')[1]),c=>c.charCodeAt(0));const b=await ac.decodeAudioData(bytes.buffer);
    out.push({id,duration:b.duration,channels:b.numberOfChannels});}await ac.close();return out;});
  assert.equal(decoded.length,44);assert(decoded.every(c=>c.duration>.2&&c.duration<6&&c.channels===1));
  await audioPage.evaluate(()=>{UI.tab='jp';render();knOpen();KG.key='hira:e';KG.view='card';knRender();});
  await audioPage.locator('#kn [data-k=sayKana]').click();await audioPage.waitForFunction(()=>!KG.audio,{},{timeout:15000});
  const played=await audioPage.evaluate(()=>new Promise(r=>knSayKana('ka',false,(ok,why)=>r({ok,why}))));assert.equal(played.ok,true);
  await real.close();await browser.close();await new Promise(r=>server.close(r));
  console.log('PASS: 324 words; expanded/cycling anchors; original save/round resume; human audio success/failure/cancellation; no false listening credit; 360/390/430 light/dark layouts; 44 MP3s decoded and played offline. Subjective iPhone sound quality not tested.');
})().catch(e=>{console.error(e);process.exit(1);});
