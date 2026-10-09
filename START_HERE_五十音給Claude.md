# 五十音 1.1：Claude 從這裡接手發布

> **2026-10-09 更新：五十音真人錄音已全部移除**，基本假名改用 iPhone 內建日文語音（Web Speech，正常 0.8／慢速 0.55）。`kana-rebuild/audio/`、`generated/kana-audio.js`、`build-audio.cjs`、`fetch-audio.py` 已刪除，`build.sh` 不再內嵌錄音。鎖屏聽力的 60 段合成音（oral-audio）不受影響。


使用者已授權擴充同一個 App 的五十音教材、修正單音發音，完成 GitHub 提交後由 Claude 更新目前的手機成品。請直接接手發布，不需要再請 SOL 審核。

## 目前已完成

本次以已施工版本 `8253560c217ba2c7a7f84c66596edde0762e50ba` 為基底，沿用 `src/kana.js` 與既有資料契約，不需要重做第一版介面。

- 代表詞從 **146 → 324 個**，新增 **178 個**旅行／日常詞；代表詞連結從 147 → 325 筆。46 組基本假名、92 格、91 個可練格的 ID 保留。
- 每張卡先顯示前兩個詞，其餘放在「再看 N 個代表詞」。常用格有 3～4 個詞；ヌ 等少見字首保留合理數量，不湊陌生詞。
- 「單字找字」會依該格既有作答次數輪替代表詞；標成不熟的詞會後移並優先用其他詞。答錯重出保留當次同一個單字。混合模式第二題交替配對與單字找字。
- 44 個清音使用 **Hakatanoshio117117 在 Wikimedia Commons 公開的真人錄音**。逐檔核對作者、假名描述、公共領域授權，來源與雜湊列在 `kana-rebuild/audio/manifest.json`。
- 真人錄音轉為 MP3，直接內嵌在 `index.html`，單音不再交給 Web Speech；部分原錄音重複同一音，完整保留，方便跟讀。慢速為 0.8 倍並保留音高。
- 整詞仍使用原本 `ja-JP` 語音合成與確認過的假名讀音。ん／ン、を／ヲ 的整詞／句子教法保留。
- `S.kana`、既有假名與單字 ID、存檔 key 和原有帳號同步管道保留。舊的未完成練習仍可接續。

## 先讀哪些檔案

1. [根目錄 README](README.md)：目前 App 與建置方式。
2. [1.1 擴充／發音交接](kana-rebuild/UPDATE_1.1.md)：本次內容、來源、驗證、手機發布驗收。
3. [資料契約](kana-rebuild/README.md) 與 [來源／授權](kana-rebuild/ATTRIBUTION.md)。

[第一版原企劃](kana-rebuild/CLAUDE_IMPLEMENTATION_PLAN.md) 保留作設計背景；本頁與 `UPDATE_1.1.md` 說明本次已完成的狀態，不要再把它當成尚未施工。

## 接手步驟

```sh
node tools/validate.js
node listening-jp/validate.js
./build.sh
node tools/test-kana.cjs
# 若環境有 Python Playwright，也可跑既有回歸：
python3 tools/test-kana.py
```

正常建置不需要網路、ffmpeg 或重新下載真人錄音。音檔和生成工具已放進倉庫；請修改來源再建置，不直接手改 `index.html` 或任何 `.generated.*`。

**請更新使用者目前已收藏的同一個手機 App／Claude 成品入口**，使用本倉庫最新 `index.html`，不要另建一個獨立 App。若你的成品環境要從來源重組，必須包含 `generated/kana-data.js` 和 `generated/kana-audio.js`，各在 `src/kana.js` 前載入。不要只複製 `src/kana.js` 而漏掉 MP3 資料。

發布後驗收：確認「全部代表詞（324 個）」、え／し／つ／ふ／ム 的真人按鈕、慢速播放、展開代表詞、原進度與未完成練習。在實際 iPhone 上確認正常與慢速的聽感；本次自動化測試不能代替真機聆聽。如果無法更新既有入口，請直接說明障礙與可取得的版本，不宣稱手機已更新。
