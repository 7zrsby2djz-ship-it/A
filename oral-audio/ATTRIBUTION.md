# 來源與授權（oral-audio）

這些 MP3 是**合成語音**，不是真人錄音。

- 合成引擎：Open JTalk 1.11（Debian 套件 `open-jtalk` 1.11-5），字典 naist-jdic（`open-jtalk-mecab-naist-jdic`）。Modified BSD license。
- 聲音：HTS Voice "Mei"（`mei_normal.htsvoice`，MMDAgent_Example-1.8 內附，version 1.5）。
  Copyright (c) 2009-2018 Nagoya Institute of Technology, Department of Computer Science（MMDAgent Project Team, http://www.mmdagent.jp/）。
  授權：Creative Commons Attribution 3.0（https://creativecommons.org/licenses/by/3.0/）。本專案產生的音檔為依該聲音合成的衍生作品，需保留此標示。
  `mei_normal.htsvoice` sha256：`b19e8e5ddef4d9d9559d654f395818e2bb3c0bbdbbca533f96086de21ac5db2b`
- 句子：本 App 原創教材（`src/data_tasks.js`、`src/data_life.js`）。
- 後製：ffmpeg loudnorm（I=-16 LUFS），MP3 單聲道 44.1 kHz 64 kbps。
