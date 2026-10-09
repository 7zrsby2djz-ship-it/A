// 頁面基礎：標準模式、<html lang="zh-Hant-TW">、日文文字都標 lang="ja"（iOS 用日文字形、VoiceOver 用日文語音）。
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[];
(async()=>{
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(fs.readFileSync(path.join(repo,'index.html')));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.route('https://**',r=>r.abort());
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  assert.equal(await page.evaluate(()=>document.compatMode),'CSS1Compat');
  assert.equal(await page.evaluate(()=>document.documentElement.lang),'zh-Hant-TW');
  const bad=async where=>{const n=await page.evaluate(()=>[...document.querySelectorAll('.jpf,.jl .jp,.jline .jp,ruby')].filter(e=>e.offsetParent&&!e.closest('[lang="ja"]')).map(e=>e.outerHTML.slice(0,80)));assert.deepEqual(n,[],where+': 日文沒標 lang=ja');};
  for(const t of ['home','jp','oral','me']){await page.locator(`#tabs [data-v=${t}]`).click();await bad(t);}
  await page.locator('#tabs [data-v=jp]').click();await page.locator('#view [data-a=knOpen][data-v=go]').click();await bad('kana');
  assert.deepEqual(errors,[]);await browser.close();server.close();
  console.log('PASS: 標準模式、html lang=zh-Hant-TW、各分頁與假名練習的日文都在 lang=ja 之內。');
})().catch(e=>{console.error(e);process.exit(1);});
