// 由 tools/icon/icon.svg 產生 App 圖示（需要 playwright）。圖示是提交進倉庫的檔案，build.sh 不會跑這支。
// Usage: node tools/icon/make-icons.cjs
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),svg=fs.readFileSync(path.join(__dirname,'icon.svg'),'utf8');
(async()=>{const b=await chromium.launch();
  for(const [name,size] of [['icon-512.png',512],['icon-192.png',192],['apple-touch-icon.png',180],['favicon-32.png',32]]){
    const p=await b.newPage({viewport:{width:size,height:size}});
    await p.setContent(`<html><body style="margin:0">${svg.replace('width="512" height="512"',`width="${size}" height="${size}"`)}</body></html>`);
    await p.screenshot({path:path.join(root,name),omitBackground:false});await p.close();console.log(name);}
  await b.close();})();
