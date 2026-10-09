# 五十音重建 1.1：教材資料包

> **2026-10-09：** 真人錄音已移除（bd8d47e），基本假名改用手機內建日文語音。下表中 `audio/`、`generated/kana-audio.js`、`tools/build-audio.cjs`、`tools/fetch-audio.py` 各列與建置說明裡的錄音步驟為歷史紀錄，檔案已不在倉庫。

這個資料夾是同 App 五十音模組的教材來源與施工交接。更新日期：2026-10-07。原版 UI 已於 `8253560` 完成；本次沿用介面，擴充至 324 詞並接入 44 個真人單音。最新更新與發布驗收見 [UPDATE_1.1.md](UPDATE_1.1.md)。

先讀 [1.1 更新交接](UPDATE_1.1.md)；[原企劃](CLAUDE_IMPLEMENTATION_PLAN.md) 保留作設計背景，使用者閱讀版是 [READING_VERSION.md](READING_VERSION.md)。

## 檔案

| 檔案 | 用途 |
|---|---|
| `curation.cjs` | 原版人工選詞與 46 組配置；合併 `expansion.cjs` 的 178 個新詞，保留所有舊 ID |
| `expansion.cjs` | 178 個新旅行／日常詞與追加配置，沿用原 W() 契約 |
| `audio/manifest.json`、`audio/source-metadata.json` | 44 個真人單音的逐檔來源、作者、授權、音訊雜湊 |
| `audio/original/`、`audio/mp3/` | Commons 原檔／官方轉碼快照與供 App 使用的 MP3 |
| `generated/kana-audio.js`、`tools/build-audio.cjs` | 本地 MP3 的離線內嵌資料與建置工具 |
| `legacy-readings.cjs` | 舊 B 字庫的 79 筆人工假名讀音；不從羅馬拼音逆推 |
| `source-lock.json` | 上游版本與來源檔案 SHA-256；來源改變必須先重新審閱 |
| `data/kana-basic.v1.json` | 46 組基本平片假名、五欄座標、音值、特殊字、易混字組 |
| `data/words.v1.json` | 324 個代表詞，正常寫法、讀音、拼音、繁中、來源、近似 JLPT 標籤 |
| `data/anchors.v1.json` | 92 個格子的 325 個代表詞連結、讀音高亮範圍、出題限制 |
| `data/app-corpus.v1.json` | 732 筆來源快照，完整保留單字／句塊層級；74 筆需要讀音複核 |
| `data/duolingo-visible.v1.json` | 7 個真正可從截圖確認的詞；記錄 820 總數、課程進度和匯出狀態 |
| `data/sources.v1.json` | 來源、版本、授權、資料取得狀態 |
| `data/manifest.v1.json` | 實際數量與資料包狀態；由工具生成 |
| `vendor/openjlpt/n5.json`、`n4.json`、`n3.json` | 2,963 筆未改動的完整上游 JSON，包含英文詞義、讀音、例句等 |
| `vendor/openjlpt/LICENSE`、`NOTICE.md`、`meta.json` | 原始授權、上游歸屬與版本資訊 |
| `generated/kana-data.js` | 第一版直接內嵌的資料，名稱 `globalThis.KANA_REBUILD_DATA`；沒有執行 UI |
| `tools/kana-utils.cjs` | 假名正規化、振假名抽取、第一假名／第一拍辨識、高亮座標 |
| `tools/build-data.cjs` | 重建 JSON 與內嵌資料；不改現有 App |
| `tools/validate.cjs` | 結構、來源、讀音分類、特殊字、內嵌內容驗證與必要回歸案例 |

## 使用

```sh
node kana-rebuild/tools/build-data.cjs
node kana-rebuild/tools/validate.cjs
./build.sh
```

正常建置無新增套件，也不需開放網路。真人錄音已下載；維護者需要重新取得來源時才用 `tools/fetch-audio.py`（需 Python、curl、ffmpeg、ffprobe）。`build-data.cjs` 會檢查來源雜湊，輸出七個 JSON 與一個內嵌 JS。相同來源與選詞重跑，結果相同。

`./build.sh` 已接上教材／音訊生成步驟，把 `generated/kana-data.js` 與 `generated/kana-audio.js` 內嵌在 `src/kana.js` 之前，供現有 UI 使用。**不要讓手機執行時 fetch GitHub 或這些 JSON**：現有 App 需要根目錄 `index.html` 單檔也能打開。原始擴充字庫暫不全部包進第一版。

## 資料契約

### 基本假名

