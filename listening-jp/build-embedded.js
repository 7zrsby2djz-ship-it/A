// Generate the same oral curriculum as a native tab in the main, single-file app.
// All CSS selectors and DOM queries are scoped to the module; progress keeps its own key.
const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(__dirname,'src',f),'utf8');
// prefix：手動主題用（例如 ':root[data-theme=dark] '），加在 #oral-module 前面。
function scopeCss(css,prefix=''){
  let out='',pos=0;
  while(pos<css.length){const open=css.indexOf('{',pos);if(open<0){out+=css.slice(pos);break;}
    let depth=1,end=open+1;while(depth&&end<css.length){if(css[end]==='{')depth++;if(css[end]==='}')depth--;end++;}
    if(depth)throw Error('Unbalanced CSS');
    const header=css.slice(pos,open).trim(),body=css.slice(open+1,end-1);
    // 口語深色：跟主 App 一樣「跟隨系統，但 html[data-theme] 手動選擇優先」。
    // 系統深色版只在沒有手動選淺色時生效；另外輸出一份不包 media 的 html[data-theme=dark] 版本。
    if(/^@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)$/.test(header))out+=header+'{'+scopeCss(body,prefix+':root:not([data-theme=light]) ')+'}'+scopeCss(body,prefix+':root[data-theme=dark] ');
    else if(header.startsWith('@media'))out+=header+'{'+scopeCss(body,prefix)+'}';
    else if(header.startsWith('@keyframes'))out+=header+'{'+body+'}';
    else{const selectors=header.split(',').map(s=>{s=s.trim().replace(/#app\b/g,'#oral-app').replace(/#toast\b/g,'#oral-toast');return prefix+(/^(?:\:root|body)\b/.test(s)?s.replace(/^(?:\:root|body)/,'#oral-module'):'#oral-module '+s);});out+=selectors.join(',')+'{'+body+'}';}
    pos=end;
  }return out;
}
const shell='<div id="oral-module"><nav class="nav" aria-label="口語聽力功能"><a href="#home">練習</a><a href="#course">課程</a><a href="#words">詞義</a><a href="#settings">設定</a></nav><div id="oral-app" tabindex="-1"></div><div id="oral-toast" role="status" aria-live="polite"></div></div>';
const js='window.ORAL_EMBEDDED=true;\nconst ORAL_SHELL='+JSON.stringify(shell)+';\n'+read('data.js')+'\n'+read('app.js').replace(/「我的」/g,'「口語設定」');
new Function(js);
fs.writeFileSync(path.join(root,'src/oral.generated.js'),js);
const css=scopeCss(read('style.css'));
if(!css.includes(':root[data-theme=dark] #oral-module{')||!css.includes(':root:not([data-theme=light]) #oral-module{')||/@media\(prefers-color-scheme:dark\)\{#oral-module\{/.test(css))throw Error('口語深色區塊沒有對應 html[data-theme]');
fs.writeFileSync(path.join(root,'src/oral.generated.css'),css+'\n#oral-module{font-size:16px;background:var(--bg);border-radius:20px;overflow:clip}#oral-module .nav{margin:0 12px;padding-top:12px}#oral-module #oral-app{padding:20px 14px 24px;min-height:0}#oral-module .intro h1{font-size:28px}#oral-module .header,#oral-module footer{display:none}#oral-module .nav a{padding:10px 8px;min-height:44px}#oral-module .study-card{padding:20px 16px}#oral-module .audio-buttons{gap:7px}#oral-module .audio-buttons button{padding:12px 10px}#oral-module .hero{gap:18px;margin-bottom:22px}#oral-module .route-card{padding:14px}#oral-module .practice-top button{padding-left:0}#oral-module #oral-toast{bottom:calc(var(--tab-h,66px) + env(safe-area-inset-bottom,0px) + 12px)}\n');
console.log('口語聽力分頁已產生');
