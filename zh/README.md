# 明白 · နားလည်ပြီ

給緬恩（緬甸人，中文約 TOCFL A2～B1）一個人用的繁體中文學習網頁 App。手機打開即可用，可加到主畫面。

網址（開啟 GitHub Pages 後）：`https://7zrsby2djz-ship-it.github.io/A/zh/`

## 內容與來源

| 部分 | 內容 | 來源與授權 |
|---|---|---|
| 單字（情境 15 主題 300 詞、TOCFL 入門 200 詞、基礎 300 詞） | 中文、緬文、例句、緬文例句、單字真人錄音、答對答錯音效 | [Work Chinese／Chin Chin Chinese（Myanmar Edition）](https://github.com/lai2570/Burmese_language_app)，YUNG-TSAI LAI、ChinQing in Taiwan，**CC BY-NC-ND 4.0**。**原樣使用、不改編、非商業**。錄音只轉成較小的 MP3（技術格式轉換）。 |
| 聽讀題 132 題、明朗中文 96 詞、CAT 模擬邏輯 | 聽力／閱讀、限時、CAT、作答原因回顧 | 明朗中文（ChatGPT 製作） |
| 生活對話 6 情境 26 段、手機介面字 86 個、易混字組 10 組、手機畫面題 16 題 | 對方先說 → 聽懂 → 小問題 → 選怎麼接；介面字附「按下去會怎樣」 | 本 App 新寫。做法照「按鈕與積木」的日文對話與英文介面字。**緬文尚未經母語老師檢查。** |

`data/chin_words.json` 由 `tools/extract_chin.py` 從 Flutter 專案的 Dart 檔逐字抽出；`tools/validate.cjs` 會逐欄比對原始檔，確認 800 字沒有被改動。App 不顯示拼音（只用注音）。

## 功能

- **今天**：新字 5 個（學完 5 秒測驗）→ 到期複習 → 一段對話 → 介面字 3 個＋畫面題 → 聽力 5 題。
- **對話**：求助按鈕就是可以說的話（「可以再說一次嗎？」「可以說慢一點嗎？」「可以說簡單一點嗎？」）；廣播只能重播／放慢。第一次練顯示文字，練過後先只用聽，可按「顯示文字」。紀錄分成看文字完成／求助後完成／只用聽完成。
- **單字**：情境、TOCFL、明朗、介面字四類；學習卡、5 秒兩選一測驗（照 Chin Chin Chinese）、生字本。間隔複習：記得 → 1/3/7/14/30 天，忘了 → 10 分鐘後。
- **聽讀**：學習／限時（聽完才倒數，20/15/10/5 秒；閱讀 90 秒）／CAT（答對變難、聽力每題 10 秒、閱讀整回 60 分鐘、不能回上一題）。CAT 只是練習估計，不是官方分數。
- **我的**：生字本、紀錄、設定（緬文、注音各自開關、字大小、深淺色、語速、聲音、每天新字來源、聽力級數）、備份碼。

## 修改與建置

改 `src/` 裡的檔案，再執行（需要 Node.js 與 `pip install pypinyin`）：

```sh
./build.sh
```

會依序：收集要標注音的句子 → 用 pypinyin 產生台灣讀音（`tools/zhuyin.py` 內有台灣讀音修正表）→ 組成 `index.html` → 檢查。**不要直接改 `index.html`。**

| 檔案 | 內容 |
|---|---|
| `src/talk_core.js` | 對話教材格式說明與求助句 |
| `src/talk_*.js` | 六個情境（咖啡店、手搖飲、便利商店、早餐店、捷運公車、學校辦公室） |
| `src/data_ui.js` | 介面字、易混字組、手機畫面題 |
| `src/app_core.js` | 存檔、注音、語音、資料整理、間隔複習 |
| `src/app_words.js` | 單字書、學習卡、5 秒測驗、生字本、介面字 |
| `src/app_talk.js` | 對話執行 |
| `src/app_practice.js` | 聽讀與 CAT |
| `src/app_main.js` | 今天、我的、設定、事件 |
| `src/style.css` | 版面（淺色／深色） |
| `tools/test_app.py`、`tools/test_talk_all.py` | 瀏覽器實測（先在 `zh/` 執行 `python3 -m http.server 8765`） |

新增對話情境：照 `talk_core.js` 開頭的格式寫一個 `talk_xxx.js`，加到 `tools/collect.cjs`、`tools/assemble.cjs`、`tools/validate.cjs` 的檔案清單，再 `./build.sh`。

## 存檔

- 只存在手機瀏覽器的 `localStorage`（key：`mingbai-zh-v1`）。換手機或清除 Safari 資料前，到「我的 → 備份」複製備份碼。
- 句子聲音是手機內建中文語音（優先 zh-TW）；單字是真人錄音。

## 驗證（這一版）

- `validate.cjs`：800 字逐欄原樣、26 段對話結構、介面字、4,268 句注音數量。
- 瀏覽器（390×844，淺色／深色）：今天五項任務全部走完、26 段對話各走兩次（含隨機選錯、求助、顯示文字）、限時聽力倒數、CAT、緬文／注音關閉後「看緬文」、無橫向捲動。
- 未實測：真實 iPhone 的語音、加到主畫面後的行為。