`kana.id` 是穩定的聲音／格子 ID，如 `shi`、`tsu`、`wo`。`wo` 的拼音是 `o`；ID 為了區分「お」和「を」而保留。`row`、`column` 是五欄表位置，や行與わ行空位保持空白，不補已不常用的 ゐ／ゑ。

`kind` 為 `basic`／`particle`／`nasal`。`speechText` 為播放基本音的假名；ん 為 `null`，請用該格整詞情境播放。`audioAnswerGroup` 合併同音：お、を 同屬 `o`，不能讓其中一個當另一個的唯一錯誤選項。

### 起步詞

`word` 是正常日文；`reading` 保留適當的平片假名；`readingHiragana` 供統一索引。卡片用代表詞連結的 `displayedReading` 顯示該模式的讀音。`romaji` 是編輯確認的輔助拼音，長音採雙母音形式（例如 kaado、kankou），不是考核主體。原始 App 的不同拼音寫法保留於來源快照。

`firstKana` 是正規化讀音中的第一個假名字形；`firstMora` 保留小字組合，所以 りょこう 是 `firstKana: り`、`firstMora: りょ`。清音、濁音、小字與長音符不互相抹掉。`basicHeadEligible` 只容許可讀、第一拍為單一基本清音、且不是 ん／を 的字首例子。

`provenance` 保存來源位置。`familiarityEvidence` 是 `present_in_existing_app`／`seen_in_duolingo_screenshot`／`new_supplement`，只表示接觸證據，**不表示已會**。全部 `learningStatus` 為 `not_assessed`。`aliases` 保留截圖的平假名寫法，例如 おもい。

`jlptApprox`／`jlptRefs` 是可選的社群難度資訊，來源為 OpenJLPT，不是正式考試清單。繁中詞義與備註為本次編輯，`meaningReview: editorial_zh_TW`。上游英文整庫尚未逐筆翻譯成繁中，不能直接當作繁中正式教材。

### 代表詞連結

`anchors.key` 例：`hira:e`、`kata:e`。各自追蹤學習進度，即使聲音相同，也不能由平假名通過直接判片假名熟練。

| `matchType` | 出題與顯示規則 |
|---|---|
| `head` | 一般字首；可做讀音第一假名題。`eligibleForAudioHead: true` 只表示可用基本單音命題，不代表附有切好的單音音檔 |
| `head_extension` | 讀音第一字屬這格，但第一拍有小字；可做字形定位，禁止把整詞第一拍当成單獨基本音 |
| `contains_n` | 問字中／字尾哪個是 ん／ン；不問第一音 |
| `particle_context` | 用整句教 を 與發音 o；不做普通字首題 |
| `contains_rare_katakana` | ム 的 ハム 字中例；問找字，不問第一音。新增 ムービー／ムード 的字首例則使用 `head` |

`targetSpan` 是 **NFKC 正規化後 `displayedReading` 的 Unicode code-point 半開區間** `[start,end)`。實作請用 `Array.from()` 切片，再逐段轉義輸出，勿拿字串或原始漢字的索引套用。現有資料的目標都是一個 code point。

`kata:wo` 是 `reference_only`，沒有代表詞，連到 `hira:wo`。全表 92 格中，91 格可練習，ヲ 配對認識不算一般必考格。每格最多 4 個候選，卡片先顯示兩個，其他可展開；基本 ID、schemaVersion 和 `S.kana` 存檔契約不變。

### 原始教材快照

`app-corpus` 逐筆保留 79 個舊積木、584 個句塊、48 個口語句子、21 個非成人詞義。它是來源素材，不是 732 個獨立單字；不可直接全部當代表詞。詞義、語體仍需依實際情境使用。

來源有數字、拉丁字或未解讀漢字時 `readable:false`。這次 74 筆先保留待複核，不自動推讀音，不進基本音題。現有教材的單獨助詞也標記 `particle`，避免把 は 的 wa 用法混到 ha 的基本詞。

### 後續個人單字匯入

建議匯入交換格式為 JSON：

```json
{"schemaVersion":1,"source":"user_export","words":[{"word":"駅","reading":"えき","meaningZh":"車站"}]}
```

按正常寫法、讀音和詞義去重；匯入前預覽新增／重複／缺讀音筆數。缺讀音或詞義進待確認，不能憑漢字或拼音猜。此匯入是第二階段，不阻擋第一版。資料不帶帳號 Cookie、Token 或課程自動推算的「已學」標籤。

來源查核與授權見 [ATTRIBUTION.md](ATTRIBUTION.md)。
