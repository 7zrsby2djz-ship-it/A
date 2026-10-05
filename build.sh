#!/bin/sh
# 把 src/ 裡的檔案組成一個完整的 index.html
cd "$(dirname "$0")"
{ cat src/head.html; cat src/shell.html; echo '<script>'; cat src/data_en.js src/data_jp.js src/data_tasks.js src/run.js src/jp.js src/listen.js src/app.js; echo '</script>'; } > index.html
node -e "const h=require('fs').readFileSync('index.html','utf8');new Function(h.split('<script>')[1].split('</script>')[0]);console.log('syntax ok')"
