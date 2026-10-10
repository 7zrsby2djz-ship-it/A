#!/bin/sh
# 把 src/ 裡的檔案組成一個完整的 index.html
cd "$(dirname "$0")"
set -e
node listening-jp/build.js
node listening-jp/build-embedded.js
node kana-rebuild/tools/build-data.cjs
node kana-rebuild/tools/validate.cjs
node oral-audio/tools/build-embed.cjs batch01
node tools/build-sfx.cjs
{ echo '<!doctype html><html lang="zh-Hant-TW"><head>'; cat src/head.html; echo '<style>'; cat src/oral.generated.css src/motion.css src/course.css; echo '</style></head><body>'; cat src/shell.html; echo '<script>'; cat src/theme-boot.js src/data_en.js src/data_jp.js src/data_tasks.js src/data_life.js src/data_game.js src/data_course.js kana-rebuild/generated/kana-data.js src/run.js src/jp.js src/listen.js src/game.js src/kana.js src/today5.js src/lockplay.js src/course.js src/oral.generated.js src/sfx.generated.js src/fx.js src/theme.js src/app.js; echo '</script>'
  # 鎖屏聽力的 MP3（約 2 MB）放最後一段 script：主程式先執行、第一個畫面先出來，音檔資料再串流進來
  echo '<script>'; cat oral-audio/generated/batch01-audio.js; echo ';try{window.dispatchEvent(new Event("bnk-audio-ready"))}catch(e){}'; echo '</script></body></html>'; } > index.html
# 離線用的 service worker：版本＝index.html 的雜湊，內容一變瀏覽器就會換新版
node tools/build-sw.cjs
node -e "const h=require('fs').readFileSync('index.html','utf8');const p=h.split('<script>').slice(1).map(x=>x.split('</script>')[0]);if(p.length!==2)throw Error('expected 2 scripts');p.forEach(x=>new Function(x));console.log('syntax ok')"
