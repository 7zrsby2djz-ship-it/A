(() => {
  'use strict';
  const C = JP_COURSE, KEY = 'kiku-independent-v1', DAY = 86400000;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plain = s => s.replace(/\{([^|{}]+)\|([^{}]+)\}/g,'$1');
  const kana = s => s.replace(/\{([^|{}]+)\|([^{}]+)\}/g,'$2');
  const ruby = s => esc(s).replace(/\{([^|{}]+)\|([^{}]+)\}/g,'<ruby>$1<rt>$2</rt></ruby>');
  const findLesson = id => C.lessons.find(l=>l.id===id);
  const defaultState = () => ({version:1,done:{},stars:[],session:null,settings:{reading:'both',rate:0.85,voice:''}});
  const finite = n => Number.isFinite(n) && n >= 0;
  let storageError = '', audioError = '', audioBusy = false, speechGen = 0, settleSpeech = null, speechTimer = null;
  let dictionaryFilter = 'course', query = '', toastTimer, sessionAudioReady = false;
  const allWords = () => [...Object.values(C.phrases).map(p=>({...p,word:plain(p.jp),kana:kana(p.jp),category:'課程',type:'phrase'})), ...C.glossary.map(g=>({...g,type:'glossary'}))];
  const WORDS = allWords(), WORDMAP = Object.fromEntries(WORDS.map(w=>[w.id,w]));
  function cleanState(raw) {
    if (!raw || raw.version!==1 || typeof raw.done!=='object' || !raw.done) throw Error('不是這套練習的進度檔');
    const out=defaultState(), settings=raw.settings||{};
    if (['both','kana','ro','none'].includes(settings.reading)) out.settings.reading=settings.reading;
    if ([0.7,0.85,1].includes(settings.rate)) out.settings.rate=settings.rate;
    if (typeof settings.voice==='string') out.settings.voice=settings.voice.slice(0,250);
    for (const l of C.lessons) {
      const d=raw.done[l.id]; if(!d||typeof d!=='object')continue;
      out.done[l.id]={};
      for (const k of ['text','support','listen','attempts','last','due','streak']) out.done[l.id][k]=finite(d[k])?d[k]:0;
    }
    out.stars=Array.isArray(raw.stars)?[...new Set(raw.stars.filter(id=>typeof id==='string'&&WORDMAP[id]))]:[];
    const s=raw.session;
    if(s&&findLesson(s.id)&&Number.isInteger(s.stage)&&s.stage>=0&&s.stage<=5&&Array.isArray(s.q)&&s.q.length===3) {
      const valid=s.q.every(q=>q&&Array.isArray(q.order)&&q.order.length===3&&[...q.order].sort().join(',')==='0,1,2'&&(q.pick===null||[0,1,2].includes(q.pick)));
      if(valid) out.session={id:s.id,stage:s.stage,recorded:!!s.recorded,result:['text','support','listen'].includes(s.result)?s.result:null,
        q:s.q.map(q=>({order:q.order,pick:q.pick,assisted:!!q.assisted,slow:!!q.slow,plays:finite(q.plays)?q.plays:0,heard:!!q.heard}))};
    }
    return out;
  }
  let S;
  try { const saved=localStorage.getItem(KEY); S=saved?cleanState(JSON.parse(saved)):defaultState(); }
  catch(e) { S=defaultState(); storageError='無法讀取儲存的進度。你仍可練習；先前資料未被自動刪除。'; }
  function save() { try {localStorage.setItem(KEY,JSON.stringify(S));storageError='';}catch(e){storageError='這個瀏覽器目前無法保存進度。離開前請到「我的」匯出備份。';} }
  function notify(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',3400);}
  function shuffled(){const a=[0,1,2];for(let i=2;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function newSession(id){return {id,stage:0,recorded:false,result:null,q:Array.from({length:3},()=>({order:shuffled(),pick:null,assisted:false,slow:false,plays:0,heard:false}))};}
  function status(id){const d=S.done[id];return !d?'還沒開始':d.listen?'曾純聽完成':d.support?'曾慢聽／重聽完成':'已看字學過';}
  function dueLessons(){return C.lessons.filter(l=>S.done[l.id]&&S.done[l.id].due<=Date.now());}
  function recommended(){return dueLessons()[0]||C.lessons.find(l=>!S.done[l.id])||C.lessons[0];}
  function go(hash){stopAudio();if(location.hash===hash)render();else location.hash=hash;}
  function start(id){if(!findLesson(id))return;S.session=newSession(id);save();sessionAudioReady=false;go('#learn');}
  const btn=(action,label,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`;
  function jpLine(p,small=false){const r=S.settings.reading;return `<div class="jp ${r==='ro'||r==='none'?'hide-reading':''}${small?' answer-line':''}" lang="ja">${ruby(p.jp)}</div>${r==='both'||r==='ro'?`<div class="romaji">${esc(p.ro)}</div>`:''}`;}
  const listeningSymbol = '<div class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
  function audioControls(context){return `<div class="audio-buttons">${btn('audio','▶ '+(context==='dialogue'?'聽兩句對話':'聽這一句'),`class="primary" data-context="${context}"`)}${btn('audio','慢一點',`data-context="${context}" data-slow="true"`)}${btn('stop','停止')}</div><p class="audio-status ${audioError?'error':''}" role="status" aria-live="polite">${esc(audioError||'按播放才會出聲；可以重聽，不用搶答。')}</p>`;}
  function home(){
    const unfinished=S.session&&S.session.stage<5, l=unfinished?findLesson(S.session.id):recommended();
    const due=dueLessons().length, seen=Object.keys(S.done).length, heard=Object.values(S.done).filter(d=>d.listen>0).length;
    return `<section class="hero"><div class="intro"><p class="eyebrow">START WITH ONE LINE</p><h1 class="hero-title"><span>先聽懂一句。</span><span>慢慢，就接起來了。</span></h1><p>不知道從哪裡開始也沒關係。一次兩句，先看懂，再聽聲音，最後聽一小段對話。</p><div class="stat-row"><span class="stat"><strong>${seen}</strong>課看過</span><span class="stat"><strong>${heard}</strong>課曾純聽完成</span><span class="stat"><strong>${due}</strong>課可複習</span></div></div><div class="card next-card"><div><span class="badge">${unfinished?'接著上次繼續':due?'今天，先把熟悉的找回來':'今天只學兩句'} · 約 2–4 分鐘</span><h2>${esc(l.title)}</h2><p class="muted">${esc(l.setup)}</p></div>${btn(unfinished?'resume':'start',unfinished?'繼續練習 →':due?'複習這兩句 →':'從這裡開始 →',`data-id="${l.id}"`)}</div></section>
      <div class="section-line"><h2>你的聽力路線</h2><a href="#course" class="small">查看全部 24 課 ↗</a></div><div class="route-grid">${C.units.map((u,i)=>{const ls=C.lessons.filter(l=>l.unit===u.id),n=ls.filter(l=>S.done[l.id]).length;return `<a class="card route-card" href="#course/${u.id}"><span class="route-num">${String(i+1).padStart(2,'0')} / ${n}・3</span><h3>${esc(u.name)}</h3><p>${esc(u.goal)}</p><div class="progress-track"><div class="progress-fill" style="width:${n/3*100}%"></div></div></a>`;}).join('')}</div>
      <div class="note-box">沒有倒數，也不必一次聽懂。看提示、慢一點、先休息，都是學習的一部分。第一次從第 1 課開始就好。</div>`;
  }
  function course(){return `<p class="eyebrow">24 SMALL LESSONS</p><h1>把聽不懂，拆小一點。</h1><p class="muted">每課兩個新句子。先看懂 → 單句聽辨 → 兩句串聽。所有課都能直接選。</p>${C.units.map((u,i)=>`<section class="unit" id="${u.id}"><div class="unit-head"><span class="unit-number">${String(i+1).padStart(2,'0')}</span><div><h2>${esc(u.name)}</h2><span class="small muted">${esc(u.goal)}</span></div></div><div class="lesson-grid">${C.lessons.filter(l=>l.unit===u.id).map(l=>`<button class="lesson-card" data-action="start" data-id="${l.id}"><span class="badge">兩句・約 3 分鐘</span><h3>${esc(l.title)}</h3><span class="small">${esc(l.setup)}</span><span class="status">${status(l.id)} →</span></button>`).join('')}</div></section>`).join('')}`;}
  function currentQ(){return S.session&&S.session.stage>=2&&S.session.stage<5?S.session.q[S.session.stage-2]:null;}
  function quizPhrase(l,stage){return C.phrases[l.phraseIds[stage===4?l.focus:stage-2]];}
  function transcript(l){return l.dialogue.map(line=>{const p=C.phrases[line.id];return `<div class="dialogue-line"><span class="speaker">${line.who}</span>${jpLine(p)}<p>${esc(p.zh)}</p></div>`;}).join('');}
  function learn(){
    const s=S.session;if(!s)return `<div class="empty">先選一堂課就能開始。<p><a href="#course">查看課程</a></p></div>`;
    const l=findLesson(s.id),stage=s.stage;
    if(stage===5)return result(l);
    const labels=['先認識第一句','再認識第二句','只聽第一句','再聽第二句','把兩句接起來'];
    let body;
    if(stage<2){const p=C.phrases[l.phraseIds[stage]];body=`<span class="badge">${labels[stage]} · ${esc(p.register)}</span>${jpLine(p)}<p class="meaning">${esc(p.zh)}</p>${audioControls('teach')}<div class="note-box">${esc(p.note)}</div><details><summary>看看這句怎麼組成</summary><div class="chunks">${p.parts.map(x=>`<div class="chunk">${esc(x)}</div>`).join('')}</div></details><div class="bottom-actions">${btn('next',stage===0?'知道意思了，下一句 →':'來聽聽看 →','class="primary"')}</div>`;}
    else {
      const p=quizPhrase(l,stage),q=currentQ(),dialogue=stage===4,canAnswer=sessionAudioReady||q.assisted||q.pick!==null;
      body=`<span class="badge">${labels[stage]}</span><h2 style="margin-top:17px">${dialogue?`聽完後，${l.dialogue[l.focus].who} 說的是什麼意思？`:'這句話，是什麼意思？'}</h2>${dialogue?`<p class="small muted">${esc(l.setup)}</p>`:''}${listeningSymbol}${audioControls(dialogue?'dialogue':'quiz')}
        ${q.assisted||q.pick!==null?`<div class="revealed">${dialogue?transcript(l):jpLine(p)}</div>`:`<div class="listen-prompt">這一回先把文字收起來。</div>`}
        ${q.pick===null?`<div class="small">${btn('reveal','給我文字提示','class="text"')} ${btn('no-audio','沒有聽到聲音','class="text"')}</div>`:''}
        <div class="choices">${q.order.map((v,i)=>`<button class="choice ${q.pick!==null?(v===0?'correct':v===q.pick?'incorrect':''):''}" data-action="answer" data-value="${v}" ${q.pick!==null||!canAnswer?'disabled':''}><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(p.choices[v])}</span></button>`).join('')}</div>
        ${q.pick===null&&!canAnswer?'<p class="small muted">先播放一次，或用文字提示開始。若裝置無法播放，可以直接看字練習。</p>':''}
        ${q.pick!==null?`<div class="feedback ${q.pick!==0?'wrong':''}" role="status"><strong>${q.pick===0?'這一句，你認出來了。':'先記住這一小塊就好。'}</strong><p>${esc(p.zh)}</p><p>${esc(p.note)}</p>${q.pick!==0?'<p>已記下這課需要再練，不必急著背熟。</p>':''}</div><div class="bottom-actions">${btn('next',stage===4?'完成這次練習 →':'繼續 →','class="primary"')}</div>`:''}`;
    }
    return `<section class="practice"><div class="practice-top">${btn('home','← 先休息','class="text"')}<p>${esc(l.title)} · ${stage+1} / 5</p></div><div class="steps" aria-label="第 ${stage+1} 步，共 5 步">${labels.map((_,i)=>`<span class="${i<stage?'done':i===stage?'now':''}"></span>`).join('')}</div><div class="card study-card">${body}</div><p class="small muted" style="margin-top:17px">${stage<2?'先知道意思，再去聽。不要急著把整句背下來。':'這是剛學過的句子；能聽懂它，還不代表能聽懂所有換句話說的版本。'}</p></section>`;
  }
  function complete(){
    const s=S.session;if(s.recorded)return;
    const correct=s.q.every(q=>q.pick===0),text=s.q.some(q=>q.assisted||!q.heard);
    s.result=text||!correct?'text':s.q.some(q=>q.slow||q.plays>1)?'support':'listen';
    const d=S.done[s.id]||{text:0,support:0,listen:0,attempts:0,last:0,due:0,streak:0};
    d[s.result]++;d.attempts++;d.last=Date.now();d.streak=s.result==='listen'?Math.min(d.streak+1,5):0;
    d.due=Date.now()+(s.result==='listen'?[1,1,3,7,14,30][d.streak]:correct?1:0.25)*DAY;
    S.done[s.id]=d;s.recorded=true;save();
  }
  function result(l){const s=S.session,next=C.lessons[C.lessons.indexOf(l)+1],mode=s.result==='listen'?'這次，靠聲音認出來了。':s.result==='support'?'慢慢聽，也有聽懂。':'這次，先把意思學起來。';
    return `<section class="practice"><div class="card study-card"><div class="result-icon" aria-hidden="true">✓</div><p class="eyebrow">TWO LINES, ONE SMALL STEP</p><h1>${mode}</h1><p class="muted">${s.result==='listen'?'這 3 題都在播放完成後，沒有看文字、沒有重聽而答對。之後還會安排複習。':s.result==='support'?'這 3 題沒有看文字，透過慢速或重聽完成。這也是有效的練習。':'看提示或答錯之後認識這些句子，也算有收穫。這次不記成純聽完成。'}</p><ul class="result-list">${l.phraseIds.map(id=>{const p=C.phrases[id];return `<li>${jpLine(p)}<span>${esc(p.zh)}</span></li>`;}).join('')}</ul><div class="bottom-actions">${btn('home','今天先到這裡','class="primary"')}${btn('start','再聽一次',`data-id="${l.id}"`)}</div>${next?`<div style="margin-top:12px">${btn('start','還有精神？下一課：'+esc(next.title),`class="text" data-id="${next.id}"`)}</div>`:''}<p class="small muted" style="margin-top:18px">進度只存在這個瀏覽器；可到「我的」匯出備份。</p></div></section>`;
  }
  function filteredWords(){const term=query.trim().toLocaleLowerCase();return WORDS.filter(w=>{
    const category=dictionaryFilter==='course'?w.type==='phrase':dictionaryFilter==='adult'?w.category==='成人':dictionaryFilter==='star'?S.stars.includes(w.id):w.type==='glossary'&&w.category!=='成人';
    return category&&(!term||[w.word,w.kana,w.ro,w.zh,w.note].join(' ').toLocaleLowerCase().includes(term));});}
  function wordResults(){const rows=filteredWords();return `<p class="small muted">${rows.length} 個${dictionaryFilter==='course'?'句子':'詞條'}${dictionaryFilter==='star'?'・你收藏的內容':''}</p><div class="word-grid">${rows.map(w=>`<article class="card word-card"><div class="word-head"><span class="badge ${w.category==='成人'?'warn':''}">${esc(w.type==='phrase'?w.register:w.category)}</span><span class="small muted">${w.type==='phrase'?'課程句子':'詞義辨識'}</span></div>${w.type==='phrase'?jpLine(w):`<div class="jp" lang="ja"><ruby>${esc(w.word)}<rt>${esc(w.kana)}</rt></ruby></div><div class="romaji">${esc(w.ro)}</div>`}<h3>${esc(w.zh)}</h3><p>${esc(w.note)}</p><div class="word-actions">${btn('word-audio','▶ 聽讀音',`data-id="${w.id}"`)}${btn('star',S.stars.includes(w.id)?'★ 已收藏':'☆ 收藏',`data-id="${w.id}" aria-pressed="${S.stars.includes(w.id)}"`)}</div></article>`).join('')}</div>${!rows.length?'<div class="empty">這個分類還沒有符合的內容。換個字，或切換上面的分類試試。</div>':''}`;}
  function words(){return `<p class="eyebrow">WORDS IN CONTEXT</p><h1>聽到了，就來查。</h1><p class="muted">用日文、羅馬拼音或中文搜尋。每個詞都有語氣和場合說明。</p><div class="word-controls"><label class="visually-hidden" for="word-search">搜尋目前分類的詞句</label><input class="search" id="word-search" type="search" placeholder="搜尋目前分類，例如：chotto、一點" value="${esc(query)}" autocomplete="off"></div><div class="filters" aria-label="詞彙分類">${[['course','課程句子'],['general','口語與粗俗'],['adult','成人詞義'],['star','我的收藏']].map(([id,label])=>btn('filter',label,`data-value="${id}" class="${dictionaryFilter===id?'selected':''}" aria-pressed="${dictionaryFilter===id}"`)).join('')}</div>${dictionaryFilter==='adult'?'<div class="note-box adult-info">這裡是成人語境的中性詞義說明，用來辨認聽到的字。同音詞與多義詞需要前後文；詞義不等於對方的意願。</div>':''}<div id="word-results">${wordResults()}</div>`;}
  function getVoices(){try{return window.speechSynthesis?window.speechSynthesis.getVoices().filter(v=>/^ja([_-]|$)/i.test(v.lang)):[];}catch(e){return [];}}
  function settings(){const voices=getVoices();return `<p class="eyebrow">MAKE IT YOUR PACE</p><h1>照你的步調聽。</h1><div class="settings-grid"><section class="card"><h2>聲音與讀音</h2><div class="field"><label for="reading">文字顯示</label><select id="reading" data-setting="reading">${[['both','振假名＋羅馬拼音'],['kana','只有振假名'],['ro','只有羅馬拼音'],['none','只顯示日文原句']].map(([v,l])=>`<option value="${v}" ${S.settings.reading===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label for="rate">一般播放速度</label><select id="rate" data-setting="rate">${[[.7,'慢慢來 · 0.70'],[.85,'清楚一點 · 0.85'],[1,'一般速度 · 1.00']].map(([v,l])=>`<option value="${v}" ${S.settings.rate===v?'selected':''}>${l}</option>`).join('')}</select><p>課堂裡仍能隨時按「慢一點」。語音的實際速度依裝置不同。</p></div><div class="field"><label for="voice">日文聲音</label><select id="voice" data-setting="voice"><option value="">裝置預設日文聲音</option>${voices.map(v=>`<option value="${esc(v.voiceURI)}" ${S.settings.voice===v.voiceURI?'selected':''}>${esc(v.name)}</option>`).join('')}</select><p>若暫時没有列出聲音，先按下面的試聽。聲線由你的手機或瀏覽器提供。</p></div><div class="backup-actions">${btn('test-audio','▶ 試聽日文')}${btn('stop','停止')}</div><p class="audio-status" role="status">${esc(audioError)}</p></section><section class="card"><h2>你的學習紀錄</h2><p class="small muted">只記錄這套口語課程，與原本的英文、交通教材分開。換裝置或清除瀏覽器資料前，可以先備份。</p><div class="stat-row"><span class="stat"><strong>${Object.keys(S.done).length}</strong>課看過</span><span class="stat"><strong>${S.stars.length}</strong>個收藏</span></div><div class="backup-actions">${btn('export','匯出進度')}${btn('import','匯入進度')}</div><input type="file" id="import-file" accept="application/json,.json" hidden><p class="small muted">匯入只會取代這套課程的進度，會先讓你確認。</p><details><summary>這套練習怎麼安排？</summary><p>先看兩句的意思，再做兩題單句聽辨，最後聽兩句連在一起。每一輪都可以先休息，下次接續。</p><p>看字、慢聽／重聽、純聽會分開記。純聽完成需要實際播完聲音，且三題都第一次答對；朗讀或收藏不會算成聽力通過。</p><p>答錯的課約 6 小時後可複習；看字或慢聽完成，隔天複習。連續純聽完成後，間隔逐漸延長。</p></details><details><summary>聲音的使用範圍</summary><p>使用裝置合成語音，練習辨認詞句。它不能重現真人的口音、含糊發音、情緒與背景噪音，也不代表已聽懂影片。</p><p>請讓畫面亮著並留在這個頁面。鎖屏或切到別的 App 會停止；回來後按播放繼續。若沒有聲音，可以使用文字練習。</p></details></section></div>`;}
  function render(){
    const route=(location.hash.slice(1)||'home').split('/')[0];
    const active=['home','course','words','settings'].includes(route)?route:route==='learn'?'course':'home';
    document.querySelectorAll('.nav a').forEach(a=>{const yes=a.hash==='#'+active;a.classList.toggle('active',yes);if(yes)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    const views={home,course,words,settings,learn};$('#app').innerHTML=(storageError?`<div class="storage-alert" role="status">${esc(storageError)}</div>`:'')+(views[route]||home)();
    if(route==='course'&&/^#course\/u[1-8]$/.test(location.hash)) document.getElementById(location.hash.split('/')[1])?.scrollIntoView();
  }
  function audioStatus(text,error=false){audioError=error?text:'';document.querySelectorAll('.audio-status').forEach(el=>{el.textContent=text;el.classList.toggle('error',error);});document.querySelectorAll('.wave').forEach(el=>el.classList.toggle('playing',audioBusy));}
  function stopAudio(){speechGen++;audioBusy=false;clearTimeout(speechTimer);speechTimer=null;if(settleSpeech){settleSpeech(false);settleSpeech=null;}try{window.speechSynthesis?.cancel();}catch(e){}document.querySelectorAll('.wave').forEach(el=>el.classList.remove('playing'));}
  function utter(text,rate,gen){return new Promise(resolve=>{
    if(gen!==speechGen||!window.speechSynthesis||!window.SpeechSynthesisUtterance){resolve(false);return;}
    let finished=false;
    const done=ok=>{if(finished)return;finished=true;clearTimeout(speechTimer);settleSpeech=null;resolve(ok);};
    settleSpeech=done;
    const u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';u.rate=rate;
    const voices=getVoices(),voice=voices.find(v=>v.voiceURI===S.settings.voice)||voices[0];if(voice)u.voice=voice;
    u.onend=()=>done(gen===speechGen);u.onerror=()=>done(false);
    speechTimer=setTimeout(()=>{done(false);if(gen===speechGen){try{window.speechSynthesis.cancel();}catch(e){}}},Math.max(14000,text.length*650/rate));
    try{window.speechSynthesis.resume();window.speechSynthesis.speak(u);}catch(e){done(false);}
  });}
  async function play(lines,slow=false,onDone=null){
    stopAudio();const gen=speechGen;audioBusy=true;audioStatus('播放中……');
    let ok=true;
    for(let i=0;i<lines.length;i++) {
      ok=await utter(lines[i],slow?0.6:S.settings.rate,gen);if(!ok||gen!==speechGen)break;
      if(i<lines.length-1)await new Promise(resolve=>setTimeout(resolve,550));
      if(gen!==speechGen){ok=false;break;}
    }
    if(gen!==speechGen)return;
    audioBusy=false;audioStatus(ok?'播放完成。沒聽清楚可以再聽。':'沒有成功播放日文。可以再試，或按「沒有聽到聲音」看字練習。',!ok);
    if(onDone)onDone(ok);
  }
  async function practiceAudio(context,slow){const s=S.session;if(!s)return;const stage=s.stage,l=findLesson(s.id),q=currentQ();
    const lines=context==='dialogue'?l.dialogue.map(x=>kana(C.phrases[x.id].jp)):[kana(C.phrases[l.phraseIds[stage<2?stage:stage-2]].jp)];
    if(q&&q.pick===null){q.plays++;if(slow)q.slow=true;save();}
    await play(lines,slow,ok=>{if(S.session!==s||s.stage!==stage)return;if(q&&q.pick===null){if(ok){q.heard=true;sessionAudioReady=true;}else{q.assisted=true;sessionAudioReady=false;}save();const pos=window.scrollY;render();window.scrollTo(0,pos);audioStatus(ok?'播放完成。選一個你聽到的意思。':audioError,!ok);}});
  }
  function advance(){const s=S.session;if(!s||s.stage>=5)return;if(s.stage>=2&&currentQ().pick===null)return;stopAudio();s.stage++;sessionAudioReady=false;if(s.stage===5)complete();save();render();window.scrollTo(0,0);}
  function exportProgress(){const blob=new Blob([JSON.stringify({app:'聽懂一句',...S},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kiku-progress-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('已匯出這套課程的進度。');}
  document.addEventListener('click',e=>{
    const b=e.target.closest('button[data-action]');if(!b||b.disabled)return;const a=b.dataset.action,id=b.dataset.id;
    if(a==='start')start(id);
    else if(a==='resume'){sessionAudioReady=false;go('#learn');}
    else if(a==='home')go('#home');
    else if(a==='next')advance();
    else if(a==='audio')practiceAudio(b.dataset.context,b.dataset.slow==='true');
    else if(a==='stop'){stopAudio();audioStatus('已停止。需要時可以重新播放。');}
    else if(a==='reveal'||a==='no-audio'){const q=currentQ();if(q&&q.pick===null){stopAudio();q.assisted=true;save();render();if(a==='no-audio')audioStatus('這題改用文字練習，進度會記為看字學過。');}}
    else if(a==='answer'){const q=currentQ();if(!q||q.pick!==null||(!sessionAudioReady&&!q.assisted))return;stopAudio();q.pick=+b.dataset.value;save();render();}
    else if(a==='filter'){stopAudio();dictionaryFilter=b.dataset.value;query='';render();}
    else if(a==='star'){if(!WORDMAP[id])return;S.stars=S.stars.includes(id)?S.stars.filter(x=>x!==id):[...S.stars,id];save();$('#word-results').innerHTML=wordResults();}
    else if(a==='word-audio'){const w=WORDMAP[id];if(w)play([w.type==='phrase'?kana(w.jp):w.kana],false,ok=>{if(!ok)notify('沒有成功播放。請到「我的」檢查日文聲音。');});}
    else if(a==='test-audio')play(['こんにちは。ゆっくり、はなします。']);
    else if(a==='export')exportProgress();
    else if(a==='import')$('#import-file').click();
  });
  document.addEventListener('input',e=>{if(e.target.id==='word-search'){query=e.target.value;$('#word-results').innerHTML=wordResults();}});
  document.addEventListener('change',async e=>{
    const key=e.target.dataset.setting;if(key){S.settings[key]=key==='rate'?Number(e.target.value):e.target.value;save();return;}
    if(e.target.id!=='import-file')return;
    const f=e.target.files[0];e.target.value='';if(!f)return;
    if(f.size>1024*1024){notify('檔案太大，請選這套練習匯出的 JSON 進度檔。');return;}
    try{const candidate=cleanState(JSON.parse(await f.text()));if(!confirm(`這份備份有 ${Object.keys(candidate.done).length} 課紀錄。要取代目前「聽懂一句」的進度嗎？原本交通、英文教材不受影響。`))return;stopAudio();S=candidate;save();sessionAudioReady=false;render();notify('進度已匯入。');}
    catch(err){notify('無法讀取：'+err.message);}
  });
  window.addEventListener('hashchange',()=>{stopAudio();audioError='';sessionAudioReady=false;render();if(!/^#course\/u/.test(location.hash))window.scrollTo(0,0);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAudio();audioStatus('已暫停。回來後請按播放。');}});
  window.addEventListener('pagehide',()=>{stopAudio();save();});
  window.speechSynthesis?.addEventListener('voiceschanged',()=>{if(location.hash==='#settings'&&!audioBusy)render();});
  render();
})();
