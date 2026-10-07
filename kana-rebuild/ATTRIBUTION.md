# 五十音資料包：來源、取得狀態與授權

查核／整理日期：2026-10-07。資料來源與實際已取得內容分開記錄。

## 已納入

### 使用者現有 App

來源：[7zrsby2djz-ship-it/A](https://github.com/7zrsby2djz-ship-it/A)，快照 commit `c762de7fdf3a7988a3ede835852a10ca400e5da9`。

`src/data_jp.js`、`src/data_tasks.js`、`src/data_life.js`、`src/data_game.js` 與 `listening-jp/src/data.js`。來源位置與 ID 逐筆保留於 `app-corpus.v1.json` 與起步詞 provenance；教材存在不等於使用者已學會。舊 B 的假名讀音另行編輯，不從原羅馬拼音自動反推。

### 使用者提供的 Duolingo 截圖

使用者已於 2026-10-07 明確同意在本公開 GitHub 倉庫納入截圖確認的 7 個已見詞與所述課程進度；此同意不表示已取得完整個人詞表。

圖片：`IMG_6297(2).png`、`IMG_6298(2).png`、`IMG_6356(1).png`、`IMG_6357.jpeg`。本次不把整張截圖再提交公開倉庫，只記錄完成此模組所需的詞彙與進度事實。

畫面顯示 820 個單字，第3階段、第6部分「買電子產品」。從詞彙畫面能確認：レジぶくろ、レシート、でんち、おもい、グレー、ケーブル，以及底部可見的 ワイヤレス。最後一詞中文被畫面裁掉，所以 `meaningOriginal:null`；資料包的「無線的」是參照現有 App 的編輯詞義，沒有冒充截圖可見中文。

沒有取得其他813個詞的清單；沒有以社群課程表推定個人已學詞。`fullPersonalListAvailable:false`。

### OpenJLPT N5～N3

來源：[evanclan/OpenJLPT](https://github.com/evanclan/OpenJLPT)，快照 commit `0d1d3410bec90bd4098a7c72de820543cb4f707c`，上游 `data/json/meta.json` 版本 0.3.0。

已將 `data/json/vocab/n5.json`、`n4.json`、`n3.json` 原始位元組複製到 `vendor/openjlpt/`，並記錄 SHA-256。N5 674、N4 630、N3 1,659，共2,963筆。`LICENSE`、`NOTICE.md`、`meta.json` 一併保存。保留上游穩定 ID、英文詞義、日文讀音、例句及有提供的振假名，未聲稱完成整庫繁中翻譯。

上游授權 **CC BY-SA 4.0**；依其 NOTICE 同時署名 OpenJLPT 與上游 JMdict／KANJIDIC2（EDRDG）、Jonathan Waller 的 JLPT 資料、Tatoeba。例句本身的 Tatoeba 來源 ID 仍保留。授權全文見 [vendor/openjlpt/LICENSE](vendor/openjlpt/LICENSE)，逐來源歸屬見 [vendor/openjlpt/NOTICE.md](vendor/openjlpt/NOTICE.md)。

建議 App 的資料來源區放：

> 部分詞彙難度資料來自 OpenJLPT（CC BY-SA 4.0），其上游包含 EDRDG 的 JMdict／KANJIDIC2、Jonathan Waller 的 JLPT 資料與 Tatoeba。

並附 [OpenJLPT](https://github.com/evanclan/OpenJLPT) 與 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 連結。此準備資料包中，衍生教材資料（`curation.cjs` 的資料選擇、`data/words.v1.json`、假名／代表詞配置及 `generated/kana-data.js` 的資料內容）以 CC BY-SA 4.0 提供，變更為選詞、繁中編輯、來源連結、分類與第一版範圍。既有 App 程式碼不藉此改換授權。

## 已查核但未匯入

| 專案／官方來源 | 查核結果 | 這次的決策 |
|---|---|---|
| [Japanese Learning Datasets](https://github.com/allenlu2009/japanese-learning-datasets) | README 提供平片假名、約8,000詞，倉庫標示 MIT | 保留作備選；不重複匯入另一套相近詞庫，現有源已足夠第一版 |
| [tbroadley/duolingo_anki](https://github.com/tbroadley/duolingo_anki) | README 以已登入 Words 頁的 learned-lexemes 請求匯出 | 僅記錄方法；沒有在使用者帳號測試，也沒有拿個人驗證資料 |
| [kammartina/Duolingo_Words_Export](https://github.com/kammartina/Duolingo_Words_Export) | README 有 CSV 匯出與瀏覽器腳本，依賴個人已登入驗證 | 作未來個人匯出參考；未複製其程式，也不把它當穩定官方 API |
| [JLPT 官方 FAQ](https://www.jlpt.jp/e/faq/index.html)「Why is Test Content Specifications no longer available...」 | 2010 改版後未公開列出詞彙、漢字、文法的固定出題清單 | N5／N4／N3 僅當社群近似難度，不標成官方必考詞 |

來源倉庫的當前 README 或社群匯出方法，不能代替這個使用者的個人詞表。之後拿到個人匯出再做去重、缺讀音複核與人工選詞。
