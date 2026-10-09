#!/bin/sh
# 準備離線日文 TTS（Debian/Ubuntu）：Open JTalk + naist-jdic + HTS 聲音 Mei（CC BY 3.0）。
# 聲音檔放在倉庫外（預設 /workspace/tts），不提交進 git。
set -e
DEST=${TTS_DIR:-/workspace/tts}
sudo apt-get install -y open-jtalk open-jtalk-mecab-naist-jdic ffmpeg
mkdir -p "$DEST" && cd "$DEST"
[ -f mmd.zip ] || curl -fL -o mmd.zip "https://sourceforge.net/projects/mmdagent/files/MMDAgent_Example/MMDAgent_Example-1.8/MMDAgent_Example-1.8.zip/download"
echo "f702f2109a07dca103c7b9a5123a25c6dda038f0d7fcc899ff0281d07e873a63  mmd.zip" | sha256sum -c -
python3 -c "import zipfile;z=zipfile.ZipFile('mmd.zip');[z.extract(n,'.') for n in z.namelist() if '/Voice/mei/' in n]"
echo "b19e8e5ddef4d9d9559d654f395818e2bb3c0bbdbbca533f96086de21ac5db2b  MMDAgent_Example-1.8/Voice/mei/mei_normal.htsvoice" | sha256sum -c -
echo "OK：OJT_VOICE=$DEST/MMDAgent_Example-1.8/Voice/mei/mei_normal.htsvoice"
