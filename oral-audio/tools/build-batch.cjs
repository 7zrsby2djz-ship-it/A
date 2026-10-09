#!/usr/bin/env node
// 鎖屏聽力音檔：從 App 教材來源組句 → Open JTalk 離線合成 → MP3 + manifest.json
// 用法：node oral-audio/tools/build-batch.cjs [batch01]
//   需要：open_jtalk（apt: open-jtalk open-jtalk-mecab-naist-jdic）、ffmpeg（libmp3lame）、
//         HTS 聲音檔 mei_normal.htsvoice（MMDAgent_Example-1.8，CC BY 3.0）。
//   環境變數：OJT_VOICE（.htsvoice 路徑）、OJT_DIC（naist-jdic 路徑）。
// 只產生 oral-audio/<batch>/ 底下的檔案；不碰 index.html、.generated.*、kana-rebuild/audio。
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..', '..'), HERE = path.resolve(__dirname, '..');
const batch = process.argv[2] || 'batch01';
const sel = JSON.parse(fs.readFileSync(path.join(HERE, batch + '.selection.json'), 'utf8'));
const OUT = path.join(HERE, batch), MP3 = path.join(OUT, 'mp3'), TMP = fs.mkdtempSync('/tmp/oral-audio-');
const VOICE = process.env.OJT_VOICE || '/workspace/tts/MMDAgent_Example-1.8/Voice/mei/mei_normal.htsvoice';
const DIC = process.env.OJT_DIC || '/var/lib/mecab/dic/open-jtalk/naist-jdic';
for (const f of [VOICE, DIC]) if (!fs.existsSync(f)) { console.error('缺少：' + f + '（見 oral-audio/README.md）'); process.exit(2); }

// --- 讀教材（與 App 相同的來源） ---
const ctx = {}; vm.createContext(ctx);
vm.runInContext(['src/data_tasks.js', 'src/data_life.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n') + '\n;this.CK=CK;this.TASK=TASK;', ctx);
const {CK, TASK} = ctx;
const plain = s => s.replace(/\{([^|{}]+)\|[^{}]+\}/g, '$1');
const spoken = s => s.replace(/\{[^|{}]+\|([^{}]+)\}/g, '$1');   // = App 的 spokenJp()
function resolve(it) {
  if (it.chunk) { const k = CK[it.chunk]; if (!k) throw Error('no chunk ' + it.chunk);
    return {id:'ck-' + k.id, src:{chunk:k.id}, chunks:[k.id], who:'你', kind:'say', zh:k.zh}; }
  const t = TASK[it.task]; if (!t) throw Error('no task ' + it.task);
  const v = Object.values(t.v).flat().find(x => x.id === it.variant); if (!v) throw Error('no variant ' + it.variant);
  const n = v.nodes[it.node]; if (!n || !n.c) throw Error('no node ' + JSON.stringify(it));
  return {id:`${it.task}-${it.variant}-${it.node}`, src:{task:it.task, variant:it.variant, node:it.node, level:v.lv, taskName:t.name},
    chunks:n.c, who:n.t === 'say' ? '你' : (n.who || v.who || '對方'), kind:n.t, zh:n.zh};
}

// --- 讀音檢查：漢字版若被 Open JTalk 讀錯（例：金閣寺道→キンカクジドウ），逐段換成教材的假名讀音 ---
const sh = (cmd, args, input) => cp.execFileSync(cmd, args, {input, stdio:['pipe', 'pipe', 'pipe']}).toString();
function jtReading(text) {
  const tf = path.join(TMP, 'trace.txt'); sh('open_jtalk', ['-x', DIC, '-m', VOICE, '-ow', '/dev/null', '-ot', tf], text);
  const tr = fs.readFileSync(tf, 'utf8'); if (!tr.includes('[Text analysis result]')) throw Error('Open JTalk trace 讀不到：' + text);
  const rows = tr.split('[Output label]')[0].split('\n').slice(1).filter(Boolean).map(l => l.split(','));
  return rows.filter(r => r[1] !== '記号').map(r => r[8]).join('').replace(/’/g, '');   // 第 9 欄＝讀音（不是發音欄，避免ー／イ的假差異）
}
const norm = s => { if (!s) throw Error('空讀音'); return s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60)).replace(/[、。？！…・\s,.?!]/g, ''); };
function ttsText(raw) {
  const segs = raw.split(/(\{[^|{}]+\|[^{}]+\})/).filter(Boolean);
  const want = norm(jtReading(spoken(raw)));
  const make = useKana => segs.map((s, i) => { const m = s.match(/^\{([^|]+)\|(.+)\}$/); return m ? (useKana.has(i) ? m[2] : m[1]) : s; }).join('');
  const kana = new Set();
  if (norm(jtReading(make(kana))) === want) return {text:make(kana), mode:'kanji'};
  segs.forEach((s, i) => { if (/^\{/.test(s) && norm(jtReading(make(kana))) !== want) {
    const before = norm(jtReading(make(kana))); kana.add(i);
    if (norm(jtReading(make(kana))) === before) kana.delete(i); } });     // 只保留真的有修正的替換
  if (norm(jtReading(make(kana))) === want) return {text:make(kana), mode:'mixed', kanaSegments:[...kana].map(i => segs[i])};
  return {text:spoken(raw), mode:'kana'};
}

// --- 合成 ---
function synth(text, wav, speed) { sh('open_jtalk', ['-x', DIC, '-m', VOICE, '-r', String(speed), '-ow', wav], text); }
function toMp3(wav, mp3) { sh('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k', mp3]); }
const dur = f => +(+sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f])).toFixed(3);
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

