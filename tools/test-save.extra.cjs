// 存檔保護回歸：壞掉的存檔不被覆蓋（另存新 key、舊備份不覆蓋）、存不了時提示、口語聽力沒雲端時可匯出入。
// Usage: node tools/test-save.extra.cjs（需要 playwright）
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[];
(async()=>{
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync(path.join(repo,'index.html')));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('https://**',r=>r.abort());
  let page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port;
  await page.goto(url);
  const keys=()=>page.evaluate(()=>Object.keys(localStorage).sort());
  // 1) 四個存檔都塞壞資料，外加一份「已經存在的舊備份」
  // 用 init script 在頁面程式執行前塞資料（直接 reload 會先觸發 pagehide 存檔，測不到讀檔）
  const seeded=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await seeded.route('https://**',r=>r.abort());
  await seeded.addInitScript(()=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.clear();localStorage.setItem('bnk-state-v1','{bad main');localStorage.setItem('bnk-today5-v1','{bad t5');
    localStorage.setItem('bnk-lockplay-v1','{bad lp');localStorage.setItem('kiku-independent-v1','{bad oral');localStorage.setItem('bnk-state-v1.bak-old','older backup');});
  await page.close();page=await seeded.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForTimeout(400);
  // 觸發各模組讀檔與存檔
  await page.locator('#tabs [data-v=me]').click();
  await page.locator('#view [data-a=set][data-k=read], #view .seg button').first().click().catch(()=>{});
  await page.evaluate(()=>{persist();t5St();t5Save();lpPref();lpSave();});
  await page.locator('#tabs [data-v=oral]').click();await page.waitForTimeout(200);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  const k=await keys(),val=x=>page.evaluate(x=>localStorage.getItem(x),x);
  for(const [key,bad] of [['bnk-state-v1','{bad main'],['bnk-today5-v1','{bad t5'],['bnk-lockplay-v1','{bad lp'],['kiku-independent-v1','{bad oral']]){
    const baks=k.filter(x=>x.startsWith(key+'.bak-')&&x!=='bnk-state-v1.bak-old');
    assert.equal(baks.length,1,key+' should have exactly one new backup: '+k.join(','));
    assert.equal(await val(baks[0]),bad,key+' backup keeps raw text');
    assert.notEqual(await val(key),bad,key+' was replaced only after backup');
  }
  assert.equal(await val('bnk-state-v1.bak-old'),'older backup','older backup untouched');
  // 我的：顯示舊存檔提示；口語：沒雲端時顯示匯出／匯入與誠實文案
  await page.locator('#tabs [data-v=me]').click();
  assert.match(await page.locator('#view').innerText(),/2 份讀不懂、已另存的舊存檔/);
  await page.locator('#tabs [data-v=oral]').click();await page.evaluate(()=>{location.hash='#settings';});await page.waitForTimeout(300);
  const oral=await page.locator('#oral-module').innerText();
  assert.match(oral,/匯出進度/);assert.match(oral,/匯入進度/);assert.match(oral,/沒有雲端同步/);assert.doesNotMatch(oral,/登入 Claude 時也會/);
  // 2) 再次重新整理：存檔已正常，不該再多一份備份
  await page.reload();await page.waitForTimeout(300);
  assert.equal((await keys()).filter(x=>x.includes('.bak-')).length,5,'no extra backups on healthy reload');
  // 3) 存不了時提示一次
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});
  await page.locator('#tabs [data-v=me]').click();
  await page.evaluate(()=>{S.xp++;persist();});await page.waitForTimeout(100);
  assert.match(await page.locator('#toast').innerText(),/存不了進度/);
  assert.deepEqual(errors,[]);
  await browser.close();server.close();
  console.log('PASS: 壞存檔另存新 key（主進度、今天5分鐘、鎖屏、口語），舊備份不覆蓋，正常重整不多備份；存不了時提示；口語沒雲端時可匯出入、文案正確。');
})().catch(e=>{console.error(e);process.exit(1);});
