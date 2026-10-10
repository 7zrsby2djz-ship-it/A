// 外觀（QA #8）與振假名（QA #7）回歸：
// 3 種外觀（跟隨系統／淺色／深色）× 系統淺色／深色：html[data-theme]、背景色、theme-color、口語分頁也跟著變、axe 對比 0；
// 「我的」切換後重新整理仍保留；載入時沒有顏色過場；兩個深色區塊一致；振假名最少 11px、三顆求助按鈕各一行、<430px 單欄。
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[];
let axeSrc;try{axeSrc=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');}catch(e){axeSrc=null;}
const BG={light:'rgb(238, 241, 246)',dark:'rgb(16, 20, 28)'},ORAL={light:'rgb(245, 244, 238)',dark:'rgb(17, 29, 25)'},TC={light:'#EEF1F6',dark:'#10141C'};
function spy(){Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{lang:'ja-JP',name:'test',voiceURI:'test'}],addEventListener(){},resume(){},cancel(){},speaking:false,speak(u){setTimeout(()=>u.onend&&u.onend(),10);}}});}
(async()=>{
  // 靜態：head.html 兩個深色區塊（系統深色／手動深色）內容必須一致
  const head=fs.readFileSync(path.join(repo,'src/head.html'),'utf8');
  const a=head.match(/:root:not\(\[data-theme="light"\]\)\{([^}]*)\}\}/),b=head.match(/:root\[data-theme="dark"\]\{([^}]*)\}/);
  assert(a&&b,'找到兩個深色區塊');const norm=s=>s.replace(/\s+/g,'');assert.equal(norm(a[1]),norm(b[1]),'兩個深色區塊不一致');
  assert(!/<script/i.test(head),'head.html 不可以有 script（不增第 3 段）');
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync(path.join(repo,'index.html')));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url='http://127.0.0.1:'+server.address().port+'/';
  const browser=await chromium.launch({headless:true});
  let combos=0;
  for(const scheme of ['light','dark'])for(const mode of ['auto','light','dark']){
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:scheme});
    await ctx.route('https://**',r=>r.abort());await ctx.addInitScript(spy);
    await ctx.addInitScript(m=>{if(!sessionStorage.getItem('t-init')){sessionStorage.setItem('t-init','1');if(m==='auto')localStorage.removeItem('bnk-theme');else localStorage.setItem('bnk-theme',m);}},mode);
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
    const eff=mode==='auto'?scheme:mode,tag=`系統${scheme}／外觀${mode}`;
    const st=await page.evaluate(()=>({dt:document.documentElement.getAttribute('data-theme'),bg:getComputedStyle(document.body).backgroundColor,
      tc:[...document.querySelectorAll('meta[name=theme-color]')].map(m=>m.content),cs:getComputedStyle(document.documentElement).colorScheme,
      tr:getComputedStyle(document.body).transitionDuration}));
    assert.equal(st.dt,mode==='auto'?null:mode,tag+' data-theme');
    assert.equal(st.bg,BG[eff],tag+' 背景色');assert.equal(st.cs,eff,tag+' color-scheme');
    assert.equal(st.tc.length,2,tag+' theme-color 仍是 2 個');
    if(mode!=='auto')assert.deepEqual(st.tc,[TC[mode],TC[mode]],tag+' theme-color 跟手動外觀');else assert.deepEqual(st.tc,['#EEF1F6','#10141C'],tag+' theme-color 原值');
    assert.equal(st.tr,'0s',tag+' 載入時不可有顏色過場');
    await page.waitForFunction(()=>document.documentElement.classList.contains('theme-ready'));
    for(const t of ['home','jp','oral','me']){
      await page.locator(`#tabs [data-v=${t}]`).click();await page.waitForTimeout(120);
      if(t==='oral'){const ob=await page.evaluate(()=>getComputedStyle(document.querySelector('#oral-module')).backgroundColor);assert.equal(ob,ORAL[eff],tag+' 口語分頁背景');}
      if(axeSrc){await page.addScriptTag({content:axeSrc});
        const v=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:['color-contrast']});return r.violations.flatMap(v=>v.nodes.map(n=>n.html.slice(0,70)));});
        assert.deepEqual(v,[],`${tag} ${t} 對比不足`);}
    }
    // 「我的」外觀列：目前選項 aria-pressed、390 寬時單欄（選項在說明下方、滿寬）
    await page.locator('#tabs [data-v=me]').click();
    const row=await page.evaluate(()=>{const r=document.querySelector('.theme-row');const g=r.querySelector('.grow').getBoundingClientRect(),s=r.querySelector('.seg').getBoundingClientRect(),rr=r.getBoundingClientRect();
      return {pressed:[...r.querySelectorAll('[data-a=theme]')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.v),below:s.top>=g.bottom-1,full:s.width>=rr.width-40,minH:Math.min(...[...r.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height))};});
    assert.deepEqual(row.pressed,[mode],tag+' 外觀選項');assert(row.below&&row.full,tag+' <430px 外觀列要單欄');assert(row.minH>=44,tag+' 外觀按鈕 ≥44px');
    combos++;await ctx.close();
  }
  // 切換＋重新整理保留（系統深色，手動淺色 → 重整 → 口語分頁 → 改回跟隨系統）
  {const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'dark'});
    await ctx.route('https://**',r=>r.abort());await ctx.addInitScript(spy);
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
    await page.evaluate(()=>localStorage.removeItem('bnk-theme'));await page.reload();
    await page.locator('#tabs [data-v=me]').click();
    await page.evaluate(()=>document.querySelector('.theme-row').scrollIntoView({block:'center'}));await page.waitForTimeout(400);const y0=await page.evaluate(()=>scrollY);
    await page.locator('[data-a=theme][data-v=light]').click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('bnk-theme')),'light');
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
    assert.equal(await page.evaluate(()=>scrollY),y0,'切換不跳回頂端');
    await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),BG.light);
    await page.reload();
    assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),BG.light,'重新整理後保留淺色');
    await page.locator('#tabs [data-v=oral]').click();await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#oral-module')).backgroundColor),ORAL.light,'口語分頁跟手動淺色');
    await page.locator('#tabs [data-v=me]').click();await page.locator('[data-a=theme][data-v=dark]').click();await page.reload();
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
    await page.locator('#tabs [data-v=me]').click();await page.locator('[data-a=theme][data-v=auto]').click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('bnk-theme')),null);
    assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-theme')),false);
    await page.reload();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),BG.dark,'跟隨系統＝深色');
    await ctx.close();}
  // 實際畫面：「答對了」綠字在綠底上的對比、按鈕立體底邊 token（每種外觀組合都要有，深色不可是淺色底邊）
  const lum=c=>{const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;};return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2]);};
  const ratio=(a,b)=>{const x=[lum(a),lum(b)].sort((p,q)=>q-p);return (x[0]+0.05)/(x[1]+0.05);};
  for(const [scheme,mode] of [['light','auto'],['dark','light'],['dark','auto'],['light','dark']]){
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:scheme});
    await ctx.route('https://**',r=>r.abort());await ctx.addInitScript(spy);
    await ctx.addInitScript(m=>{if(m==='auto')localStorage.removeItem('bnk-theme');else localStorage.setItem('bnk-theme',m);},mode);
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
    const eff=mode==='auto'?scheme:mode,tag=`系統${scheme}／外觀${mode}`;
    const lips=await page.evaluate(()=>{const cs=getComputedStyle(document.documentElement);return ['--btn-lip','--lip-en','--lip-jp','--lip-ink'].map(k=>cs.getPropertyValue(k).trim());});
    lips.forEach((v,i)=>assert(v,`${tag} 缺 ${['--btn-lip','--lip-en','--lip-jp','--lip-ink'][i]}`));
    assert.equal(lips[0],eff==='dark'?'rgba(0,0,0,.45)':'#C3CAD8',tag+' --btn-lip 跟外觀');
    await page.evaluate(()=>{document.querySelector('[data-a=startEn]').click();});await page.waitForTimeout(300);
    for(let i=0;i<14;i++){const t=await page.evaluate(()=>{const c=curCard();return c?c.t:null;});if(t==='q')break;
      const nx=page.locator('#ses .ov-foot .btn.primary, #ses .ov-foot [data-a=next]').first();if(await nx.count())await nx.click();else break;await page.waitForTimeout(150);}
    const idx=await page.evaluate(()=>{const c=curCard();return c&&c.q?c.q.opts.indexOf(c.q.id):-1;});assert(idx>=0,tag+' 走到英文選擇題');
    await page.locator('#ses .opt').nth(idx).click();await page.waitForTimeout(700);
    const r=await page.evaluate(()=>{const h=document.querySelector('#ses .fb.ok h3');const fb=h.closest('.fb');
      const lipOf=sel=>{const e=document.querySelector(sel);return e?getComputedStyle(e).getPropertyValue('--lip').trim():null;};
      return {txt:h.textContent,fg:getComputedStyle(h).color,bg:getComputedStyle(fb).backgroundColor,op:getComputedStyle(fb).opacity,primLip:lipOf('#ses .ov-foot .btn.primary')};});
    assert.match(r.txt,/答對了/);assert.equal(r.op,'1');
    const cr=ratio(r.fg,r.bg);assert(cr>=4.5,`${tag} 「答對了」對比 ${cr.toFixed(2)}（${r.fg} on ${r.bg}）`);
    if(r.primLip){const exp=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--lip-en').trim());assert.equal(r.primLip,exp,tag+' 練習頁主按鈕底邊用 --lip-en');}
    console.log(`  ${tag}：「答對了」${r.fg} on ${r.bg} = ${cr.toFixed(2)}:1；--btn-lip ${lips[0]}`);
    await ctx.close();}
  // 振假名：對話聽力題，320／390 寬
  for(const w of [320,390]){
    const ctx=await browser.newContext({viewport:{width:w,height:844},isMobile:true,hasTouch:true});
    await ctx.route('https://**',r=>r.abort());await ctx.addInitScript(spy);
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
    await page.evaluate(()=>{S.settings.read='furi';const r=recommend();startRun(r.tid,r.lv);});
    let seen=false;
    for(let i=0;i<8&&!seen;i++){const t=await page.evaluate(()=>curNode()&&curNode().t);
      if(t==='hear'){const v=page.locator('#run [data-a=hearVis][data-v=full]');if(await v.count())await v.first().click();seen=true;break;}
      for(const s of ['[data-a=sayShow]','[data-a=runNext]']){const l=page.locator('#run '+s);if(await l.count())await l.first().click();}
      if(t==='act'){const o=page.locator('#run .opt');if(await o.count())await o.first().click();const n=page.locator('#run [data-a=runNext]');if(await n.count())await n.first().click();}
      await page.waitForTimeout(120);}
    assert(seen,w+': 走到聽力題');
    const r=await page.evaluate(()=>{const rts=[...document.querySelectorAll('#run rt')].filter(e=>e.getClientRects().length);
      const reps=[...document.querySelectorAll('#run .repair3 .rep .jpf')].map(e=>{const rg=document.createRange();rg.selectNodeContents(e);const tops=new Set([...rg.getClientRects()].map(x=>Math.round(x.top/4)));return tops.size;});
      const cols=getComputedStyle(document.querySelector('#run .repair3')).gridTemplateColumns.split(' ').length;
      return {n:rts.length,min:Math.min(...rts.map(e=>parseFloat(getComputedStyle(e).fontSize))),reps,cols};});
    assert(r.n>0,w+': 有振假名');assert(r.min>=11,`${w}: 振假名最小 ${r.min}px`);
    assert.equal(r.cols,1,w+': <430px 求助按鈕單欄');
    // 一行的 ruby 會有 rt 與基底兩排 rect（rt 在上），所以 ≤2 排＝日文一行
    r.reps.forEach((n,i)=>assert(n<=2,`${w}: 第 ${i+1} 顆求助按鈕日文擠成多行（${n}）`));
    await ctx.close();}
  // 口語分頁 rt 最少 11px（以實際樣式算：注入一段各種情境的 ruby）
  {const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.route('https://**',r=>r.abort());
    const page=await ctx.newPage();await page.goto(url);await page.locator('#tabs [data-v=oral]').click();
    const m=await page.evaluate(()=>{const host=document.querySelector('#oral-app');const d=document.createElement('div');
      d.innerHTML=['jp','dialogue-line|jp','answer-line','result-list|jp','word-card|jp'].map(c=>{const [o,i]=c.split('|');return i?`<div class="${o}"><p class="${i}"><ruby>行<rt>い</rt></ruby></p></div>`:`<p class="${o}"><ruby>行<rt>い</rt></ruby></p>`;}).join('');
      host.appendChild(d);const v=[...d.querySelectorAll('rt')].map(e=>parseFloat(getComputedStyle(e).fontSize));d.remove();return Math.min(...v);});
    assert(m>=11,'口語振假名最小 '+m+'px');await ctx.close();}
  assert.deepEqual(errors,[]);await browser.close();server.close();
  console.log(`PASS: 外觀 ${combos} 種組合（3 種外觀 × 系統淺深）含口語分頁與 axe 對比、切換與重新整理保留、載入無顏色過場、深色區塊一致、「答對了」對比 ≥4.5、立體底邊 token 各外觀都有；振假名 ≥11px、求助按鈕單欄且各一行（320／390）。`);
})().catch(e=>{console.error(e);process.exit(1);});
