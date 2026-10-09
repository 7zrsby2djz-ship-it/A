// QA 第 1、2 項回歸：答錯時不出現綠色「確認了」；「練五個字」的進度同時顯示第幾個字與第幾步；無漢字代表詞不重複印兩次。
// Usage: node tools/test-qa-r3.extra.cjs（需要 playwright）
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[];
function spy(){Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{lang:'ja-JP',name:'test'}],addEventListener(){},resume(){},cancel(){},speak(u){setTimeout(()=>u.onend&&u.onend(),10);}}});}
(async()=>{
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync(path.join(repo,'index.html')));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('https://**',r=>r.abort());await ctx.addInitScript(spy);
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  // ---- QA #1：每一個有 learn 的「對方回答」節點，答錯 vs 答對 ----
  let checked=0;
  for(const wrong of [true,false]){
    await page.evaluate(()=>{S.run=null;S.tk={};S.ck={};persist();});
    // 從日文頁推薦的對話開始，走到第一個有問題的「對方回答」
    await page.evaluate(()=>{const t=Object.keys(TASK)[0];startRun(t,1);});
    await page.waitForFunction(()=>{const r=document.querySelector('#run');return r&&!r.hidden;});
    for(let step=0;step<30;step++){
      const kind=await page.evaluate(()=>{const n=curNode();return n?n.t:'none';});
      if(kind==='say'){const s=page.locator('#run [data-a=sayShow]');if(await s.count())await s.click();await page.locator('#run [data-a=runNext]').click();continue;}
      if(kind!=='hear')break;
      const hasQ=await page.locator('#run [data-a=hearQ]').count();
      if(!hasQ){await page.locator('#run [data-a=hearDone]').click();continue;}
      // 回答本節點全部題目
      for(let k=0;k<6;k++){
        const opts=page.locator('#run [data-a=hearQ]:not([disabled])');if(!await opts.count())break;
        const vals=await opts.evaluateAll(b=>b.map(x=>x.dataset.v));const pick=wrong?vals.find(v=>v!=='0'):'0';
        await page.locator(`#run [data-a=hearQ][data-v="${pick}"]:not([disabled])`).click();
        const nq=page.locator('#run [data-a=hearNextQ]');if(await nq.count())await nq.click();
      }
      const learn=await page.evaluate(()=>(curNode().learn||[]).length);
      if(learn){
        const txt=await page.locator('#run').innerText();
        if(wrong){assert.equal(await page.locator('#run [data-learn=ok]').count(),0,'答錯時不該有綠色確認了');assert.equal(await page.locator('#run [data-learn=wrong]').count(),1);assert.doesNotMatch(txt,/確認了\n/);assert.match(txt,/答案是/);}
        else{assert.equal(await page.locator('#run [data-learn=ok]').count(),1);assert.equal(await page.locator('#run [data-learn=wrong]').count(),0);}
        checked++;break;
      }
      await page.locator('#run [data-a=hearDone]').click();
    }
    await page.evaluate(()=>{S.run=null;persist();});await page.reload();
  }
  assert.equal(checked,2,'找到並檢查了答錯／答對兩種情況');
  // ---- QA #2：練五個字 ----
  await page.locator('#tabs [data-v=jp]').click();
  assert.match(await page.locator('#view').innerText(),/練五個字/);
  await page.locator('#view [data-a=knOpen][data-v=go]').click();
  const prog=await page.locator('[data-kprog]').innerText();
  const m=prog.match(/字 (\d)\/(\d)・第 (\d+)\/(\d+) 步/);assert(m,'進度文字：'+prog);
  assert.equal(m[1],'1');assert(+m[2]<=5);assert.equal(m[3],'1');
  // ---- QA #10：無漢字詞（ありがとう）只印一次 ----
  const dup=await page.evaluate(()=>[...document.querySelectorAll('#kn .kword')].filter(w=>{const kw=w.querySelector('.kw'),kr=w.querySelectorAll('.kr');return kw&&kr.length&&kr[kr.length-1]!==kw&&kw.textContent.trim()===kr[kr.length-1].textContent.trim();}).length);
  assert.equal(dup,0,'同一個詞不重複印兩次');
  assert.deepEqual(errors,[]);
  await browser.close();server.close();
  console.log('PASS: 答錯不出綠色「確認了」（改黃色「他其實是說」）、答對仍顯示「確認了」；練五個字顯示「字 x/5・第 n/N 步」；無漢字代表詞不重複。');
})().catch(e=>{console.error(e);process.exit(1);});
