# 真人五十音錄音

44 個清音，對應基本表的 `kind: basic`；平片假名共用聲音。ん／を 繼續使用整詞／句子示範，不列為普通清音聽音題。

作者：[Hakatanoshio117117](https://commons.wikimedia.org/wiki/User:Hakatanoshio117117)。來源：Wikimedia Commons；各檔作者均將錄音釋出至 **公共領域（PD-self）**。作者與完整原始連結保存在 `manifest.json`，每個檔案的原始 metadata 在 `source-metadata.json`。か、そ 的檔名為 Ja-Ka.oga、Ja-So.oga，其他相關錄音可從[作者假名錄音集](https://commons.wikimedia.org/wiki/Category:Audio_files_of_hiragana_(set_by_Hakatanoshio117117))查看。

- `original/`：未改動的下載來源快照，包含 Ogg 原檔與 Commons 官方 MP3 轉碼副本；格式逐檔列明。
- `mp3/`：供 App 使用；單聲道、44.1 kHz、64 kbps MP3，經響度正規化，完整保留原錄音。
- `manifest.json`：來源格式、來源位元組 SHA-1、Commons 原檔 SHA-1、處理後 MP3 SHA-256 與時長分開記錄。

部分原錄音重複同一個假名。錄音未從一般單字剪出，也未合成或拼接新音。轉碼／響度調整不改變音值；真人 iPhone 聽感仍須實測。

`node kana-rebuild/tools/build-audio.cjs` 在沒有網路的情況下核對來源與 MP3 雜湊、生成內嵌資料。正常 `./build.sh` 已自動執行。重新取得來源才需 `python3 kana-rebuild/tools/fetch-audio.py`（Python、curl、ffmpeg、ffprobe），下載工具保存／核對逐檔授權並遵守限流。上游更新請先審閱來源 metadata，再刻意更新快照。
