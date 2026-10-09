# 「今天 5 分鐘」一鍵首頁：設計與施工狀態

## 目標
首頁只有一個大按鈕。按下去依序自動走完：**到期複習 → 一段對話 → 五個假名**。其他所有入口收在首頁「全部」（預設收合）。同一個 App、同一個入口，不另開 App。

## 已實作（第一版，最小改動）
| 檔案 | 改動 |
|---|---|
| `src/today5.js`（新） | 流程狀態、`t5Go()`、`t5After()`、首頁卡片 `t5CardHtml()` |
| `src/app.js` | `vHome()` 最上面放卡片，原本內容整段包進 `<details id="homeAll">全部</details>`；`endSession()` 結束句塊複習時通知流程；事件 `t5Go` |
| `src/run.js` | `closeRunView()` 通知流程（有走到結局才算完成） |
| `src/kana.js` | `knNext()` 一輪做完時設 `KG.roundDone`；`knClose()` 通知流程 |
| `build.sh` | 在 `src/kana.js` 之後、`src/app.js` 之前加入 `src/today5.js` |
| `tools/test-today5.cjs`（新） | Playwright 回歸測試 |

### 每一步用的現有模組
1. **到期複習**：`ckDue()` 有到期句塊 → `startCkReview()`（看字／聽音分開記）。沒有到期就記「跳過」直接下一步。
2. **一段對話**：有中斷的 `S.run` → `resumeRun()`；否則 `recommend()` → `startRun()`。走到 `end` 節點並關掉結局畫面才算完成。
3. **五個假名**：`knOpen('go')`（有沒做完的一輪就接續，否則 `knStartRound()`）。整輪做完再關才算完成。

完成一步 → 0.45 秒後自動開下一步並提示「第 N 步：…」。中途按 ✕ → 流程暫停，首頁按鈕變成「繼續・第 N/3 步」。三步都完成 → 「再來一輪」。

### 進度怎麼保住
- 所有學習紀錄仍由原模組寫進 `bnk-state-v1`（`S`），**格式完全沒變**，雲端同步也沒變。
- 流程自己只存 `localStorage['bnk-today5-v1'] = {d:'YYYY-MM-DD', step, on, log}`，跨日自動歸零；壞掉或被清掉只會從第 1 步重來。測試確認 `bnk-state-v1` 裡不會多出流程欄位。

## 還沒做（下一版）
- **鎖屏聽力**：把 `oral-audio/batch01` 的 MP3 接進 App（`<audio>` 元素 + `navigator.mediaSession` 標題／上一句／下一句），因為 Web Speech 在 iPhone 鎖屏時不播。建議：先做「全部 → 鎖屏聽」一個播放 `batch01_playlist.mp3` 的頁面；再考慮把第 2 步改成「一段對話 or 一段鎖屏聽」。MP3 原始大小：60 個單句共 1.7 MB、連播檔 2.1 MB；內嵌成 base64 約再大三分之一（約 2.3 MB／2.8 MB）；要先決定是內嵌還是旁邊放檔案。
- 到期複習目前只看日文句塊；英文到期字（`enDue()`）仍在「全部 → 英文」。若想一起排進 5 分鐘，可以在第 1 步沒有句塊時改跑 `startEn()`。
- 五十音一輪中按 ✕ 會先回假名表（原本行為），再按 ✕ 才回首頁。
- 實機（iPhone）尚未驗證。
