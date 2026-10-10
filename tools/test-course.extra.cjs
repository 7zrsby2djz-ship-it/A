// 便利商店試點：播放證據、保留題、舊存檔、跨日門檻、修正與自評分流。
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),repo=path.resolve(__dirname,'..');
function soundSpy(){
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  window.__audioMode='ok';window.__pendingFinish=null;window.__lateFinish=null;
  const queue=finish=>{window.__pendingFinish=finish;window.__lateFinish=finish;if(window.__audioMode==='ok')setTimeout(()=>finish(true),12);};
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{lang:'ja-JP',name:'test',voiceURI:'test'}],addEventListener(){},resume(){},cancel(){},speak(u){queue(ok=>ok?u.onend?.():u.onerror?.({error:'interrupted'}));}}});
  window.Audio=class{constructor(src){this.src=src;}play(){queue(ok=>ok?this.onended?.():this.onerror?.());return Promise.resolve();}pause(){}};
  window.__finishAudio=ok=>window.__pendingFinish?.(ok);
}
async function walk(page,{skipAudio=false,wrongAction=false}={}){
  let madeWrong=false;
  for(let i=0;i<60;i++){
    const info=await page.evaluate(()=>{if(!S.run)return null;const n=curNode(),r=S.run,q=n.t==='hear'&&curQ(n);return {t:n.t,said:r.said[n.id],picked:r.pick[n.id],next:n.t==='act'&&r.pick[n.id]!==undefined?n.o[r.pick[n.id]].next:null,done:n.t==='hear'&&activeQs(n).every(({i})=>r.ans[n.id]?.[i]!==undefined),answered:q&&r.ans[n.id]?.[q.i]!==undefined};});
    if(!info){assert(await page.evaluate(()=>!!RUN_END),'run must reach its result');return;}
    if(info.t==='say'){await page.locator('#run [data-a='+(info.said?'runNext':'sayShow')+']').click();}
    else if(info.t==='hear'){
      if(info.done)await page.locator('#run [data-a=hearDone]').click();
      else if(info.answered)await page.locator('#run [data-a=hearNextQ]').click();
      else{
        if(!skipAudio){await page.locator('#run [data-a=hearPlay]').click();await page.waitForFunction(()=>S.run&&RUN_AUDIO_READY===S.run.node);}
        await page.locator('#run [data-a=hearQ][data-v="0"]').click();
      }
    }else if(info.t==='act'){
      if(info.picked===undefined){const choice=wrongAction&&!madeWrong?1:0;madeWrong||=choice===1;await page.locator('#run [data-a=actPick][data-v="'+choice+'"]').click();}
      else await page.locator('#run [data-a='+(info.next?'actGo':'actRe')+']').click();
    }
  }throw Error('run did not finish');
}
(async()=>{
  const errors=[],server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync(path.join(repo,'index.html')));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});
  try{
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.route('https://**',r=>r.abort());await ctx.addInitScript(soundSpy);
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
    const old={v:1,updatedAt:5,settings:{autoSpeak:false,read:'ro',rate:1},en:{allow:{s:3,due:9e15}},tk:{bus:{lv:{1:{listen:2,done:2,text:0,repair:0,transfer:0,seen:['b1a'],last:1}}}},gm:{star:12},xp:50};
    await page.evaluate(s=>{localStorage.setItem('bnk-state-v1',JSON.stringify(s));sessionStorage.clear();},old);await page.reload();
    assert.equal(await page.locator('#homeAll').evaluate(e=>e.open),false);
    assert.equal(await page.locator('#view [data-a=t5Go]').isVisible(),false,'free cycle is secondary');
    assert(await page.locator('#view .course-hero [data-a=courseLesson]').isVisible());
    assert(await page.evaluate(()=>S.en.allow.s===3&&S.tk.bus.lv[1].listen===2&&S.gm.star===12&&S.settings.read==='ro'&&S.xp===50));
    assert.equal(await page.evaluate(()=>lookupWord('collapse')),'collapse');
    assert.equal(await page.evaluate(()=>lookupWord('expanded')),'expand');
    assert(await page.evaluate(()=>[1,2,3].every(lv=>Array.from({length:30},()=>pickVariant('conv',lv)).every(v=>!v.courseOnly))));
    assert(await page.evaluate(()=>Object.values(CK).filter(k=>k.assessmentOnly).every(k=>exampleOf(k.id)===null)),'reserved lines must not appear in reference examples');
    // 做完三堂有提示的教學，不產生能力通過。
    for(const id of ['notice','needs','pay']){
      await page.evaluate(id=>courseStartLesson(id),id);await page.locator('#course [data-a=coursePractice]').click();await walk(page);
      assert.equal(await page.evaluate(()=>RUN_END.course.mode),'text');
      await page.locator('#run [data-a=runClose]').first().click();
    }
    assert(await page.evaluate(()=>['notice','needs','pay'].every(courseLessonDone)&&!courseSt().assessments.new));
    // 未播完／失敗：選項鎖住；改看字也不能獲得首次新題成績。
    await page.locator('#course [data-a=courseAssess][data-v=new]').click();
    assert(await page.locator('#run [data-a=hearQ]').first().isDisabled());
    await page.evaluate(()=>window.__audioMode='manual');await page.locator('#run [data-a=hearPlay]').click();await page.evaluate(()=>__finishAudio(false));
    assert(await page.locator('#run [data-a=hearQ]').first().isDisabled());
    await page.locator('#run [data-a=hearVis][data-v=full]').click();await page.evaluate(()=>window.__audioMode='ok');await walk(page);
    assert.equal(await page.evaluate(()=>courseSt().assessments.new.passedAt),undefined);
    await page.locator('#run [data-a=runClose]').first().click();
    // 選錯行動後重選全對：記補強方向，不能變成首次全對。
    await page.locator('#course [data-a=courseAssess][data-v=new]').click();await walk(page,{wrongAction:true});
    assert.equal(await page.evaluate(()=>RUN_END.course.passed),false);
    assert(await page.evaluate(()=>RUN_END.course.misses.includes('表達自己的需要')));
    await page.locator('#run [data-a=runClose]').first().click();
    // 中斷時的過期成功回呼不得開鎖；重新整理後可接續，但未答題需重播。
    await page.locator('#course [data-a=courseAssess][data-v=new]').click();await page.evaluate(()=>window.__audioMode='manual');
    await page.locator('#run [data-a=hearPlay]').click();const savedVid=await page.evaluate(()=>S.run.vid);
    await page.locator('#run [data-a=runClose]').first().click();await page.locator('#course [data-a=courseResume]').click();
    await page.evaluate(()=>__lateFinish(true));assert(await page.locator('#run [data-a=hearQ]').first().isDisabled());
    await page.reload();await page.locator('#view [data-a=courseResume]').click();assert.equal(await page.evaluate(()=>S.run.vid),savedVid);
    assert(await page.locator('#run [data-a=hearQ]').first().isDisabled());await walk(page);
    assert.equal(await page.evaluate(()=>RUN_END.course.passed),true);assert.equal(await page.evaluate(()=>courseSt().assessments.new.passMode),'repair','interrupted and replayed run is support, not pure listening');
    await page.locator('#run [data-a=runClose]').first().click();
    assert(await page.locator('#course [data-a=courseAssess][data-v=day]').isDisabled());
    const first=await page.evaluate(()=>courseSt().assessments.new.passedAt);
    await page.evaluate(t=>{window.__clock=t;Date.now=()=>window.__clock;courseAssess('day');},first+86400000-1);assert.equal(await page.evaluate(()=>S.run),null);
    await page.evaluate(t=>{window.__clock=t;courseRender();},first+86400000+1);await page.locator('#course [data-a=courseAssess][data-v=day]').click();await walk(page);
    assert.equal(await page.evaluate(()=>RUN_END.course.passed),true);const day=await page.evaluate(()=>courseSt().assessments.day.passedAt);
    await page.locator('#run [data-a=runClose]').first().click();assert(await page.locator('#course [data-a=courseAssess][data-v=week]').isDisabled());
    await page.evaluate(t=>{window.__clock=t;courseAssess('week');},day+604800000-1);assert.equal(await page.evaluate(()=>S.run),null);
    await page.evaluate(t=>{window.__clock=t;courseRender();},day+604800000+1);await page.locator('#course [data-a=courseAssess][data-v=week]').click();await walk(page);
    assert.equal(await page.evaluate(()=>RUN_END.course.passed),true);
    await page.locator('#run [data-a=runClose]').first().click();
    assert(await page.evaluate(()=>['new','day','week'].every(s=>courseSt().assessments[s].passedAt)&&new Set(courseSt().seen).size===courseSt().seen.length));
    assert(await page.evaluate(()=>!(lvPeek('conv',3)?.seen||[]).some(id=>VAR[id].assessment)),'exam does not flow into ordinary review');
    // 既有主對話：沒播聲音直接答對，必須是看字，不能增加纯聽。
    await page.locator('#course [data-a=courseClose]').click();
    await page.evaluate(()=>{for(const id of ['cv_fukuro_goriyou','cv_atatame_masuka']){const c=ckSt(id,true);c.l.s=3;c.weak=false;}startRun('conv',1,'cv1a');});
    await walk(page,{skipAudio:true});assert.deepEqual(await page.evaluate(()=>RUN_END.types),['text']);assert.equal(await page.evaluate(()=>lvPeek('conv',1).listen),0);
    await page.locator('#run [data-a=runClose]').first().click();
    // 錄音與自評完全分開；離開時釋放麥克風，不把音檔寫進存檔。
    await page.evaluate(()=>{window.__trackStops=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){window.__trackStops++;}}]})}});
      window.MediaRecorder=class{constructor(){this.state='inactive';this.mimeType='audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['test'])});this.onstop?.();}};courseStartLesson('needs');});
    await page.locator('#course [data-a=courseRecord]').click();await page.waitForFunction(()=>!!COURSE_REC.recorder);
    await page.locator('#course [data-a=courseRecord]').click();assert.equal(await page.locator('#course audio').count(),1);
    await page.locator('#course [data-a=courseSelfToggle][data-v="0"]').click();await page.locator('#course [data-a=courseSelfSave]').click();
    await page.locator('#course [data-a=courseClose]').click();assert(await page.evaluate(()=>__trackStops>0&&!COURSE_REC.url));
    const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('bnk-state-v1')));assert(state.course.self.needs.checks[0]);assert(!JSON.stringify(state).includes('blob:'));assert.equal(state.tk.bus.lv[1].listen,2);assert.equal(state.en.allow.s,3);
    // 大丈夫／やばい：正面、負面與資訊不足；情境看字題不增加純聽計數。
    for(const [id,answers] of [['l12',[2,0,1]],['l22',[0,2,1]]]){
      await page.locator('#tabs [data-v=oral]').click();await page.evaluate(id=>OralModule.openLesson(id),id);
      for(let i=0;i<2;i++)await page.locator('#oral-module [data-action=next]').click();
      for(let i=0;i<3;i++){
        await page.locator('#oral-module [data-action=audio].primary').click();await page.waitForFunction(()=>!document.querySelector('#oral-module [data-action=answer]').disabled);
        await page.locator('#oral-module [data-action=answer][data-value="0"]').click();await page.locator('#oral-module [data-action=next]').click();
      }
      const before=await page.evaluate(id=>JSON.parse(localStorage.getItem('kiku-independent-v1')).done[id],id);
      for(let i=0;i<3;i++)await page.locator('#oral-module [data-action=context-answer][data-id="'+i+'"][data-value="'+answers[i]+'"]').click();
      assert.deepEqual(await page.evaluate(id=>JSON.parse(localStorage.getItem('kiku-independent-v1')).done[id],id),before);
      await page.reload();assert.equal(await page.locator('#oral-module [data-action=context-answer]:disabled').count(),9);
    }
    // 手機寬度、明暗模式與長文字：主要路線、地圖、教材均無水平溢位。
    for(const width of [360,390,430])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:844});await page.evaluate(theme=>{UI.tab='home';themeSet(theme);render();},theme);
      for(const screen of ['home','map','needs']){
        if(screen==='map')await page.evaluate(()=>courseOpen());if(screen==='needs')await page.evaluate(()=>courseStartLesson('needs'));
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no document overflow '+width+theme+screen);
        assert(await page.evaluate(()=>[...document.querySelectorAll('#course:not([hidden]) .in,#view')].every(e=>e.scrollWidth<=e.clientWidth+1)),'no content overflow '+width+theme+screen);
        if(screen==='needs')await page.evaluate(()=>courseClose());
      }
    }
    assert.deepEqual(errors,[]);console.log('PASS: store course; reserved prompts; audio errors/cancellation/resume; action correction; strict 24h/7d gates; legacy state; mic cleanup and separate self-assessment; contextual meaning checks; 360/390/430 light/dark.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
