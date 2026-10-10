# 音效（Kenney "Interface Sounds" 1.0，CC0）

來源：https://kenney.nl/assets/interface-sounds（授權見 `LICENSE-Kenney-CC0.txt`，CC0，不需標示，仍在此致謝 Kenney）。
原檔 OGG 已轉成單聲道 48 kbps MP3（舊 iOS 不保證能解 OGG）。`tools/build-sfx.cjs` 會把這裡的 `*.mp3` 轉成 base64，輸出 `src/sfx.generated.js`，由 build.sh 串進第一段 script（單檔、可離線）。

| 檔案 | 用途（`fx.sfx(kind)`） | 音量 |
|---|---|---|
| select_001.mp3 | `tap`：組句積木點選 | 0.2 |
| confirmation_001.mp3 | `ok`：答對 | 0.35 |
| error_008.mp3 | `bad`：答錯 | 0.25 |
| maximize_006.mp3 | `combo`：連對 3／5／10… | 0.3 |
| confirmation_004.mp3 | `done`：完成一課 | 0.35 |
