#!/bin/sh
# 把 src/ 裡的檔案組成一個完整的 index.html
cd "$(dirname "$0")"
set -e
node listening-jp/build.js
node listening-jp/build-embedded.js
node kana-rebuild/tools/build-data.cjs
node kana-rebuild/tools/validate.cjs
node oral-audio/tools/build-embed.cjs batch01
{ echo '<!doctype html><html lang="zh-Hant-TW"><head>'; cat src/head.html; echo '<style>'; cat src/oral.generated.css; echo '</style></head><body>'; cat src/shell.html; echo '<script>'; cat src/data_en.js src/data_jp.js src/data_tasks.js src/data_life.js src/data_game.js kana-rebuild/generated/kana-data.js oral-audio/generated/batch01-audio.js src/run.js src/jp.js src/listen.js src/game.js src/kana.js src/today5.js src/lockplay.js src/oral.generated.js src/app.js; echo '</script></body></html>'; } > index.html
node -e "const h=require('fs').readFileSync('index.html','utf8');new Function(h.split('<script>')[1].split('</script>')[0]);console.log('syntax ok')"
