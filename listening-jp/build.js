const fs=require('fs'),path=require('path');
const root=__dirname,read=f=>fs.readFileSync(path.join(root,'src',f),'utf8');
const data=read('data.js'),app=read('app.js');
new Function(data+'\n'+app);
const html=read('shell.html').replace('<!-- STYLE -->','<style>\n'+read('style.css')+'\n</style>').replace('<!-- SCRIPTS -->','<script>\n'+data+'\n'+app+'\n</script>');
fs.writeFileSync(path.join(root,'index.html'),html);
console.log('獨立口語工具建置完成：listening-jp/index.html（單檔、無外部資源）');