fs.rmSync(OUT, {recursive:true, force:true}); fs.mkdirSync(MP3, {recursive:true});
const items = [], seen = new Set();
sel.items.forEach((it, i) => {
  const r = resolve(it); if (seen.has(r.id)) throw Error('duplicate ' + r.id); seen.add(r.id);
  const raw = r.chunks.map(id => CK[id].jp).join('');
  const tts = ttsText(raw);
  const no = String(i + 1).padStart(2, '0'), base = `${no}_${r.id}`;
  const files = {};
  for (const [k, speed] of [['normal', 1.0], ['slow', 0.8]]) {
    const wav = path.join(TMP, `${base}_${k}.wav`), mp3 = path.join(MP3, `${base}${k === 'slow' ? '_slow' : ''}.mp3`);
    synth(tts.text, wav, speed); toMp3(wav, mp3);
    files[k] = {file:path.relative(OUT, mp3), durationSeconds:dur(mp3), sha256:sha(mp3)};
  }
  items.push({n:i + 1, id:r.id, ja:plain(raw), jaRuby:raw, kana:spoken(raw), romaji:r.chunks.map(id => CK[id].ro).join(' '), zh:r.zh,
    speaker:r.who, nodeType:r.kind, source:r.src, chunks:r.chunks, ttsInput:tts.text, ttsReadingMode:tts.mode, ...(tts.kanaSegments ? {ttsKanaSegments:tts.kanaSegments} : {}), audio:files});
  console.log(no, r.id, tts.mode, files.normal.durationSeconds + 's', plain(raw));
});

// --- 鎖屏連播：每句 正常 → 慢速 → 正常，中間留空白讓你跟讀 ---
const gap = s => { const f = path.join(TMP, `gap${s}.wav`); if (!fs.existsSync(f)) sh('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono`, '-t', String(s), f]); return f; };
const list = [];
items.forEach(it => { const n = path.join(OUT, it.audio.normal.file), s = path.join(OUT, it.audio.slow.file);
  list.push(n, gap(1.2), s, gap(1.5), n, gap(2.5)); });
const listFile = path.join(TMP, 'list.txt');
fs.writeFileSync(listFile, list.map(f => `file '${f}'`).join('\n'));
const pl = path.join(OUT, `${batch}_playlist.mp3`);
sh('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-ar', '44100', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k',
  '-metadata', 'title=按鈕與積木 鎖屏聽力 ' + batch, '-metadata', 'artist=Open JTalk (HTS voice Mei)', pl]);

const manifest = {schemaVersion:1, batch, title:sel.title, generatedOn:new Date().toISOString().slice(0, 10),
  engine:{name:'Open JTalk', version:sh('dpkg-query', ['-W', '-f=${Version}', 'open-jtalk']).trim(), dictionary:'naist-jdic (open-jtalk-mecab-naist-jdic)',
    voice:'HTS Voice "Mei" mei_normal.htsvoice (MMDAgent_Example-1.8)', voiceSha256:sha(VOICE), voiceLicense:'CC BY 3.0, © 2009-2018 Nagoya Institute of Technology (MMDAgent Project Team)',
    speeds:{normal:1.0, slow:0.8}, encoding:'MP3 mono 44.1 kHz 64 kbps, loudnorm I=-16'},
  synthetic:true, caveat:'合成語音，不是真人錄音；未在 iPhone 實機試聽。漢字讀音已用教材振假名逐句比對（見 ttsReadingMode）。',
  playlist:{file:path.relative(OUT, pl), durationSeconds:dur(pl), sha256:sha(pl), pattern:'每句：正常 → 1.2 秒 → 慢速 → 1.5 秒 → 正常 → 2.5 秒'},
  items};
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.rmSync(TMP, {recursive:true, force:true});
console.log(`完成：${items.length} 句，連播 ${manifest.playlist.durationSeconds} 秒 → ${path.relative(ROOT, OUT)}`);
