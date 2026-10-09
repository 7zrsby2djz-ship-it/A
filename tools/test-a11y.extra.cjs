// 對比、觸控目標、版面小修回歸：axe 色彩對比 0、可點元素至少 44px 高、「振假名」「全部」不斷行、口語英文小標改中文、「慢慢」不被拆開、口語新進度讀音跟主 App。
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[];
let axeSrc;try{axeSrc=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');}catch(e){axeSrc=null;}
(async()=>{
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync(path.join(repo,'index.html')));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});const url='http://127.0.0.1:'+server.address().port;
  for(const scheme of ['light','dark'])for(const w of [320,390]){
    const ctx=await browser.newContext({viewport:{width:w,height:800},isMobile:true,hasTouch:true,colorScheme:scheme});await ctx.route('https://**',r=>r.abort());
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
    for(const t of ['home','en','jp','oral','me']){
      await page.locator(`#tabs [data-v=${t}]`).click();await page.waitForTimeout(150);
      if(t==='home')await page.evaluate(()=>{document.querySelector('#homeAll').open=true;});
      if(axeSrc){await page.addScriptTag({content:axeSrc});
        const v=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:['color-contrast']});return r.violations.flatMap(v=>v.nodes.map(n=>n.html.slice(0,70)));});
        assert.deepEqual(v,[],`${scheme} ${w} ${t} 對比不足`);}
      const small=await page.evaluate(()=>[...document.querySelectorAll('#view button,#view a,#view summary,#view select,#oral-module button,#oral-module a')].filter(e=>{if(!e.offsetParent)return false;if(e.getAttribute('role')==='switch'){const b=getComputedStyle(e,'::before');return !(b.content!=='none'&&e.getBoundingClientRect().height+2*Math.abs(parseFloat(b.top||'0'))>=43.5);}const r=e.getBoundingClientRect();return r.height>0&&r.height<43.5;}).map(e=>(e.textContent.trim()||e.getAttribute('aria-label')||e.className).slice(0,20)+':'+Math.round(e.getBoundingClientRect().height)));
      assert.deepEqual(small,[],`${scheme} ${w} ${t} 觸控目標小於 44px`);
    }
    await page.locator('#tabs [data-v=me]').click();
    const furi=await page.evaluate(()=>{const b=[...document.querySelectorAll('.seg button')].find(x=>x.textContent.trim()==='振假名');const r=document.createRange();r.selectNodeContents(b);return r.getClientRects().length;});
    assert.equal(furi,1,`${w}: 振假名一行`);
    await page.locator('#tabs [data-v=home]').click();
    const all=await page.evaluate(()=>{const s=document.querySelector('#homeAll summary>span');const r=document.createRange();r.selectNodeContents(s);return r.getClientRects().length;});
    assert.equal(all,1,`${w}: 全部一行`);
    await page.locator('#tabs [data-v=oral]').click();await page.evaluate(()=>{location.hash='#home';});await page.waitForTimeout(150);
    const oral=await page.locator('#oral-module').innerText();
    assert.doesNotMatch(oral,/START WITH ONE LINE|MAKE IT YOUR PACE|SMALL LESSONS/i);
    const split=await page.evaluate(()=>[...document.querySelectorAll('#oral-module .hero-title span')].map(s=>{const r=document.createRange();r.selectNodeContents(s);return new Set([...r.getClientRects()].map(x=>Math.round(x.top))).size;}));
    assert(split.every(n=>n===1),`${w}: 標題片語不被拆開 ${split}`);
    await ctx.close();
  }
  // 口語新進度的讀音跟主 App；已有進度不動
  const ctx=await browser.newContext({viewport:{width:390,height:800}});await ctx.route('https://**',r=>r.abort());
  await ctx.addInitScript(()=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');localStorage.clear();localStorage.setItem('bnk-state-v1',JSON.stringify({v:1,settings:{read:'ro'}}));});
  const page=await ctx.newPage();await page.goto(url);
  await page.locator('#tabs [data-v=oral]').click();await page.evaluate(()=>{location.hash='#settings';});await page.waitForTimeout(150);
  assert.equal(await page.locator('#oral-module #reading').inputValue(),'ro');
  await page.selectOption('#oral-module #reading','none');
  await page.evaluate(()=>{const o=JSON.parse(localStorage.getItem('bnk-state-v1'));o.settings.read='both';localStorage.setItem('bnk-state-v1',JSON.stringify(o));});
  await page.reload();await page.locator('#tabs [data-v=oral]').click();await page.evaluate(()=>{location.hash='#home';location.hash='#settings';});await page.waitForTimeout(150);
  assert.equal(await page.locator('#oral-module #reading').inputValue(),'none','已有口語進度不跟著改');
  assert.deepEqual(errors,[]);await browser.close();server.close();
  console.log('PASS: 320／390 深淺色：色彩對比 0 違規'+(axeSrc?'':'（未安裝 axe-core，略過對比）')+'、可點元素都 ≥44px、振假名與「全部」一行、口語小標中文、標題片語不拆；口語新進度讀音跟主 App，舊進度不動。');
})().catch(e=>{console.error(e);process.exit(1);});
