#!/bin/sh
# 一鍵檢查：教材檢查 → 建置 → 全部瀏覽器回歸 → 確認生成檔已和來源一致。
# 用法：改完來源後先 ./build.sh，git add 全部檔案，再跑 tools/check-all.sh。
# 生成檔檢查比對的是「工作目錄 vs 暫存區（git add 過的內容）」：
# 重新建置後若 index.html 等檔案和 git add 的版本不同，代表忘了重建或忘了 add。
# 瀏覽器測試需要 Node 版 Playwright：可設 PLAYWRIGHT_NODE_MODULES=/path/to/node_modules（預設試 /workspace/pw/node_modules）。
cd "$(dirname "$0")/.."
set -e
PW="${PLAYWRIGHT_NODE_MODULES:-/workspace/pw/node_modules}"
if [ -d "$PW" ]; then export NODE_PATH="$PW${NODE_PATH:+:$NODE_PATH}"; fi

step() { printf '\n== %s\n' "$*"; }
step "教材檢查"; node tools/validate.js; node listening-jp/validate.js
step "建置"; ./build.sh
step "生成檔是否已提交（工作目錄 vs 暫存區）"
GEN="index.html listening-jp/index.html src/oral.generated.js src/oral.generated.css kana-rebuild/generated oral-audio/generated"
if ! git diff --quiet -- $GEN; then
  git diff --stat -- $GEN
  echo "FAIL: 建置結果和 git add 的版本不同。請確認改的是來源，重建後 git add 再跑一次。"; exit 1
fi
echo "生成檔一致"
for t in tools/test-kana.cjs tools/test-today5.cjs tools/test-lockplay.cjs tools/test-oral-integration.cjs listening-jp/test-browser.cjs; do
  step "$t"; node "$t"
done
for t in tools/test-*.extra.cjs; do [ -f "$t" ] || continue; step "$t"; node "$t"; done
printf '\nALL CHECKS PASSED\n'
