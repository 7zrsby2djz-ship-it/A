/* 學習路線：課堂練習、保留的新任務與延後驗收，不共用「熟練」計數。 */
const COURSE_VIEW={page:'map',lesson:null,open:false,returnFocus:null,clip:null,status:'',heard:{},self:[]};
const COURSE_REC={recorder:null,stream:null,url:'',chunks:[],gen:0,error:'',busy:false};
function courseSt() {
  if(!S.course||typeof S.course!=='object'||Array.isArray(S.course))S.course={};
  const c=S.course;c.v=1;
  for(const k of ['lessons','assessments','self'])if(!c[k]||typeof c[k]!=='object'||Array.isArray(c[k]))c[k]={};
  if(!Array.isArray(c.seen))c.seen=[];return c;
}
function courseLessonDone(id){return !!courseSt().lessons[id]?.completedAt;}
function courseStageDue(id) {
  const stages=STORE_COURSE.stages,i=stages.findIndex(s=>s.id===id);
  if(i<0)return null;
  if(i===0)return STORE_COURSE.lessons.slice(0,3).every(l=>courseLessonDone(l.id))?0:null;
  const prev=courseSt().assessments[stages[i-1].id];return prev?.passedAt?prev.passedAt+stages[i].delay:null;
}
function courseNext() {
  if(S.run?.course)return {label:'接續中斷的課堂',detail:recapText(S.run),action:'courseResume'};
  const l=STORE_COURSE.lessons.slice(0,3).find(l=>!courseLessonDone(l.id));
  if(l)return {label:'開始第 '+(STORE_COURSE.lessons.indexOf(l)+1)+' 課',detail:l.goal,action:'courseLesson',value:l.id};
  for(const st of STORE_COURSE.stages){
    if(courseSt().assessments[st.id]?.passedAt)continue;
    const due=courseStageDue(st.id);
    if(due!==null&&due<=Date.now())return {label:'開始驗收：'+st.name,detail:'先聽新任務，再決定回應與操作；可隨時求助。',action:'courseAssess',value:st.id};
    return {label:'看看路線與複習',detail:st.name+'驗收：'+courseDate(due),action:'courseOpen'};
  }
  return {label:'查看三次驗收紀錄',detail:'這組便利商店任務已完成三次驗收；口說自評另外記。',action:'courseOpen'};
}
function courseDate(t){return t===null?'前一階段完成後開放':t<=Date.now()?'現在可以開始':new Date(t).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})+'（'+relDue(t)+'）';}
function courseCardHtml(compact) {
  const n=courseNext(),count=STORE_COURSE.lessons.slice(0,3).filter(l=>courseLessonDone(l.id)).length;
  return `<section class="card course-hero stack" aria-label="便利商店學習路線">
    <div class="row"><span class="course-eyebrow">日文任務路線 · 便利商店試點</span><span class="pill">${count}/3 課已練</span></div>
    <h2>${esc(STORE_COURSE.title)}</h2><p>聽懂問題 → 說清需要 → 付款操作 → 換店驗收</p>
    ${compact?'':`<p class="small">學完能處理袋子、加熱與付款。每課約 3–4 分鐘，讀音與句型在用到時再查。</p>`}
    <div class="course-next"><b>現在這一步</b><p>${esc(n.detail)}</p></div>
    <button class="btn primary block" data-a="${n.action}" ${n.value?`data-v="${n.value}"`:''}>${esc(n.label)}</button>
    <button class="btn block" data-a="courseOpen">四課路線與能力紀錄</button>
  </section>`;
}
function courseProgressHtml() {
  const c=courseSt();return `<section class="card flat stack course-progress"><h3>便利商店：能力證據</h3>
    <div class="course-evidence">${STORE_COURSE.stages.map(st=>{const a=c.assessments[st.id];return `<div><b>${st.name}</b><span>${a?.passedAt?(a.passMode==='listen'?'自行聽懂並完成':'求助後完成'):'尚未驗收'}${a?.passedAt?'<small>'+new Date(a.passedAt).toLocaleDateString('zh-TW')+'</small>':''}</span></div>`;}).join('')}</div>
    <p class="small muted">只代表這組模擬任務。${Object.keys(c.self).length?'口說自評已記錄，與上述成績分開。':'口說尚無自評紀錄。'} 真人口音與現場噪音仍需另外練習。</p></section>`;
}
function courseOpen(lesson) {
  closeSheet();taskAudioStop();lsStop();const lp=$('#lpAudio');if(lp)lp.pause();
  if(UI.tab==='oral')window.OralModule.unmount();
  COURSE_VIEW.returnFocus=document.activeElement;COURSE_VIEW.open=true;COURSE_VIEW.lesson=lesson||null;COURSE_VIEW.page=lesson?'lesson':'map';COURSE_VIEW.status='';
  let el=$('#course');if(!el){el=document.createElement('div');el.id='course';el.className='overlay jpmode';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','便利商店四課路線');document.body.append(el);}
  el.hidden=false;document.body.style.overflow='hidden';courseRender();el.querySelector('.ov-head button')?.focus();
}
function courseHide() {
  COURSE_VIEW.open=false;taskAudioStop();courseRecordDiscard();const el=$('#course');if(el)el.hidden=true;document.body.style.overflow='';
}
function courseClose() {
  const focus=COURSE_VIEW.returnFocus;courseHide();render();homeTop();
  if(UI.tab==='oral')window.OralModule.mount();if(focus?.isConnected)focus.focus();else $('#view [data-a=courseOpen]')?.focus();
}
function courseMapHtml() {
  const c=courseSt();return `<div class="course-intro"><span class="course-eyebrow">學習目標</span><h2>${esc(STORE_COURSE.title)}</h2><p>把一場結帳拆成四課。完成教學只標「已練」，能力要由新任務與延後驗收確認。</p></div>
    ${S.run?`<section class="card flat stack"><b>有一段中斷的對話</b><p class="small">${esc(recapText(S.run))}</p><div class="row wrap"><button class="btn sm" data-a="courseResume">接續已保存的對話</button><button class="btn sm" data-a="courseDrop">放棄這段，保留其他進度</button></div></section>`:''}
    <ol class="course-roadmap">${STORE_COURSE.lessons.map((l,i)=>{
      const done=i<3?courseLessonDone(l.id):!!c.assessments.week?.passedAt;
      return `<li><span class="course-number">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(l.name)}</h3><p class="small muted">${esc(l.goal)}</p><div class="row wrap"><span class="small">${done?'已完成這一步':'約 '+l.minutes+' 分鐘'}</span><button class="btn sm" data-a="${i<3?'courseLesson':'courseCheckMap'}" data-v="${l.id}">${i<3?(done?'再練／查看':'進入這一課'):'查看驗收'}</button></div></div></li>`;
    }).join('')}</ol>
    <section class="stack" id="courseChecks"><h3>第四課：三次驗收</h3><p class="small muted">24 小時從首次通過起算；7 天從隔天驗收通過起算。提早複習不會產生延後保留成績。</p>
      ${STORE_COURSE.stages.map(st=>{const a=c.assessments[st.id],due=courseStageDue(st.id),ready=due!==null&&due<=Date.now();return `<div class="card flat stack"><div class="row"><b class="grow">${st.name}</b><span class="pill">${a?.passedAt?(a.passMode==='listen'?'自行完成':'求助完成'):'待驗收'}</span></div><p class="small muted">${a?.passedAt?'已通過：'+new Date(a.passedAt).toLocaleString('zh-TW'):courseDate(due)}</p>
        ${a?.last&&!a.passedAt?`<p class="small">上次：${esc(a.last.summary)}</p>`:''}
        ${!a?.passedAt?`<button class="btn block ${ready?'primary':''}" data-a="courseAssess" data-v="${st.id}" ${ready?'':'disabled'}>${ready?'聽新任務，開始驗收':due===null?'先完成前一步':'到時間後開始'}</button>`:'<p class="small">這次紀錄已保留，可回前三課複習。</p>'}</div>`;}).join('')}
    </section>${courseProgressHtml()}
    <section class="card flat stack"><h3>需要時再查</h3><p class="small muted">這些補充不會算成新題驗收。</p><div class="row wrap"><button class="btn sm" data-a="courseKana">五十音與讀音</button><button class="btn sm" data-a="courseGame">換當店員練聽</button><button class="btn sm" data-a="courseOral" data-v="l12">大丈夫：再看一個場合</button></div></section>`;
}
function courseClipHtml(id) {
  const k=CK[id],fixed=!!taskAudioClip([id]);return `<article class="card flat stack course-clip">
    ${lineHtml([id])}<p><b>${esc(k.zh)}</b></p><p class="small muted"><b>語域：</b>${esc(k.register||'禮貌回答')}<br><b>旅客：</b>${esc(k.production||'對店員可以說')}<br><b>情境：</b>${esc(k.context||'收銀台')}</p>
    ${k.note?`<p class="small">${esc(k.note)}</p>`:''}<div class="row wrap"><button class="btn sm" data-a="courseClip" data-v="${id}:normal">▶ 一般語速</button><button class="btn sm" data-a="courseClip" data-v="${id}:slow">▶ 慢速拆聽</button></div>
    <p class="small muted">${fixed?'固定合成音檔：一般／慢速各一份':'裝置合成語音：實際聲線依手機而異'}。${COURSE_VIEW.heard[id]?'本次已播完。':'請留在頁面聽完。'}</p></article>`;
}
function courseSelfHtml() {
  const saved=courseSt().self.needs;return `<section class="card flat stack"><h3>口說：錄下來，自己核對</h3><p class="small muted">錄音只留在目前頁面，離開就釋放。自評另存，不會自動判定發音或口說通過，也不影響四課進度。</p>
    <p>不看參考句說：<b>袋子不用、便當要加熱；聽不清楚時請再說一次。</b></p>
    <div class="row wrap"><button class="btn sm" data-a="courseRecord" ${COURSE_REC.busy?'disabled':''}>${COURSE_REC.recorder?'停止錄音':'開始錄音'}</button></div>
    ${COURSE_REC.url?`<audio controls src="${esc(COURSE_REC.url)}" aria-label="回聽自己的錄音"></audio>`:''}
    <p class="small muted" role="status">${esc(COURSE_REC.error|| (COURSE_REC.recorder?'錄音中，說完請按停止。':COURSE_REC.busy?'正在開啟麥克風……':saved?'上次自評：'+new Date(saved.at).toLocaleDateString('zh-TW')+'；'+saved.checks.filter(Boolean).length+'/3 項勾選。':'也可以先小聲說，再做自評。'))}</p>
    ${STORE_COURSE.selfChecks.map((s,i)=>`<button class="btn course-self" data-a="courseSelfToggle" data-v="${i}" aria-pressed="${!!COURSE_VIEW.self[i]}">${COURSE_VIEW.self[i]?'✓':'○'} ${esc(s)}</button>`).join('')}
    <button class="btn block" data-a="courseSelfSave">儲存這次自評（獨立紀錄）</button></section>`;
}
function courseLessonHtml() {
  const l=STORE_COURSE.lessons.find(l=>l.id===COURSE_VIEW.lesson);if(!l||l.id==='check')return courseMapHtml();
  const i=STORE_COURSE.lessons.indexOf(l);
  return `<div class="course-intro"><span class="course-eyebrow">第 ${i+1} 課 · 約 ${l.minutes} 分鐘</span><h2>${esc(l.name)}</h2><p>${esc(l.goal)}</p></div>
    <section class="card course-next"><b>這一課怎麼做</b><p class="small">先比較一般與慢速聲音，再走一次有提示的任務。教學可以看文字；「已練」代表做過，與第四課的能力證據分開。</p></section>
    <p class="small muted" role="status">${esc(COURSE_VIEW.status)}</p>
    ${l.clips.map(courseClipHtml).join('')}
    ${l.id==='notice'?`<section class="card flat stack"><h3>聽聲音的邊界</h3><p><span lang="ja">ごりよう</span>／<span lang="ja">おしはらい</span>：先找詞的邊界，留住「よう」的長音。</p><p>這三段是固定合成音檔，適合清楚聽辨。聲線、連音與噪音仍需另外用真人材料練習。</p></section>`:''}
    ${l.id==='needs'?`<section class="card flat stack"><h3>大丈夫：意思由對話決定</h3><p><b>店員問要不要袋子</b> → 「大丈夫です」常是婉拒。</p><p><b>朋友問剛撞到桌角是否還好</b> → 同一句可表示「我沒事」。</p><p><b>只聽到一句，沒有前後文</b> → 不能只靠「はい」判斷。想說清楚需求，直接說「袋はいりません」。</p><button class="btn sm" data-a="courseOral" data-v="l12">做「同一句，看場合」聽辨</button></section>${courseSelfHtml()}`:''}
    ${l.id==='pay'?`<section class="card flat stack"><h3>只在用到時補一塊</h3><p><span lang="ja">Suicaで</span>：で 標記付款工具。<span lang="ja">観光で来ました</span> 則說來訪目的／緣由。</p><p><span lang="ja">ゆっくりお願いします</span>：小「っ」是停頓一拍；用慢速比較，再回一般語速。</p><div class="row wrap"><button class="btn sm" data-a="coursePattern" data-v="way">付款句型</button><button class="btn sm" data-a="courseChunk" data-v="yukkuri">求助說法與讀音</button></div></section>`:''}
    <button class="btn primary block" data-a="coursePractice" data-v="${l.id}">${courseLessonDone(l.id)?'再練這一課的任務':'開始有提示的任務'}</button>
    <p class="small muted">中途離開會保存對話。答錯後可以修正；第四課的新題會另外保留。</p>`;
}
function courseRender() {
  const el=$('#course');if(!el||!COURSE_VIEW.open)return;const scroll=el.querySelector('.ov-body')?.scrollTop||0;
  el.innerHTML=`<div class="ov-head"><button class="icon-btn" data-a="courseClose" aria-label="關閉學習路線">${IC.x}</button><b class="grow">便利商店四課</b>${COURSE_VIEW.page==='lesson'?'<button class="btn sm" data-a="courseMap">路線</button>':''}</div><div class="ov-body"><div class="in stack">${COURSE_VIEW.page==='lesson'?courseLessonHtml():courseMapHtml()}</div></div>`;
  el.querySelector('.ov-body').scrollTop=scroll;
}
function courseStartLesson(id) {
  const l=STORE_COURSE.lessons.find(l=>l.id===id&&l.vid);if(!l)return;
  if(S.run){toast('先接續或放棄目前對話，再開始新課');courseOpen();return;}
  COURSE_VIEW.self=(courseSt().self[id]?.checks||[]).slice();courseOpen(id);$('#course .ov-body').scrollTop=0;
}
function coursePractice(id) {
  if(S.run){toast('目前對話已保存，請先接續');return;}
  const l=STORE_COURSE.lessons.find(l=>l.id===id&&l.vid);if(!l)return;
  courseHide();const v=VAR[l.vid];startRun('conv',v.lv,v.id,{mode:'learn',lesson:id});
}
function courseAssess(stage) {
  if(S.run){toast('先接續或放棄目前對話');return;}
  const due=courseStageDue(stage),c=courseSt();if(due===null||due>Date.now()||c.assessments[stage]?.passedAt){toast('這個驗收還沒開放，請查看路線');return;}
  const fresh=(STORE_COURSE.forms[stage]||[]).filter(id=>!c.seen.includes(id));
  if(!fresh.length){toast('這階段的保留新題已用完。可回前三課複習；重做舊題不記成首次新題。');return;}
  const vid=pick(fresh);c.seen.push(vid);persist();courseHide();startRun('conv',3,vid,{mode:'assessment',lesson:'check',stage,firstExposure:true,dueAt:due});
}
function courseOnRunEnd(r,types,n) {
  const c=courseSt(),now=Date.now(),v=VAR[r.vid],skillNames={question:'辨識店員問題',needs:'表達自己的需要',payment:'選付款方式',action:'依指示操作'};
  const misses=new Set(r.actions.filter(a=>a.grade!=='ok').map(a=>a.skill));
  for(const id of r.path){const node=v.nodes[id];if(node.t==='hear'&&Object.values(r.ans[id]||{}).some(a=>a!==0))misses.add(node.skill||'question');}
  const mode=types.includes('listen')?'listen':types.includes('repair')?'repair':'text';
  const summary=mode==='listen'?'完整播放，首次答對並完成動作':mode==='repair'?'透過重聽或求助完成':'有文字、提示、未播完或需要修正';
  const ev={at:now,vid:r.vid,mode,summary,misses:[...misses].map(s=>skillNames[s]),passed:false};
  if(r.course.mode==='learn'){
    const old=c.lessons[r.course.lesson]||{};c.lessons[r.course.lesson]={...old,completedAt:now,attempts:(old.attempts||0)+1,last:ev};ev.passed=true;
  }else{
    ev.passed=r.course.firstExposure&&now>=r.course.dueAt&&mode!=='text'&&!misses.size&&n.res==='ok';
    const a=c.assessments[r.course.stage]||{attempts:0};a.attempts++;a.last=ev;
    if(ev.passed&&!a.passedAt){a.passedAt=now;a.passMode=mode;a.vid=r.vid;}
    c.assessments[r.course.stage]=a;
  }
  addXp(ev.passed?15:6);return ev;
}
function courseRunEndHtml(e) {
  const r=e.run,ev=e.course||{},learn=r.course.mode==='learn',l=STORE_COURSE.lessons.find(l=>l.id===r.course.lesson);
  return `<div class="ov-head"><button class="icon-btn" data-a="runClose" aria-label="回到學習路線">${IC.x}</button><b>這次的紀錄</b></div><div class="ov-body"><div class="in stack">
    <div class="course-intro"><span class="course-eyebrow">${learn?'課堂練習':'第四課・'+STORE_COURSE.stages.find(s=>s.id===r.course.stage).name}</span><h2>${learn?'這一課已練過':ev.passed?'這次任務通過':'走完了，先補強再試'}</h2><p>${esc(l?.goal||'')}</p></div>
    <section class="card stack"><b>${esc(ev.summary||'課堂練習完成')}</b><p>${esc(e.text)}</p><p class="small muted">${learn?'有提示的完成會記「已練」。第四課才驗證首次新任務與延後保留。':ev.passed?'每段聲音完整播放，問題與動作的首次選擇都符合任務。'+(ev.mode==='repair'?'這次透過求助完成，與自行聽懂分開記。':''): '這次不產生能力通過紀錄。看字、音訊未播完或修正後完成，都能回課堂補強。'}</p></section>
    ${ev.misses?.length?`<section class="card flat stack"><h3>下一次先補這些</h3>${ev.misses.map(s=>`<p>・${esc(s)}</p>`).join('')}<button class="btn sm" data-a="courseResultLesson" data-v="${ev.misses.includes('依指示操作')||ev.misses.includes('選付款方式')?'pay':ev.misses.includes('表達自己的需要')?'needs':'notice'}">回對應小課</button></section>`:''}
    ${!learn&&ev.passed?`<p class="small">${r.course.stage==='new'?'隔 24 小時再驗收，時間已安排。':r.course.stage==='day'?'隔 7 天再驗收，時間已安排。':'三次驗收都有紀錄。口說仍看你的獨立自評。'}</p>`:''}
    ${courseProgressHtml()}</div></div><div class="ov-foot"><div class="in"><button class="btn primary block" data-a="runClose">回四課路線，看看下一步</button></div></div>`;
}
function courseRecordDiscard() {
  COURSE_REC.gen++;const rec=COURSE_REC.recorder;COURSE_REC.recorder=null;COURSE_REC.busy=false;
  if(rec&&rec.state!=='inactive')try{rec.stop();}catch(e){}COURSE_REC.stream?.getTracks().forEach(t=>t.stop());COURSE_REC.stream=null;
  if(COURSE_REC.url)URL.revokeObjectURL(COURSE_REC.url);COURSE_REC.url='';COURSE_REC.error='';
}
async function courseRecord() {
  if(COURSE_REC.recorder){COURSE_REC.recorder.stop();return;}
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){COURSE_REC.error='這個瀏覽器不能在頁面錄音。可用手機錄音程式回聽，再填自評。';courseRender();return;}
  courseRecordDiscard();const gen=COURSE_REC.gen;COURSE_REC.busy=true;courseRender();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(gen!==COURSE_REC.gen||!COURSE_VIEW.open){stream.getTracks().forEach(t=>t.stop());return;}
    COURSE_REC.stream=stream;const rec=new MediaRecorder(stream);COURSE_REC.recorder=rec;COURSE_REC.chunks=[];
    rec.ondataavailable=e=>{if(gen===COURSE_REC.gen&&e.data.size)COURSE_REC.chunks.push(e.data);};
    rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());if(gen!==COURSE_REC.gen)return;COURSE_REC.stream=null;COURSE_REC.recorder=null;
      if(COURSE_REC.chunks.length)COURSE_REC.url=URL.createObjectURL(new Blob(COURSE_REC.chunks,{type:rec.mimeType}));courseRender();};
    rec.onerror=()=>{courseRecordDiscard();COURSE_REC.error='錄音中斷，請再試一次。';courseRender();};
    rec.start();COURSE_REC.busy=false;courseRender();
  }catch(e){courseRecordDiscard();COURSE_REC.error='麥克風未能開啟。允許麥克風後再試，也可直接做自評。';courseRender();}
}
function courseAction(a,v,t) {
  switch(a){
    case 'courseOpen':courseOpen();return true;
    case 'courseClose':courseClose();return true;
    case 'courseLesson':courseStartLesson(v);return true;
    case 'courseMap':taskAudioStop();courseRecordDiscard();COURSE_VIEW.page='map';courseRender();$('#course .ov-body').scrollTop=0;return true;
    case 'courseCheckMap':COURSE_VIEW.page='map';courseRender();$('#courseChecks')?.scrollIntoView({block:'start'});return true;
    case 'coursePractice':coursePractice(v);return true;
    case 'courseAssess':courseAssess(v);return true;
    case 'courseResume':courseHide();resumeRun();return true;
    case 'courseDrop':S.run=null;persist();courseRender();render();toast('已放棄這一段對話');return true;
    case 'courseResultLesson':closeRunView(true);courseStartLesson(v);return true;
    case 'courseClip':{const [id,sp]=v.split(':');if(!CK[id])return true;taskAudioStop();COURSE_VIEW.status='正在播放……';courseRender();
      taskAudioPlay([id],sp==='slow',1/S.settings.rate,ok=>{if(!COURSE_VIEW.open)return;COURSE_VIEW.heard[id]=ok;COURSE_VIEW.status=ok?'播放完成，可以比較另一種語速。':'未能播完，請再試或先看字練習。';courseRender();});return true;}
    case 'courseRecord':courseRecord();return true;
    case 'courseSelfToggle':COURSE_VIEW.self[+v]=!COURSE_VIEW.self[+v];courseRender();return true;
    case 'courseSelfSave':courseSt().self.needs={at:Date.now(),checks:STORE_COURSE.selfChecks.map((_,i)=>!!COURSE_VIEW.self[i])};persist();courseRender();toast('自評已另存；不會產生自動口說成績');return true;
    case 'courseKana':courseHide();knOpen();return true;
    case 'courseGame':courseHide();gmOpen('konbini');return true;
    case 'coursePattern':courseHide();showSheet(()=>patSheet(v));return true;
    case 'courseChunk':courseHide();showSheet(()=>ckSheet(v));return true;
    case 'courseOral':courseHide();UI.tab='oral';try{sessionStorage.setItem('bnk-tab','oral');}catch(e){}render();window.OralModule.openLesson(v);window.scrollTo(0,0);return true;
  }return false;
}
document.addEventListener('keydown',e=>{if(!COURSE_VIEW.open)return;const el=$('#course');
  if(e.key==='Escape'){e.preventDefault();courseClose();}
  if(e.key==='Tab'){const nodes=[...el.querySelectorAll('button:not([disabled]),audio[controls]')].filter(n=>n.getClientRects().length);const first=nodes[0],last=nodes[nodes.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&COURSE_VIEW.open){courseRecordDiscard();COURSE_VIEW.status='已暫停；回來後請重新播放。';courseRender();}});
window.addEventListener('pagehide',courseRecordDiscard);
