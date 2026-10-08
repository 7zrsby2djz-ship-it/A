#!/bin/sh
# 組成 zh/index.html（需要 Node.js 與 Python 的 pypinyin）
cd "$(dirname "$0")"
set -e
mkdir -p build
node tools/collect.cjs
python3 tools/zhuyin.py
python3 tools/itemdiff.py
node tools/assemble.cjs
node tools/validate.cjs
