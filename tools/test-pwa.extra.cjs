// 主畫面 App 化：manifest、apple-touch-icon、favicon 都存在且載得到；manifest 內容正確；頁面沒有失敗的請求。
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),errors=[],failed=[];
const types={'.html':'text/html;charset=utf-8','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.js':'text/javascript'};
(async()=>{
  const server=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=path.join(repo,u);
    if(!f.startsWith(repo)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.statusCode=404;return r.end('nf');}r.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');r.end(fs.readFileSync(f));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.route('https://**',r=>r.abort());
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url());});
  const base='http://127.0.0.1:'+server.address().port+'/';
  await page.goto(base);await page.waitForTimeout(500);
  const links=await page.evaluate(()=>[...document.querySelectorAll('link[rel~=icon],link[rel=apple-touch-icon],link[rel=manifest]')].map(l=>l.href));
  assert(links.length>=4,'icon/manifest links');
  for(const l of links){const r=await page.request.get(l);assert.equal(r.status(),200,l);}
  const man=JSON.parse(fs.readFileSync(path.join(repo,'manifest.webmanifest'),'utf8'));
  assert.equal(man.display,'standalone');assert.equal(man.start_url,'./');
  for(const ic of man.icons){const buf=fs.readFileSync(path.join(repo,ic.src));const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20);assert.equal(`${w}x${h}`,ic.sizes,ic.src);}
  const ati=fs.readFileSync(path.join(repo,'apple-touch-icon.png'));assert.equal(ati.readUInt32BE(16),180);
  const meta=await page.evaluate(()=>({t:document.querySelector('meta[name=apple-mobile-web-app-title]')?.content,d:document.querySelector('meta[name=description]')?.content,tc:document.querySelectorAll('meta[name=theme-color]').length}));
  assert.equal(meta.t,'按鈕與積木');assert(meta.d&&meta.d.length>10);assert.equal(meta.tc,2);
  assert.equal((await page.request.get(base+'favicon.ico')).status(),200);
  assert.deepEqual(failed,[]);assert.deepEqual(errors,[]);await browser.close();server.close();
  console.log('PASS: manifest（standalone、圖示尺寸正確）、apple-touch-icon 180、favicon、theme-color、description 都在，沒有失敗的請求。');
})().catch(e=>{console.error(e);process.exit(1);});
