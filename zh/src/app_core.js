/* ===== 明白：核心（存檔、注音、語音、資料） ===== */
const KEY = 'mingbai-zh-v1';
const HAN = /[㐀-鿿]/;
function DEF() {
  return { v: 1, set: { my: true, zy: true, size: 'm', theme: 'auto', voice: '', rate: 1, auto: true },
    track: null, w: {}, talk: {}, run: null, day: null, units: {}, scr: {}, seen: [], sessions: [], pstat: {}, prSet: { skill: 'listening', mode: 'guided', level: 'B1', count: 10, sec: 15 }, log: {} };
}
function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
  const d = DEF();
  if (!s || typeof s !== 'object') return d;
  for (const k in d) if (s[k] === undefined) s[k] = d[k];
  for (const k in d.set) if (s.set[k] === undefined) s.set[k] = d.set[k];
  for (const k in d.prSet) if (s.prSet[k] === undefined) s.prSet[k] = d.prSet[k];
  return s;
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

/* ---- 小工具 ---- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => Date.now();
function today(t) { return new Date((t || now()) + 8 * 3600e3).toISOString().slice(0, 10); }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function plain(t) { return String(t || '').replace(/\*\*/g, ''); }
function spoken(t) { return plain(t).replace(/（[^）]*）/g, '').replace(/[～~]/g, '，'); }
function toast(msg) {
  const old = $('.toast'); if (old) old.remove();
  const d = document.createElement('div'); d.className = 'toast fade'; d.textContent = msg; document.body.appendChild(d);
  setTimeout(() => d.remove(), 2200);
}

/* ---- 注音：<ruby>；顯示／隱藏只靠 CSS，不用重畫 ---- */
function zy(text) {
  text = String(text == null ? '' : text);
  const p = plain(text);
  const r = READ[p];
  const toks = r ? r.split(' ') : null;
  let out = '', ti = 0, hl = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '*' && text[i + 1] === '*') { out += hl ? '</span>' : '<span class="hl">'; hl = !hl; i++; continue; }
    const ch = text[i];
    if (HAN.test(ch) && (toks || CHREAD[ch])) {
      let t = toks ? (toks[ti++] || '') : CHREAD[ch];
      if (t.endsWith('˙')) t = '˙' + t.slice(0, -1);
      out += '<span class="zc">' + ch + '<span class="zt">' + t + '</span></span>';
    } else out += esc(ch);
  }
  if (hl) out += '</span>';
  return '<span class="z">' + out + '</span>';
}
function myt(text) { // 緬文（** 標記變粗體）
  return esc(text).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*\*/g, '');
}
/* T(中文, 緬文)：介面標籤。中文有注音，緬文可整體隱藏 */
function T(zh, my) { return zy(zh) + (my ? '<small class="my" lang="my">' + esc(my) + '</small>' : ''); }
function MY(text, cls) { // 可「點一下看緬文」的緬文段落
  return '<span class="myw ' + (cls || '') + '"><button class="reveal my-reveal" data-a="reveal">' + zy('看緬文') + '</button><span class="my" lang="my">' + myt(text) + '</span></span>';
}
const ZY = zy;

