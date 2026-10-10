// QA 第 6、3 項回歸：關掉練習回首頁時捲回最上面（主按鈕完整可見）；「先離開」假名練習回到原本頁面，不落在假名表遮罩。
// Usage: node tools/test-qa-r4.extra.cjs（需要 playwright）
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[];
function spy(){Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{lang:'ja-JP',name:'test'}],addEventListener(){},resume(){},cancel(){},speak(u){setTimeout(()=>u.onend&&u.onend(),10);}}});}
(async()=>{
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync(path.join(repo,'index.html')));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:664},isMobile:true,hasTouch:true});
  await ctx.route('https://**',r=>r.abort());await ctx.addInitScript(spy);
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const vis=s=>page.evaluate(s=>{const e=document.querySelector(s);return !!e&&!e.hidden;},s);
  const mainBtnVisible=()=>page.evaluate(()=>{const b=document.querySelector('#view .course-hero .btn.primary');if(!b)return false;const r=b.getBoundingClientRect(),tab=document.querySelector('.tabbar').getBoundingClientRect();return scrollY===0&&r.top>=0&&r.bottom<=tab.top;});
  // #6a 鎖屏聽力：從「全部」下方打開再關掉
  await page.locator('#homeAll summary').click();
  await page.locator('#view [data-a=lpOpen]').scrollIntoViewIfNeeded();
  assert(await page.evaluate(()=>scrollY>100),'先捲到下面');
  await page.locator('#view [data-a=lpOpen]').click();await page.locator('#lpv [data-a=lpClose]').click();
  assert(await mainBtnVisible(),'關掉鎖屏聽力後主按鈕完整可見');
  // #6b 今天 5 分鐘 → 對話 → 中途關掉
  await page.evaluate(()=>scrollTo(0,400));
  await page.locator('#view [data-a=t5Go]').click();
  if(await vis('#ses'))await page.locator('#ses [data-a=sesClose]').first().click();
  if(await vis('#run'))await page.locator('#run [data-a=runClose]').first().click();
  assert(await mainBtnVisible(),'關掉對話後主按鈕完整可見');
  // #6c 重新整理時不停在下面
  await page.evaluate(()=>{document.querySelector('#homeAll').open=true;scrollTo(0,600);});await page.reload();
  assert(await mainBtnVisible(),'重新整理後主按鈕完整可見');
  // #3a 日文頁「練五個字」→ 先離開 → 回日文頁，不是假名表
  await page.locator('#tabs [data-v=jp]').click();
  await page.locator('#view [data-a=knOpen][data-v=go]').click();
  assert(await vis('#kn'));
  await page.locator('#kn [data-k=leave]').click();
  assert.equal(await vis('#kn'),false,'離開後不該停在假名表遮罩');
  assert.equal(await page.evaluate(()=>UI.tab),'jp');
  // 假名表按鈕之後仍點得到
  await page.locator('#view [data-a=knOpen]:not([data-v])').click();assert(await vis('#kn'));assert.equal(await page.evaluate(()=>KG.view),'home');
  // #3b 從假名表開始一輪 → 先離開 → 回假名表（原本頁面）
  await page.locator('#kn [data-k=start], #kn [data-k=resume]').first().click();assert.equal(await page.evaluate(()=>KG.view),'round');
  await page.locator('#kn [data-k=leave]').click();assert(await vis('#kn'));assert.equal(await page.evaluate(()=>KG.view),'home');
  await page.locator('#kn [data-k=close]').first().click();assert.equal(await vis('#kn'),false);
  // #3c 今天 5 分鐘的假名步驟 → 先離開 → 回首頁、主按鈕可見
  await page.locator('#tabs [data-v=home]').click();
  await page.evaluate(()=>{const st=t5St();st.step=2;st.on=false;t5Save();render();});
  if(!await page.locator('#homeAll').evaluate(e=>e.open))await page.locator('#homeAll summary').click();
  await page.locator('#view [data-a=t5Go]').click();assert(await vis('#kn'));
  await page.locator('#kn [data-k=leave]').click();
  assert.equal(await vis('#kn'),false);assert(await mainBtnVisible());
  assert.match(await page.locator('#view [data-a=t5Go]').textContent(),/繼續/);
  assert.deepEqual(errors,[]);
  await browser.close();server.close();
  console.log('PASS: 關掉鎖屏聽力／對話、重新整理後首頁在最上面且主按鈕完整；假名練習「先離開」回原本頁面（日文頁、首頁），從假名表進來才回假名表；假名表按鈕可點。');
})().catch(e=>{console.error(e);process.exit(1);});
