#!/bin/sh
# 把 src/ 裡的檔案組成一個完整的 index.html
cd "$(dirname "$0")"
{ cat src/head.html; cat src/shell.html; echo '<script>'; cat src/data_en.js src/data_jp.js src/data_dlg.js src/app.js src/dlg.js src/words.js src/listen.js; echo '</script>'; } > index.html
node -e "const h=require('fs').readFileSync('index.html','utf8');new Function(h.split('<script>')[1].split('</script>')[0]);console.log('syntax ok')"