/* ---- 語音：手機內建中文語音（優先 zh-TW）；單字用真人錄音 ---- */
const TTS = { ok: 'speechSynthesis' in window, voices: [], seq: 0, watch: null, speaking: false };
function loadVoices() { if (!TTS.ok) return; TTS.voices = speechSynthesis.getVoices().filter(v => /^(zh|cmn)/i.test(v.lang)); }
if (TTS.ok) { loadVoices(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', loadVoices); }
function pickVoice() {
  const z = TTS.voices;
  return z.find(v => v.voiceURI === S.set.voice) || z.find(v => /zh[-_]TW/i.test(v.lang)) || z.find(v => /Hant|Taiwan/i.test(v.lang + v.name)) || z[0] || null;
}
function stopAll() {
  TTS.seq++; if (TTS.watch) clearTimeout(TTS.watch);
  if (TTS.ok) try { speechSynthesis.cancel(); } catch (e) { }
  TTS.speaking = false;
  if (AUD.el) { try { AUD.el.pause(); } catch (e) { } }
}
function speak(text, rate, onEnd) {
  stopAll();
  const seq = TTS.seq;
  text = spoken(text);
  if (!TTS.ok || !text) { onEnd && onEnd(false); return; }
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(); if (v) u.voice = v;
  u.lang = v ? v.lang : 'zh-TW'; u.rate = (rate || 1) * (S.set.rate || 1); u.pitch = 1;
  let settled = false;
  const done = ok => { if (settled || seq !== TTS.seq) return; settled = true; clearTimeout(TTS.watch); TTS.speaking = false; document.body.classList.remove('speaking'); onEnd && onEnd(ok); };
  u.onstart = () => { if (seq !== TTS.seq) return; TTS.speaking = true; clearTimeout(TTS.watch); TTS.watch = setTimeout(() => { done(true); }, Math.max(15000, text.length * 700 / (u.rate || 1) + 6000)); };
  u.onend = () => done(true);
  u.onerror = e => done(e && e.error === 'interrupted' ? false : false);
  TTS.watch = setTimeout(() => { if (!TTS.speaking) { done(false); try { speechSynthesis.cancel(); } catch (e) { } } }, 8000);
  try { speechSynthesis.resume(); speechSynthesis.speak(u); } catch (e) { done(false); }
}
const AUD = { el: null };
function playWord(w, onEnd) {
  if (!w) return;
  if (w.au && !MISSING_AUDIO.has(w.au)) {
    stopAll();
    if (!AUD.el) AUD.el = new Audio();
    const a = AUD.el; let fired = false;
    const fin = ok => { if (fired) return; fired = true; onEnd && onEnd(ok); };
    a.onended = () => fin(true);
    a.onerror = () => { MISSING_AUDIO.add(w.au); speak(w.zh, 1, onEnd); fired = true; };
    a.src = 'audio/' + w.au;
    const p = a.play(); if (p && p.catch) p.catch(() => { if (!fired) { fired = true; speak(w.zh, 1, onEnd); } });
  } else speak(w.zh, 1, onEnd);
}
const SFX = {};
function sfx(name) { try { const a = SFX[name] || (SFX[name] = new Audio('audio/' + name + '.mp3')); a.currentTime = 0; a.volume = .6; a.play().catch(() => { }); } catch (e) { } }
const MISSING_AUDIO = new Set();

/* ---- 資料 ---- */
const WORDS = {};
const BOOKS = [];
const SCENE_NAMES = { School: '學校', Office: '辦公室', Factory: '工廠', Restaurant: '餐廳', Salon: '美髮店', Customs: '海關・機場', ARC: '居留證', Majors: '科系', 'Job Titles': '職業', Weather: '天氣', Hospital: '醫院', Sports: '運動', Food: '食物', Festivals: '節日', Document: '文件・手續' };
(function buildData() {
  CHIN.words.forEach(w => { WORDS['c' + w.id] = { id: 'c' + w.id, zh: w.zh, my: w.myn, ex: w.sentenceZH, exMy: w.sentenceMYN, au: w.audioZH, src: 'c' }; });
  CHIN.groups.forEach((g, gi) => {
    const ws = CHIN.words.filter(w => w.id >= g.start && w.id <= g.end);
    const en = g.title.replace(/\s*\(.*$/, '').trim();
    const myName = (g.title.match(/\(([^)]*)\)/) || [])[1] || '';
    const tocfl = /^TOCFL/.test(g.title);
    const units = [];
    for (let i = 0; i * 10 < ws.length && i < g.subUnits.length; i++) {
      units.push({ key: 'g' + gi + 'u' + i, title: g.subUnits[i], ids: ws.slice(i * 10, i * 10 + 10).map(w => 'c' + w.id) });
    }
    BOOKS.push({ id: 'g' + gi, kind: tocfl ? 'tocfl' : 'scene', zh: tocfl ? g.title : (SCENE_NAMES[en] || en), en: en, my: myName, color: g.color, units: units, src: 'c' });
  });
  const MLV = ['A1', 'A2', 'B1', 'B2'];
  MING.words.forEach(w => { WORDS['m' + w.id] = { id: 'm' + w.id, zh: w.cn, my: w.my, ex: w.examples[0].cn, exMy: w.examples[0].my, ex2: w.examples[1], note: w.note, lv: w.level, src: 'm' }; });
  MLV.forEach(lv => {
    const ws = MING.words.filter(w => w.level === lv);
    const units = [];
    for (let i = 0; i * 12 < ws.length; i++) units.push({ key: 'm' + lv + i, title: lv + (ws.length > 12 ? ' · ' + (i + 1) : ''), ids: ws.slice(i * 12, i * 12 + 12).map(w => 'm' + w.id) });
    BOOKS.push({ id: 'm' + lv, kind: 'ming', zh: '明朗 ' + lv, my: '', units: units, src: 'm' });
  });
  UI_RAW.forEach(r => { WORDS['u' + r[0]] = { id: 'u' + r[0], zh: r[1], my: r[2], what: r[3], whatZh: r[4], cat: r[5], ex: r[6], exMy: r[7], src: 'u' }; });
  Object.keys(UI_CATS).forEach(c => {
    BOOKS.push({ id: 'ui-' + c, kind: 'ui', zh: UI_CATS[c][0], my: UI_CATS[c][1], units: [{ key: 'ui-' + c, title: UI_CATS[c][0], ids: UI_RAW.filter(r => r[5] === c).map(r => 'u' + r[0]) }], src: 'u' });
  });
  TALK.forEach(sc => sc.words.forEach((w, i) => { WORDS['s' + sc.id + i] = { id: 's' + sc.id + i, zh: w[0], my: w[1], note: w[2] || '', src: 's', scene: sc.id }; }));
})();
const book = id => BOOKS.find(b => b.id === id);

/* ---- 間隔複習（明朗中文的做法）：記得 → 1/3/7/14/30 天；忘了 → 10 分鐘後 ---- */
const GAPS = [0, 1, 3, 7, 14, 30];
function ws(id) { return S.w[id] || (S.w[id] = { s: 0, d: 0, r: 0, star: 0, n: 0, seen: 0 }); }
function mark(id, known) {
  const st = ws(id); const t = now();
  st.seen = st.seen || t;
  if (known) { st.s = Math.min((st.s || 0) + 1, 5); st.d = t + GAPS[st.s] * 86400e3; }
  else { st.s = 0; st.d = t + 10 * 60e3; st.n = (st.n || 0) + 1; }
  st.r = t; logToday('w');
}
function due(id) { const st = S.w[id]; return st && st.seen && st.d <= now(); }
function logToday(k) { const d = today(); S.log[d] = S.log[d] || {}; S.log[d][k] = (S.log[d][k] || 0) + 1; }

/* ---- 畫面登記 ---- */
const VIEWS = {}, SHEETS = {};
const NAV = { tab: 'today', stack: [], sheet: null, wtab: 'scene' };
