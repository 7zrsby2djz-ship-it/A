/* ================= utilities ================= */
const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.random() * a.length | 0];
const fmt = (t, args) => t.replace(/\{(\d)\}/g, (_, i) => args[i] ?? '');
function dayKey(t = Date.now()) { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function relDue(ts) { const d = ts - Date.now(); if (d <= 0) return '現在'; if (d < HOUR) return Math.ceil(d / MIN) + ' 分鐘後'; if (d < DAY) return Math.round(d / HOUR) + ' 小時後'; return Math.round(d / DAY) + ' 天後'; }

const IC = {
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></svg>',
  en:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="4"/><path d="M8 12h8"/></svg>',
  look:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/></svg>',
  jp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/><rect x="8" y="4" width="8" height="7" rx="1.5"/></svg>',
  me:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  speak:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 010 7"/><path d="M19 6a8.5 8.5 0 010 12"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
  starf:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
  chev:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
};

/* ================= data prep ================= */
const EN = {}, EN_ORDER = [];
EN_RAW.forEach(([id, w, zh, note, cat, f, exEn, exZh, al]) => { EN[id] = {id, w, zh, note, cat, f, exEn, exZh, al: al || [], groups: []}; EN_ORDER.push(id); });
EN.show.al.push('show');
for (const [gid, g] of Object.entries(GROUPS)) g.ids.forEach(id => EN[id] && EN[id].groups.push(gid));
// words that mean (almost) the same thing — never used as each other's wrong answer
const SYN = {retry:['tryagain','refresh'], tryagain:['retry'], run:['execute'], execute:['run'], continue:['proceed','next'], proceed:['continue'], next:['continue'],
  close:['dismiss'], dismiss:['close','gotit'], gotit:['dismiss'], view:['show','expand'], show:['expand','view'], expand:['show','view'], create:['new','add'], new:['create'], add:['create'],
  loading:['processing','inprogress','pending','thinking'], processing:['loading','inprogress','thinking'], inprogress:['processing','loading','pending'], pending:['waiting','inprogress','loading'], waiting:['pending'], thinking:['processing','loading'],
  complete:['done','success'], done:['complete'], success:['complete'], failed:['error','wrong'], error:['failed','wrong'], wrong:['error','failed'], connection:['network'], network:['connection'],
  unable:['failed'], limit:['usage'], usage:['limit'], access:['permission'], permission:['access'], cantundo:['sure'], sure:['cantundo','confirm'], confirm:['sure']};
const OPP = {allow:'deny', deny:'allow', approve:'reject', reject:'approve', accept:'decline', decline:'accept', confirm:'cancel', save:'discard', discard:'keep', keep:'discard', continue:'cancel', cancel:'continue',
  always:'once', once:'always', enable:'cancel', disable:'cancel', submit:'cancel', send:'cancel', apply:'cancel', delete:'cancel', remove:'cancel', proceed:'cancel', next:'back', back:'next', skip:'next', done:'back', retry:'cancel', upload:'cancel', replace:'keep'};
const PAT_MAP = Object.fromEntries(PAT.map(p => [p.id, p]));
const SCENE_MAP = Object.fromEntries(SCENES.map(s => [s.id, s]));

/* ================= state ================= */
const LSK = 'bnk-state-v1';
const DEF = () => ({v:1, updatedAt:0, created:Date.now(), settings:{romaji:true, read:'furi', dlgLen:1, dailyNew:5, rate:1, autoSpeak:true},
  en:{}, custom:{}, jp:{}, dlg:{}, dlgMiss:{}, jpw:{}, ck:{}, tk:{}, run:null, lsp:null, migDlg:0, jpConf:{}, scenes:{}, favs:[], pastes:[], log:{}, xp:0, streak:{n:0, last:''}, newDay:{d:'', n:0}, boost:[], again:{d:'', ids:[]}});
function migrate(o) { const d = DEF(); if (!o || typeof o !== 'object') return d; for (const k in d) if (o[k] === undefined) o[k] = d[k];
  const had = o.settings || {}; o.settings = Object.assign(d.settings, had); if (had.read === undefined) o.settings.read = had.romaji === false ? 'none' : 'furi'; return o; }
let S = DEF();
try { const raw = localStorage.getItem(LSK); if (raw) S = migrate(JSON.parse(raw)); } catch (e) {}
const UI = {tab:'home', enSeg:'lib', cat:'all', st:'all', jpSeg:'dlg', look:{text:'', res:null, ai:null, busy:false, err:''}};
try { const t = sessionStorage.getItem('bnk-tab'); if (t) UI.tab = t; } catch (e) {}

function getEn(id) { return EN[id] || S.custom[id]; }
function allEnIds() { return EN_ORDER.concat(Object.keys(S.custom)); }

/* ---- persistence: this browser immediately, the person's private cloud copy shortly after ---- */
const cloud = {doc:null, state:'local', writing:false, dirty:false, timer:0};
function saveLocal() { try { localStorage.setItem(LSK, JSON.stringify(S)); } catch (e) {} }
function persist() { S.updatedAt = Date.now(); saveLocal(); scheduleCloud(); }
function scheduleCloud(ms = 1500) { if (!cloud.doc) return; clearTimeout(cloud.timer); cloud.timer = setTimeout(pushCloud, ms); }
function trimForCloud() {
  let json = JSON.stringify(S);
  if (json.length > 230000) { S.pastes = S.pastes.slice(0, 8); const keys = Object.keys(S.log).sort(); keys.slice(0, Math.max(0, keys.length - 60)).forEach(k => delete S.log[k]); json = JSON.stringify(S); }
  return json;
}
async function pushCloud() {
  if (!cloud.doc) return;
  if (cloud.writing) { cloud.dirty = true; return; }
  cloud.writing = true; cloud.timer = 0;
  try { await cloud.doc.set({json: trimForCloud(), updatedAt: S.updatedAt}); cloud.state = 'cloud'; }
  catch (e) { cloud.state = 'err'; if (e && e.code === 'unavailable') setTimeout(() => scheduleCloud(0), 2500 + Math.random() * 2500); }
  finally { cloud.writing = false; if (cloud.dirty) { cloud.dirty = false; scheduleCloud(400); } refreshSync(); }
}
/* 口語聽力分頁的進度：和主進度分開，另存一份到帳號 */
const oralCloud = {doc:null, timer:0, writing:false, pending:null};
window.ORAL_CLOUD = {
  ready: () => !!oralCloud.doc,
  async get() { if (!oralCloud.doc) return null; const s = await oralCloud.doc.get(); if (!s.exists) return null; try { return JSON.parse(s.data().json); } catch (e) { return null; } },
  put(obj) {
    if (!oralCloud.doc) return;
    oralCloud.pending = JSON.stringify(obj); clearTimeout(oralCloud.timer);
    oralCloud.timer = setTimeout(async function flush() {
      if (oralCloud.writing) { oralCloud.timer = setTimeout(flush, 600); return; }
      const json = oralCloud.pending; if (!json) return; oralCloud.pending = null; oralCloud.writing = true;
      try { await oralCloud.doc.set({json, updatedAt:Date.now()}); } catch (e) {} finally { oralCloud.writing = false; }
    }, 1500);
  },
};
async function initCloud() {
  try {
    if (!window.claude || !window.claude.use) return;
    const user = await window.claude.use('user');
    if (!user) return;
    const uid = await user.id();
    if (!uid) return;
    const db = await window.claude.use('db');
    if (!db) return;
    cloud.doc = db.doc('data/users/' + uid + '/state');
    oralCloud.doc = db.doc('data/users/' + uid + '/oral');
    if (window.OralModule && window.OralModule.cloudReady) window.OralModule.cloudReady();
    const snap = await cloud.doc.get();
    let remote = null;
    if (snap.exists) { try { remote = JSON.parse(snap.data().json); } catch (e) {} }
    if (remote && (remote.updatedAt || 0) > (S.updatedAt || 0)) { S = migrate(remote); saveLocal(); buildIndex(); render(); if (SES) renderSes(); }
    else if (!remote || (remote.updatedAt || 0) < (S.updatedAt || 0)) scheduleCloud(0);
    cloud.state = 'cloud';
  } catch (e) { cloud.doc = null; cloud.state = 'local'; }
  refreshSync();
}
function refreshSync() { const el = $('#syncText'); if (el) el.innerHTML = syncText(); }
function syncText() {
  if (cloud.state === 'cloud') return '已存到你的 Claude 帳號，換手機或電腦打開也在。';
  if (cloud.state === 'err') return '這次沒同步成功，進度先存在這台裝置，下次會再同步。';
  return '進度存在這台裝置的瀏覽器裡。';
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && cloud.timer) { clearTimeout(cloud.timer); pushCloud(); } });

/* ================= learning engine ================= */
// stage → next review. 0-1 = "今天再遇到", 2-5 growing gaps, 6+ = mastered, rarely shown
const IV = [0, 10 * MIN, DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY, 90 * DAY];
function recOf(kind, id, create) { const m = kind === 'en' ? S.en : S.jp; if (!m[id] && create) m[id] = {s:0, due:0, ok:0, ng:0, lapse:0, conf:{}, t0:Date.now(), last:0, enc:0}; return m[id]; }
function grade(r, ok) {
  const t = Date.now();
  if (ok) { r.ok++; r.s = Math.min(7, r.s + 1); }
  else { r.ng++; if (r.s >= 2) r.lapse++; r.s = r.s >= 4 ? 2 : 1; }
  r.last = t; r.due = t + Math.round(IV[r.s] * (ok && r.s >= 2 ? 0.9 + Math.random() * 0.2 : 1));
}
function status(r) {
  if (!r) return 'new';
  if (r.known || r.s >= 6) return 'mast';
  const c = Object.values(r.conf || {}).reduce((a, b) => a + b, 0);
  if (c >= 2 && r.s < 5) return 'conf';
  if (r.s >= 3) return 'fam';
  return 'short';
}
const ST_LABEL = {new:'新', short:'短期記得', fam:'熟悉', mast:'已掌握', conf:'常搞混'};
const pill = st => `<span class="pill st-${st}">${ST_LABEL[st]}</span>`;
function coverage() {
  let tot = 0, got = 0;
  EN_ORDER.forEach(id => { const w = EN[id].f ** 2; tot += w; const r = S.en[id]; if (!r) return; if (r.known || r.s >= 3) got += w; else if (r.s >= 1) got += w * 0.4; });
  return tot ? got / tot : 0;
}
function L() { const k = dayKey(); return S.log[k] || (S.log[k] = {en:0, enOk:0, jp:0, jpOk:0, nw:0, look:0, xp:0}); }
function touchStreak() { const k = dayKey(); if (S.streak.last === k) return; S.streak.n = S.streak.last === dayKey(Date.now() - DAY) ? S.streak.n + 1 : 1; S.streak.last = k; }
function streakNow() { return (S.streak.last === dayKey() || S.streak.last === dayKey(Date.now() - DAY)) ? S.streak.n : 0; }
function level() { return Math.floor(Math.sqrt(S.xp / 40)) + 1; }
function lvProgress() { const l = level(), a = 40 * (l - 1) ** 2, b = 40 * l ** 2; return (S.xp - a) / (b - a); }
function addXp(n) { const b = level(); S.xp += n; L().xp += n; if (SES) SES.stats.xp += n; if (level() > b) setTimeout(() => toast('升級了！Lv ' + level() + '，積木塔又高一層'), 400); }
function newToday() { if (S.newDay.d !== dayKey()) S.newDay = {d:dayKey(), n:0}; return S.newDay.n; }
function againToday() { if (S.again.d !== dayKey()) S.again = {d:dayKey(), ids:[]}; return S.again.ids; }
function addAgain(id) { const a = againToday(); if (!a.includes(id)) a.unshift(id); if (a.length > 20) a.length = 20; }
function enDue() { const t = Date.now(); return allEnIds().filter(id => { const r = S.en[id]; return r && !r.known && r.s < 7 && r.due <= t; }).sort((a, b) => S.en[a].due - S.en[b].due); }
function jpDue() { const t = Date.now(); return PAT.filter(p => { const r = S.jp[p.id]; return r && r.s < 7 && r.due <= t; }); }
function newCandidates(extra = 0) {
  const boost = S.boost.filter(id => getEn(id) && !S.en[id]).slice(0, 3);
  const n = Math.max(0, S.settings.dailyNew - newToday()) + extra;
  const out = boost.slice();
  for (const id of EN_ORDER) { if (out.length >= boost.length + n) break; if (!S.en[id] && !out.includes(id)) out.push(id); }
  return out;
}

/* ================= speech (sound matters more than pictures here) ================= */
const canSpeak = 'speechSynthesis' in window;
let VOICES = [];
function loadVoices() { try { VOICES = speechSynthesis.getVoices(); } catch (e) {} }
if (canSpeak) { loadVoices(); try { speechSynthesis.onvoiceschanged = loadVoices; } catch (e) {} }
function speak(text, lang, rate, onend) {
  if (!canSpeak || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[（(].*?[）)]/g, ''));
    u.lang = lang; u.rate = (rate || (lang.startsWith('ja') ? 0.9 : 0.95)) * S.settings.rate;
    const v = VOICES.find(v => v.lang && v.lang.replace('_', '-').startsWith(lang)) || VOICES.find(v => v.lang && v.lang.startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    if (onend) { u.onend = onend; u.onerror = onend; }
    speechSynthesis.speak(u);
    return u;
  } catch (e) { if (onend) setTimeout(onend, 300); }
}
const spkBtn = (text, lang, label) => canSpeak ? `<button class="icon-btn speak" data-a="speak" data-v="${esc(text)}" data-l="${lang}" aria-label="${esc(label || '播放發音')}">${IC.speak}</button>` : '';

/* ================= English building blocks ================= */
function lookalikes(id, n) {
  const it = getEn(id), ban = new Set([id, ...(SYN[id] || [])]), pool = [];
  (it.groups || []).forEach(g => GROUPS[g].ids.forEach(x => { if (!ban.has(x) && !pool.includes(x)) pool.push(x); }));
  if (OPP[id] && !ban.has(OPP[id]) && !pool.includes(OPP[id])) pool.push(OPP[id]);
  let res = shuffle(pool).slice(0, n);
  const fill = list => { for (const x of shuffle(list)) { if (res.length >= n) break; if (!ban.has(x) && !res.includes(x) && getEn(x).zh !== it.zh) res.push(x); } };
  if (res.length < n) fill(allEnIds().filter(x => getEn(x).cat === it.cat));
  if (res.length < n) fill(EN_ORDER);
  return res;
}
function makeEnQ(id, force) {
  const it = getEn(id), r = S.en[id], scs = [];
  (it.groups || []).forEach(g => GROUPS[g].sc.forEach(s => { if (s[1] === id) scs.push([g, s[0]]); }));
  let mode = force || 'mean';
  if (!force) { if (r && r.s >= 1 && scs.length && Math.random() < 0.55) mode = 'sc'; else if (r && r.s >= 2 && Math.random() < 0.35) mode = 'zh2en'; }
  if (mode === 'sc' && scs.length) {
    const [g, text] = pick(scs);
    const others = shuffle(GROUPS[g].ids.filter(x => x !== id && !(SYN[id] || []).includes(x))).slice(0, 3);
    let opts = [id, ...others]; if (opts.length < 3) opts = opts.concat(lookalikes(id, 3 - opts.length).filter(x => !opts.includes(x)));
    return {mode:'sc', id, g, text, opts:shuffle(opts)};
  }
  return {mode: mode === 'sc' ? 'mean' : mode, id, opts: shuffle([id, ...lookalikes(id, 3)])};
}
function highlight(text, it) {
  const keys = [it.w, ...it.al].filter(Boolean).sort((a, b) => b.length - a.length);
  let out = esc(text);
  for (const k of keys) {
    const re = new RegExp('(' + esc(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i');
    if (re.test(out)) return out.replace(re, '<mark>$1</mark>');
  }
  return out;
}
function mockHtml(id) {
  const it = getEn(id);
  const same = it.exEn.replace(/[.!?…]/g, '').trim().toLowerCase() === it.w.toLowerCase();
  const showBtns = ['btn', 'decide'].includes(it.cat) || it.exEn.split(' ').length <= 2;
  const partner = OPP[id] && EN[OPP[id]] ? EN[OPP[id]].w : 'Cancel';
  const btnWord = same ? it.exEn.replace(/[…]/g, '') : it.w;
  return `<div class="mock" aria-label="介面示意">
    <div class="bar"><i></i><i></i><i></i></div>
    <div class="body">
      ${same && showBtns ? '<p class="muted small">畫面上出現一個按鈕：</p>' : `<p class="msg">${highlight(it.exEn, it)}</p>`}
      ${showBtns ? `<div class="btns">${partner.toLowerCase() !== btnWord.toLowerCase() ? `<span class="fakebtn">${esc(partner)}</span>` : ''}<span class="fakebtn main ring">${esc(btnWord)}</span></div>` : ''}
    </div></div>`;
}
function groupCmp(gid, meId) {
  const g = GROUPS[gid];
  return `<div class="cmp">${g.ids.map(x => `<span class="en ${x === meId ? 'me' : ''}">${esc(EN[x].w)}</span><span class="${x === meId ? 'me' : ''}">${esc(g.roles[x])}</span>`).join('')}</div>`;
}

/* ================= Japanese building blocks ================= */
function blk(id, o = {}) {
  const [jp, ro, zh, role] = B[id];
  return `<${o.tag || 'span'} class="blk role-${role} ${role === 'pt' ? 'pt' : ''} ${o.cls || ''}" ${o.attrs || ''}>${`<span class="ro">${esc(ro)}</span>`}<span>${esc(jp)}</span>${o.label ? `<span class="rl">${o.label === 'zh' ? esc(zh) : ROLES[role].n}</span>` : ''}</${o.tag || 'span'}>`;
}
function sentText(seq) { return seq.map(b => B[b][0]).join(''); }
function sentRo(seq) { return seq.map(b => B[b][1]).join(' '); }
function sentHtml(seq, label) { return `<div class="sent">${seq.map(b => blk(b, {label})).join('')}</div>`; }
function jline(jp, ro, big) { return `<div class="jline" data-a="peek" role="button" tabindex="0">${ro ? `<span class="ro">${esc(ro)}</span>` : ''}<span class="jp" ${big ? 'style="font-size:26px"' : ''}>${esc(jp)}</span></div>`; }
function patTask(pid) {
  const p = PAT_MAP[pid], seq = [], args = [];
  p.parts.forEach(part => { if (typeof part === 'string') seq.push(part); else { const b = pick(part.opt); seq.push(b); args.push(B[b][2]); } });
  const zh = fmt(p.zh, args), distract = [];
  const slots = p.parts.filter(x => typeof x !== 'string' && x.opt.some(o => !seq.includes(o)));
  if (slots.length) { const s = pick(slots); distract.push(pick(s.opt.filter(o => !seq.includes(o)))); }
  const pts = seq.filter(x => B[x][3] === 'pt');
  const wrongPts = ['ni', 'de', 'wo', 'wa', 'ga', 'kara', 'made'].filter(x => !pts.includes(x) && !(p.alt || []).includes(x));
  distract.push(pick(pts.length ? wrongPts.filter(x => ['ni','de','wo','wa','ga'].includes(x)) : wrongPts));
  const myEnd = seq[seq.length - 1];
  if (Math.random() < 0.5) distract.push(pick(['kudasai', 'arimasuka', 'kimashita', 'onegai', 'dokodesuka', 'desu'].filter(e => e !== myEnd && !seq.includes(e))));
  const ans = [seq]; (p.alt || []).forEach(a => ans.push(seq.map(x => B[x][3] === 'pt' ? a : x)));
  return {pid, prompt:'用日文說：「' + zh + '」', zh, ans, tray:shuffle([...seq, ...distract])};
}
function diagnose(user, ansList) {
  let exp = ansList[0], best = -1;
  ansList.forEach(a => { let k = 0; while (k < a.length && a[k] === user[k]) k++; if (k > best) { best = k; exp = a; } });
  const rn = id => ROLES[B[id][3]].n;
  if (user.length === exp.length && [...user].sort().join() === [...exp].sort().join())
    return {i:best, kind:'order', msg:`積木都選對了，只是順序不對。這句的順序是：${exp.map(x => '〔' + rn(x) + '〕').join(' → ')}。句尾（動作）永遠放最後。`};
  for (let i = 0; i < Math.max(user.length, exp.length); i++) {
    const u = user[i], e = exp[i];
    if (u === e) continue;
    if (u === undefined) return {i, kind:'missing', msg:`還少了一塊〔${rn(e)}〕。`};
    if (e === undefined) return {i, kind:'extra', msg:`多放了「${B[u][0]}」，這句不需要它。`};
    const ru = B[u][3], re = B[e][3];
    if (ru === 'pt' && re === 'pt') return {i, kind:'pt', u, e, msg:`助詞選錯了。你放了「${B[u][0]}」：${PT_RULE[u]}<br>這裡要「${B[e][0]}」：${PT_RULE[e]}`};
    if (ru === re) return {i, kind:'content', u, e, msg:`〔${ROLES[re].n}〕的位置對了，但題目要的是「${B[e][2]}」，你放的是「${B[u][2]}」。`};
    return {i, kind:'role', u, e, msg:`這個位置該放〔${ROLES[re].n}〕積木，你放的是〔${ROLES[ru].n}〕積木「${B[u][0]}」（${B[u][2]}）。`};
  }
  return {i:0, kind:'?', msg:'再看一次題目要說的意思。'};
}
function patIntroduced(pid) { return !!S.jp[pid]; }

/* ================= paste & learn ================= */
let IDX = new Map();
const normKey = k => k.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z' \-]/g, ' ').replace(/\s+/g, ' ').trim();
function buildIndex() {
  IDX = new Map();
  const add = (k, id) => { k = normKey(k); if (k && !IDX.has(k)) IDX.set(k, id); };
  allEnIds().forEach(id => { const it = getEn(id); add(it.w, id); (it.al || []).forEach(a => add(a, id)); });
}
function lookupWord(t) {
  const c = [t];
  if (t.endsWith("'s")) c.push(t.slice(0, -2));
  if (t.endsWith('ies')) c.push(t.slice(0, -3) + 'y');
  if (t.endsWith('es')) c.push(t.slice(0, -2));
  if (t.endsWith('s')) c.push(t.slice(0, -1));
  if (t.endsWith('ed')) { c.push(t.slice(0, -2)); c.push(t.slice(0, -1)); }
  if (t.endsWith('ing')) { c.push(t.slice(0, -3)); c.push(t.slice(0, -3) + 'e'); }
  for (const x of c) { const id = IDX.get(x); if (id) return id; }
  return null;
}
function analyze(text) {
  const toks = (text.replace(/[’‘]/g, "'").match(/[A-Za-z][A-Za-z'\-]*/g) || []).map(t => t.replace(/^['-]+|['-]+$/g, ''));
  const low = toks.map(t => t.toLowerCase());
  const found = [], unknown = [], skipped = new Set();
  let i = 0;
  while (i < low.length) {
    let hit = null, n = 0;
    for (let k = Math.min(4, low.length - i); k >= 2; k--) { const id = IDX.get(low.slice(i, i + k).join(' ')); if (id) { hit = id; n = k; break; } }
    if (!hit) { hit = lookupWord(low[i]); n = 1; }
    if (hit) { if (!found.includes(hit)) found.push(hit); }
    else { const t = low[i]; if (isBasic(t) || t.length < 3 || t.length > 24) skipped.add(t); else if (!unknown.includes(t)) unknown.push(t); }
    i += n;
  }
  return {found, unknown, skipped:[...skipped]};
}
function isBasic(t) {
  if (STOP.has(t) || NAMES.has(t)) return true;
  const c = [t.replace(/'s$/, ''), t.replace(/s$/, ''), t.replace(/es$/, ''), t.replace(/ed$/, ''), t.replace(/d$/, ''), t.replace(/ing$/, ''), t.replace(/ing$/, 'e'), t.replace(/n't$/, '')];
  return c.some(x => STOP.has(x) || NAMES.has(x));
}
function snippetFor(text, word) {
  const parts = text.split(/(?<=[.!?\n])\s*/);
  const s = parts.find(p => p.toLowerCase().includes(word.toLowerCase())) || text;
  return s.trim().slice(0, 110);
}
let SAMPLE = null, sampleChecked = false;
async function initSample() { try { if (window.claude && window.claude.use) SAMPLE = await window.claude.use('sample'); } catch (e) { SAMPLE = null; } sampleChecked = true; if (UI.tab === 'look') render(); }

/* ================= rendering: shell ================= */
function tower() {
  const n = Math.min(level(), 8) - 1, cols = ['var(--r-place)', 'var(--r-purpose)', 'var(--r-thing)', 'var(--r-num)', 'var(--r-way)', 'var(--r-qual)', 'var(--en)'];
  let h = '<div class="tower" aria-hidden="true">';
  for (let i = 0; i < n; i++) h += `<i style="background:${cols[i % cols.length]}"></i>`;
  h += '<svg width="30" height="24" viewBox="0 0 30 24"><rect x="1" y="1" width="28" height="22" rx="6" fill="var(--jp)"/><circle cx="10" cy="11" r="2.2" fill="#fff"/><circle cx="20" cy="11" r="2.2" fill="#fff"/><path d="M11 16q4 3 8 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg></div>';
  return h;
}
function topbar(title) {
  return `<header class="topbar">${tower()}<div class="grow"><h1>${title}</h1><div class="lv"><span class="tnum">Lv ${level()}</span><span class="xpbar"><i style="width:${Math.round(lvProgress() * 100)}%"></i></span></div></div>
    <div class="streak" title="最近 7 天有學習的天數"><b class="tnum">${weekDays()}</b>本週天數</div></header>`;
}
function render() {
  migrateOldDlg(); applyRead();
  document.body.classList.toggle('noro', S.settings.read === 'none');
  const v = $('#view');
  const map = {home:vHome, en:vEn, look:vLook, jp:vJp, oral:vOral, me:vMe};
  v.innerHTML = (map[UI.tab] || vHome)();
  if(UI.tab==='oral')window.OralModule.mount();
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-current', t.dataset.v === UI.tab ? 'page' : 'false'));
}

function vOral(){return '<header class="topbar"><div class="grow"><h1>口語聽力</h1><p class="small muted">一次兩句，從零開始聽懂。</p></div></header>'+ORAL_SHELL;}

/* ---------- 今天 ---------- */
function vHome() {
  const cov = coverage(), due = enDue().length, nw = newCandidates().length, jd = jpDue().length;
  const nextPat = PAT.find(p => !S.jp[p.id]);
  const nextScene = SCENES.find(s => !(S.scenes[s.id] && S.scenes[s.id].done));
  const again = againToday().filter(id => getEn(id)).slice(0, 12);
  const lg = L();
  const week = [...Array(7)].map((_, i) => { const k = dayKey(Date.now() - (6 - i) * DAY); const d = S.log[k] || {}; return {k, en:d.en || 0, jp:d.jp || 0, day:'日一二三四五六'[new Date(Date.now() - (6 - i) * DAY).getDay()]}; });
  const mx = Math.max(10, ...week.map(w => w.en + w.jp));
  const lookWeek = (off) => [...Array(7)].reduce((a, _, i) => a + ((S.log[dayKey(Date.now() - (i + off) * DAY)] || {}).look || 0), 0);
  const lw = lookWeek(0), pw = lookWeek(7);
  const first = S.xp === 0;
  return topbar('按鈕與積木') + `<div class="stack">
    ${first ? `<div class="card flat"><h3 style="font-size:17px;margin-bottom:6px">從這裡開始</h3><p class="muted">先按下面的「開始英文練習」。今天會學 ${S.settings.dailyNew} 個 Claude 畫面上最常出現的英文。在 Claude 看到不懂的字，就到下方中間的「查」貼上。</p></div>` : ''}
    <section class="card hero-en stack" aria-label="英文">
      <div class="row"><div class="grow" style="flex:1"><p class="small muted">英文 · 看懂 Claude 介面</p><p class="big tnum">${Math.round(cov * 100)}%</p><p class="small muted">Claude 常見英文，你已經看得懂的比例・已學 ${allEnIds().filter(id => S.en[id]).length} 個字</p></div></div>
      <div class="meter"><i style="width:${Math.max(2, cov * 100)}%"></i></div>
      <p class="small">${due ? `${due} 個字等你複習` : '沒有要複習的字'}　·　${nw ? `今天還有 ${nw} 個新字` : '今天新字學完了'}</p>
      <button class="btn onhero block" data-a="startEn">${due || nw ? '開始英文練習' : '再多學 3 個新字'}</button>
      ${learnedIds().length ? `<button class="btn block" style="background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.45)" data-a="review">複習學過的字（${learnedIds().length} 個）</button>` : ''}
    </section>
    <section class="card hero-jp stack" aria-label="日文">${jpNextHtml(true)}</section>
    ${again.length ? `<section class="stack" style="gap:8px"><p class="sec-title">今天再遇到</p><div class="chips">${again.map(id => `<button class="chip en" data-a="word" data-v="${id}">${esc(getEn(id).w)}</button>`).join('')}</div><p class="small muted">今天答錯或在 Claude 裡查過的字。它們會在 10 分鐘後的練習裡再出現。</p></section>` : ''}
    <div class="kpis">
      <div class="kpi"><span class="small muted">本週查字次數</span><b class="tnum">${lw}</b><span class="small muted">上週 ${pw} 次${pw && lw < pw ? '，變少了' : ''}</span></div>
      <div class="kpi"><span class="small muted">今天答題</span><b class="tnum">${lg.en + lg.jp}<span class="small muted"> / 15</span></b><span class="small muted">答對 ${lg.enOk + lg.jpOk} 題</span></div>
    </div>
    <section class="card"><div class="row" style="margin-bottom:10px"><p class="sec-title" style="flex:1;margin:0">這 7 天</p><span class="small muted"><span style="color:var(--en)">■</span> 英文　<span style="color:var(--jp)">■</span> 日文</span></div>
      <div class="week">${week.map(w => `<div><span style="display:flex;flex-direction:column;justify-content:flex-end;width:100%;align-items:center;flex:1;gap:2px">${w.jp ? `<i class="jpbar" style="height:${w.jp / mx * 52}px"></i>` : ''}<i style="height:${Math.max(3, w.en / mx * 52)}px;${w.en ? '' : 'opacity:.25'}"></i></span>${w.day}</div>`).join('')}</div></section>
    <p class="small muted" style="text-align:center">查字次數越少，代表你越不需要翻譯就看得懂 Claude。</p>
  </div>`;
}

/* ---------- 英文 ---------- */
function vEn() {
  const cov = coverage(), due = enDue().length, nw = newCandidates().length;
  let body = '';
  if (UI.enSeg === 'lib') {
    const cats = ['all', ...Object.keys(CATS).filter(c => c !== 'my' || Object.keys(S.custom).length)];
    const sts = ['all', 'new', 'short', 'fam', 'mast', 'conf', 'fav'];
    const stN = {all:'全部', new:'新', short:'短期記得', fam:'熟悉', mast:'已掌握', conf:'常搞混', fav:'收藏'};
    let ids = allEnIds().filter(id => UI.cat === 'all' || getEn(id).cat === UI.cat);
    if (UI.st === 'fav') ids = ids.filter(id => S.favs.includes('en:' + id));
    else if (UI.st !== 'all') ids = ids.filter(id => status(S.en[id]) === UI.st);
    if (UI.cat === 'all' && UI.st === 'all') ids.sort((a, b) => (getEn(b).f - getEn(a).f));
    body = `<div class="chips" role="group" aria-label="分類">${cats.map(c => `<button class="chip" data-a="cat" data-v="${c}" aria-pressed="${UI.cat === c}">${c === 'all' ? '全部' : CATS[c]}</button>`).join('')}</div>
      <div class="chips" role="group" aria-label="熟悉度">${sts.map(s => `<button class="chip" data-a="st" data-v="${s}" aria-pressed="${UI.st === s}">${stN[s]}</button>`).join('')}</div>
      <p class="small muted">${ids.length} 個字${UI.cat === 'all' && UI.st === 'all' ? '，Claude 最常出現的排前面' : ''}</p>
      <div class="list">${ids.length ? ids.map(id => { const it = getEn(id); return `<button class="li" data-a="word" data-v="${id}"><div class="grow"><div class="w">${esc(it.w)}</div><div class="zh">${esc(it.zh)}・${esc(it.note)}</div></div>${pill(status(S.en[id]))}</button>`; }).join('') : '<div class="empty">這裡還沒有字。</div>'}</div>`;
  } else {
    body = `<p class="muted small">長得像、意思接近的按鈕放在一起比較。重點是「按下去會怎樣」，不是背中文。</p>
      <div class="list">${Object.entries(GROUPS).map(([gid, g]) => { const errs = g.ids.reduce((a, id) => a + Object.entries((S.en[id] || {}).conf || {}).filter(([k]) => g.ids.includes(k)).reduce((x, [, v]) => x + v, 0), 0);
        return `<button class="li" data-a="group" data-v="${gid}"><div class="grow"><div style="font-weight:800">${esc(g.t)}</div><div class="zh en">${g.ids.map(id => EN[id].w).join(' · ')}</div></div>${errs ? `<span class="pill st-conf">錯 ${errs}</span>` : ''}${IC.chev}</button>`; }).join('')}</div>`;
  }
  return topbar('英文') + `<div class="stack">
    <section class="card hero-en stack"><div class="row"><div style="flex:1"><p class="small muted">Claude 常見英文 看懂率</p><p class="big tnum">${Math.round(cov * 100)}%</p></div>
      <div style="text-align:right" class="small"><div>複習 <b class="tnum">${due}</b></div><div>新字 <b class="tnum">${nw}</b></div></div></div>
      <div class="meter"><i style="width:${Math.max(2, cov * 100)}%"></i></div>
      <button class="btn onhero block" data-a="startEn">${due || nw ? '開始練習' : '再多學 3 個新字'}</button>
      ${learnedIds().length ? `<button class="btn block" style="background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.45)" data-a="review">複習學過的字（${learnedIds().length} 個）</button>` : ''}</section>
    <div class="seg" role="group"><button data-a="enSeg" data-v="lib" aria-pressed="${UI.enSeg === 'lib'}">字庫</button><button data-a="enSeg" data-v="cmp" aria-pressed="${UI.enSeg === 'cmp'}">易混淆比較</button></div>
    ${body}</div>`;
}

/* ---------- 查 ---------- */
function vLook() {
  const lk = UI.look, res = lk.res;
  let out = '';
  if (res) {
    const ai = lk.ai;
    const aiWords = ai && Array.isArray(ai.words) ? ai.words : [];
    const foundHtml = res.found.map(id => {
      const it = getEn(id), st = status(S.en[id]);
      const learned = st === 'fam' || st === 'mast';
      return `<div class="it"><div class="grow"><div class="w">${esc(it.w)}</div><div class="small">${esc(it.zh)}・<span class="muted">${esc(it.note)}</span></div></div>
        ${learned ? `<button class="btn sm" data-a="forgot" data-v="${id}">還是忘了</button>` : `<span class="pill st-short">已排進練習</span>`}</div>`;
    }).join('');
    const unk = res.unknown.map(w => {
      const a = aiWords.find(x => x && String(x.word || '').toLowerCase() === w) || null;
      const inLib = lookupWord(w);
      if (inLib) return '';
      return `<div class="it"><div class="grow"><div class="w">${esc(w)}</div>${a ? `<div class="small">${esc(a.zh || '')}${a.note ? '・<span class="muted">' + esc(a.note) + '</span>' : ''}</div><div class="small" style="color:${a.worth ? 'var(--ok)' : 'var(--muted)'}">${a.worth ? '介面常見，值得學' : '不常用，不必背'}</div>` : '<div class="small muted">字庫裡沒有這個字</div>'}</div>
        ${a && a.worth ? `<button class="btn sm en-b" data-a="addAi" data-v="${esc(w)}">加入練習</button>` : `<button class="btn sm" data-a="manual" data-v="${esc(w)}">${a ? '還是要學' : '自己加'}</button>`}</div>`;
    }).join('');
    const extraAi = aiWords.filter(x => x && x.word && !res.unknown.includes(String(x.word).toLowerCase()) && !lookupWord(String(x.word).toLowerCase()) && x.worth).map(a => `<div class="it"><div class="grow"><div class="w">${esc(a.word)}</div><div class="small">${esc(a.zh || '')}・<span class="muted">${esc(a.note || '')}</span></div></div><button class="btn sm en-b" data-a="addAi" data-v="${esc(String(a.word).toLowerCase())}">加入練習</button></div>`).join('');
    out = `<section class="stack">
      ${ai ? `<div class="ai-box"><p class="small muted">整段的意思</p><p style="font-size:17px;font-weight:700">${esc(ai.translation || '')}</p>${ai.action ? `<p><b>你要做的事：</b>${esc(ai.action)}</p>` : ''}</div>` : ''}
      ${res.found.length ? `<p class="sec-title">字庫裡有的（${res.found.length}）</p><div class="found">${foundHtml}</div>` : ''}
      ${(unk || extraAi) ? `<p class="sec-title">字庫裡沒有的</p><div class="found">${unk}${extraAi}</div>` : ''}
      ${!ai ? (SAMPLE ? `<button class="btn block ${lk.busy ? '' : 'primary'}" data-a="askAi" ${lk.busy ? 'disabled' : ''}>${lk.busy ? '正在請 Claude 看這段…' : '請 Claude 翻譯整段，並判斷哪些字值得學'}</button>` : (sampleChecked ? '<p class="small muted">這個畫面叫不到 Claude。不在字庫的字，可以按「自己加」輸入意思。</p>' : '')) : ''}
      ${lk.err ? `<p class="small" style="color:var(--bad)">${esc(lk.err)}</p>` : ''}
      ${res.skipped.length ? `<p class="small muted">基本字，不排進練習：${esc(res.skipped.slice(0, 18).join(', '))}${res.skipped.length > 18 ? '…' : ''}</p>` : ''}
      ${!res.found.length && !res.unknown.length ? '<p class="muted">沒有找到英文字。</p>' : ''}
    </section>`;
  }
  const hist = S.pastes.slice(0, 8);
  return topbar('查') + `<div class="stack">
    <div><h2 style="font-size:19px;margin-bottom:4px">在 Claude 看到不懂的英文？</h2><p class="muted small">單字、按鈕、整段錯誤訊息都可以貼上。值得學的字會自動排進你的練習，基本字不會。</p></div>
    <label for="pasteBox" class="small muted" style="margin-bottom:-8px">貼上英文</label>
    <textarea id="pasteBox" placeholder="例如：Allow Claude to edit files in this folder?" autocapitalize="off" autocorrect="off" spellcheck="false">${esc(lk.text)}</textarea>
    <div class="row"><button class="btn primary" style="flex:1" data-a="analyze">看看這段</button><button class="btn" data-a="lookClear">清空</button></div>
    ${out}
    ${hist.length ? `<p class="sec-title">最近查過</p><div class="list">${hist.map((p, i) => `<button class="li" data-a="hist" data-v="${i}"><div class="grow"><div class="zh en" style="color:var(--ink)">${esc(p.text.slice(0, 60))}</div><div class="small muted">${new Date(p.t).toLocaleDateString('zh-TW')}・${p.found.length} 個字庫字</div></div>${IC.chev}</button>`).join('')}</div>` : ''}
  </div>`;
}

/* ---------- 日文 ---------- */
function vJp() {
  const jd = jpDue().length, famN = PAT.filter(p => (S.jp[p.id] || {}).s >= 3).length;
  const nextPat = PAT.find(p => !S.jp[p.id]);
  let body = '';
  if (UI.jpSeg === 'dlg') {
    body = dlgTasksHtml();
  } else if (UI.jpSeg === 'ck' || UI.jpSeg === 'w') {
    body = ckListHtml();
  } else if (UI.jpSeg === 'scene') {
    body = `<div class="list">${SCENES.map(s => { const st = S.scenes[s.id]; return `<button class="li" data-a="scene" data-v="${s.id}"><div class="grow"><div style="font-weight:800">${esc(s.name)}</div><div class="zh">${esc(s.sub)}・${s.steps.length} 句</div></div>${st && st.done ? `<span class="pill st-mast">完成 ${st.done} 次</span>` : '<span class="pill st-new">未開始</span>'}${IC.chev}</button>`; }).join('')}</div>
      <p class="small muted">每個情境都是真的會遇到的對話。你從積木裡拼出回答，錯了會告訴你錯在哪一塊。</p>`;
  } else if (UI.jpSeg === 'pat') {
    body = `<div class="legend">${Object.keys(ROLES).filter(r => r !== 'reply').map(r => `<span class="role-${r}">${ROLES[r].n}</span>`).join('')}</div>
      <div class="list">${PAT.map(p => `<button class="li" data-a="pat" data-v="${p.id}"><div class="grow"><div class="jpf" style="font-weight:700;font-size:17px">${esc(p.name)}</div><div class="zh">${esc(fmt(p.zh, p.parts.filter(x => typeof x !== 'string').map(x => '〔' + ROLES[B[x.opt[0]][3]].n + '〕')))}</div></div>${pill(status(S.jp[p.id]))}</button>`).join('')}</div>`;
  } else {
    const conf = Object.entries(S.jpConf).sort((a, b) => b[1] - a[1]).slice(0, 4);
    body = `${conf.length ? `<div class="card flat stack" style="gap:6px"><p class="sec-title" style="margin:0">你常搞混的助詞</p>${conf.map(([k, n]) => { const [e, u] = k.split('>'); return `<p>該用「<b class="jpf">${esc(B[e][0])}</b>」時用了「<b class="jpf">${esc(B[u][0])}</b>」<span class="muted small">・${n} 次</span></p>`; }).join('')}</div>` : ''}
      <div class="list">${Object.entries(PT_RULE).map(([k, r]) => `<div class="li" style="align-items:flex-start">${blk(k)}<p style="flex:1;min-width:0;padding-top:6px">${esc(r.split('＝')[1] || r)}</p></div>`).join('')}</div>
      ${PT_EXAMPLES.map(ex => `<section class="card stack" style="gap:12px"><p style="font-weight:800">${esc(ex.t)}</p>${ex.rows.map(seq => `<div class="row" style="align-items:flex-end"><div style="flex:1;min-width:0">${sentHtml(seq)}<p class="small muted" style="margin-top:4px">${esc(zhOfSeq(seq))}</p></div>${spkBtn(sentText(seq), 'ja-JP')}</div>`).join('')}</section>`).join('')}`;
  }
  return topbar('日文') + `<div class="stack">
    <section class="card hero-jp stack">${jpNextHtml(true)}</section>
    <div class="row" style="gap:10px"><span class="small muted" style="flex:none">讀音</span><div style="flex:1;min-width:0">${readSegHtml()}</div></div>
    <div class="seg" role="group"><button data-a="jpSeg" data-v="dlg" aria-pressed="${UI.jpSeg === 'dlg'}">對話</button><button data-a="jpSeg" data-v="ck" aria-pressed="${UI.jpSeg === 'ck' || UI.jpSeg === 'w'}">句塊</button><button data-a="jpSeg" data-v="scene" aria-pressed="${UI.jpSeg === 'scene'}">開口</button><button data-a="jpSeg" data-v="pat" aria-pressed="${UI.jpSeg === 'pat'}">句型</button><button data-a="jpSeg" data-v="pt" aria-pressed="${UI.jpSeg === 'pt'}">助詞</button></div>
    ${body}</div>`;
}
const ZH_SEQ = {'tokyo,ni,kimashita':'我來到東京了', 'kankou,de,kimashita':'我是來觀光的', 'taiwan,kara,kimashita':'我從台灣來', 'card,de,onegai':'用信用卡付款', 'wifi,wa,arimasuka':'有 Wi-Fi 嗎？', 'toire,wa,dokodesuka':'廁所在哪裡？', 'kore,wa,ikura':'這個多少錢？', 'kore,wo,kudasai':'請給我這個', 'checkin,wo,onegai':'麻煩辦入住', 'iyahon,wo,sagashite':'我在找耳機'};
function zhOfSeq(seq) { return ZH_SEQ[seq.join(',')] || seq.map(b => B[b][2]).join(' '); }

/* ---------- 我的 ---------- */
function vMe() {
  const learned = allEnIds().filter(id => S.en[id]).length, fam = allEnIds().filter(id => ['fam', 'mast'].includes(status(S.en[id]))).length;
  const patN = PAT.filter(p => S.jp[p.id]).length;
  const confEn = [];
  allEnIds().forEach(id => Object.entries((S.en[id] || {}).conf || {}).forEach(([o, n]) => { if (getEn(o)) confEn.push([id, o, n]); }));
  confEn.sort((a, b) => b[2] - a[2]);
  const favs = S.favs.map(k => { const [t, id] = k.split(':'); return t === 'en' && getEn(id) ? `<button class="li" data-a="word" data-v="${id}"><div class="grow"><div class="w">${esc(getEn(id).w)}</div><div class="zh">${esc(getEn(id).zh)}</div></div>${IC.chev}</button>` : t === 'jp' && PAT_MAP[id] ? `<button class="li" data-a="pat" data-v="${id}"><div class="grow"><div class="jpf" style="font-weight:700">${esc(PAT_MAP[id].name)}</div></div>${IC.chev}</button>` : ''; }).join('');
  const my = Object.keys(S.custom);
  const seg = (key, vals, cur) => `<div class="seg" style="min-width:150px">${vals.map(([v, l]) => `<button data-a="set" data-k="${key}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`;
  return topbar('我的') + `<div class="stack">
    <div class="kpis">
      <div class="kpi"><span class="small muted">英文字</span><b class="tnum">${fam}<span class="small muted"> 熟 / ${learned} 學過</span></b><span class="small muted">字庫共 ${allEnIds().length} 個</span></div>
      <div class="kpi"><span class="small muted">日文句型</span><b class="tnum">${patN}<span class="small muted"> / ${PAT.length}</span></b><span class="small muted">經驗值 ${S.xp}</span></div>
    </div>
    ${confEn.length ? `<p class="sec-title">常搞混的英文</p><div class="list">${confEn.slice(0, 6).map(([a, b, n]) => `<button class="li" data-a="word" data-v="${a}"><div class="grow"><div class="w">${esc(getEn(a).w)} <span class="muted small">被你當成</span> ${esc(getEn(b).w)}</div><div class="zh">${esc(getEn(a).zh)} ≠ ${esc(getEn(b).zh)}</div></div><span class="pill st-conf">${n} 次</span></button>`).join('')}</div>` : ''}
    ${favs ? `<p class="sec-title">收藏</p><div class="list">${favs}</div>` : ''}
    ${my.length ? `<p class="sec-title">我自己加的字（${my.length}）</p><div class="list">${my.map(id => `<button class="li" data-a="word" data-v="${id}"><div class="grow"><div class="w">${esc(S.custom[id].w)}</div><div class="zh">${esc(S.custom[id].zh)}</div></div>${pill(status(S.en[id]))}</button>`).join('')}</div>` : ''}
    ${jpProgressHtml()}
    <p class="sec-title">設定</p>
    <div class="list">
      <div class="set-row" style="flex-wrap:wrap"><div class="grow"><b>日文讀音</b><p class="small muted">振假名、羅馬拼音可以選</p></div><div style="min-width:220px;flex:1">${readSegHtml()}</div></div>
      <div class="set-row" style="flex-wrap:wrap"><div class="grow"><b>日文對話一次練幾段</b><p class="small muted">一段約 2–4 分鐘</p></div>${seg('dlgLen', [[1, '1 段'], [2, '2 段']], S.settings.dlgLen || 1)}</div>
      <div class="set-row"><div class="grow"><b>答題時自動發音</b><p class="small muted">看到新字、答完題時念出來</p></div><button class="switch" role="switch" aria-checked="${S.settings.autoSpeak}" aria-label="自動發音" data-a="set" data-k="autoSpeak" data-v="${!S.settings.autoSpeak}"></button></div>
      <div class="set-row" style="flex-wrap:wrap"><div class="grow"><b>每天新英文字</b></div>${seg('dailyNew', [[3, '3'], [5, '5'], [8, '8']], S.settings.dailyNew)}</div>
      <div class="set-row" style="flex-wrap:wrap"><div class="grow"><b>發音速度</b></div>${seg('rate', [[0.75, '慢'], [1, '正常']], S.settings.rate)}</div>
    </div>
    <p class="sec-title">資料</p>
    <div class="card flat stack" style="gap:10px"><p class="small" id="syncText">${syncText()}</p>
      <div class="row wrap"><button class="btn sm" data-a="backup">複製備份</button><button class="btn sm" data-a="restoreOpen">貼上備份還原</button><button class="btn sm" data-a="resetAsk" style="color:var(--bad)">全部重來</button></div></div>
    <p class="small muted" style="text-align:center">加到 iPhone 主畫面：用 Safari 打開這頁 → 分享 → 加入主畫面。</p>
  </div>`;
}

/* ================= sheets ================= */
function openSheet(html) {
  closeSheet(true);
  const s = document.createElement('div'); s.className = 'scrim'; s.dataset.a = 'sheetClose'; s.id = 'scrim';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.id = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
  sh.innerHTML = `<div class="in"><div class="grab"></div>${html}</div>`;
  document.body.append(s, sh);
}
function closeSheet(silent) { $('#scrim')?.remove(); $('#sheet')?.remove(); SHEET = null; }
let SHEET = null;
function refreshSheet() { if (!SHEET) return; const sh = $('#sheet'); if (!sh) return; const top = sh.scrollTop; sh.querySelector('.in').innerHTML = '<div class="grab"></div>' + SHEET.fn(); sh.scrollTop = top; }
function showSheet(fn) { SHEET = {fn}; openSheet(fn()); SHEET = {fn}; }

function wordSheet(id) {
  const it = getEn(id); if (!it) return '';
  const r = S.en[id], st = status(r), fav = S.favs.includes('en:' + id);
  const conf = Object.entries((r || {}).conf || {}).filter(([o]) => getEn(o)).sort((a, b) => b[1] - a[1]);
  return `<div class="row"><div class="teach-word" style="flex:1;min-width:0"><span class="fakebtn">${esc(it.w)}</span></div>${spkBtn(it.w, 'en-US')}<button class="icon-btn" data-a="fav" data-v="en:${id}" aria-label="收藏" style="color:${fav ? 'var(--warn)' : 'var(--muted)'}">${fav ? IC.starf : IC.star}</button></div>
    <div><p style="font-size:26px;font-weight:800">${esc(it.zh)}</p><p class="muted">${esc(it.note)}</p></div>
    <div class="row wrap">${pill(st)}${r ? `<span class="small muted">答對 ${r.ok}・答錯 ${r.ng}${r.known ? '' : '・下次複習：' + relDue(r.due)}</span>` : '<span class="small muted">還沒學過</span>'}</div>
    ${it.exEn ? mockHtml(id) : ''}${it.exZh && it.exZh !== it.zh ? `<p class="muted small" style="margin-top:-6px">${esc(it.exZh)}</p>` : ''}
    ${conf.length ? `<div class="fb no" style="animation:none"><p>你曾把它和 ${conf.map(([o, n]) => `<b class="en">${esc(getEn(o).w)}</b>（${esc(getEn(o).zh)}，${n} 次）`).join('、')} 搞混。</p></div>` : ''}
    ${(it.groups || []).map(g => `<section class="card flat stack" style="gap:10px"><p style="font-weight:800">${esc(GROUPS[g].t)}</p>${groupCmp(g, id)}<p class="rule">${esc(GROUPS[g].rule)}</p><button class="btn sm" data-a="group" data-v="${g}">看這一組的情境</button></section>`).join('')}
    <div class="row"><button class="btn en-b" style="flex:1" data-a="againWord" data-v="${id}">加入下次練習</button>${r && (r.known || r.s >= 6) ? `<button class="btn" data-a="relearn" data-v="${id}">重新學</button>` : `<button class="btn" data-a="known" data-v="${id}">我早就會了</button>`}</div>`;
}
function groupSheet(gid) {
  const g = GROUPS[gid];
  return `<h2 style="font-size:22px">${esc(g.t)}</h2>
    <p class="rule">${esc(g.rule)}</p>
    <div class="list">${g.ids.map(id => `<div class="li"><div class="grow"><div class="w">${esc(EN[id].w)}</div><div class="zh" style="white-space:normal">${esc(g.roles[id])}（${esc(EN[id].zh)}）</div></div>${spkBtn(EN[id].w, 'en-US')}</div>`).join('')}</div>
    <p class="sec-title">情境：該按哪一個？（點一下看答案）</p>
    <div class="stack" style="gap:8px">${g.sc.map(([t, a]) => `<details class="card flat"><summary style="cursor:pointer;min-height:28px">${esc(t)}</summary><p style="margin-top:8px"><span class="fakebtn main">${esc(EN[a].w)}</span>　${esc(g.roles[a])}</p></details>`).join('')}</div>
    <button class="btn en-b block" data-a="grpPractice" data-v="${gid}">練習這一組</button>`;
}
let WB = null;
function patSheet() {
  const p = PAT_MAP[WB.pid], fav = S.favs.includes('jp:' + p.id);
  const seq = p.parts.map((part, i) => typeof part === 'string' ? part : WB.fill[i]);
  const args = p.parts.map((part, i) => typeof part === 'string' ? null : B[WB.fill[i]][2]).filter(x => x !== null);
  const sel = p.parts[WB.sel];
  return `<div class="row"><h2 class="jpf" style="font-size:22px;flex:1">${esc(p.name)}</h2><button class="icon-btn" data-a="fav" data-v="jp:${p.id}" aria-label="收藏" style="color:${fav ? 'var(--warn)' : 'var(--muted)'}">${fav ? IC.starf : IC.star}</button></div>
    <p class="small muted">點有虛線的積木，換成別的，句子會跟著變。</p>
    <div class="card stack" style="gap:12px">
      <div class="sent">${seq.map((b, i) => typeof p.parts[i] === 'string' ? blk(b, {label:true}) : blk(b, {tag:'button', label:true, cls:'slot' + (i === WB.sel ? ' good' : ''), attrs:`data-a="wbSlot" data-v="${i}" aria-label="換掉這塊"`})).join('')}</div>
      <div class="row"><p style="flex:1;font-size:17px;font-weight:700">${esc(fmt(p.zh, args))}</p>${spkBtn(sentText(seq), 'ja-JP')}</div>
    </div>
    ${sel && typeof sel !== 'string' ? `<p class="sec-title">〔${ROLES[B[sel.opt[0]][3]].n}〕可以換成</p><div class="tray">${sel.opt.map(o => blk(o, {tag:'button', label:'zh', cls:o === WB.fill[WB.sel] ? 'good' : '', attrs:`data-a="wbPick" data-v="${o}"`})).join('')}</div>` : ''}
    <p class="sec-title">每一塊負責什麼</p>
    <div class="parts">${p.parts.map((part, i) => { const b = typeof part === 'string' ? part : WB.fill[i], role = B[b][3];
      const txt = role === 'pt' ? PT_RULE[b] : role === 'end' ? `句尾：「${B[b][2]}」。放最後，決定整句在做什麼。` : `〔${ROLES[role].n}〕${ROLES[role].d}。可以換。`;
      return `<div class="part">${blk(b)}<p>${esc(txt)}</p></div>`; }).join('')}</div>
    <p class="rule j">${esc(p.note)}</p>
    <button class="btn jp-b block" data-a="patPractice" data-v="${p.id}">用這個骨架組 3 句</button>`;
}

/* ================= practice session ================= */
let SES = null;
function startSession(kind, cards, title, extra = {}) {
  if (!cards.length) return;
  SES = Object.assign({kind, title, cards, i:0, answered:false, res:null, build:null, graded:new Set(), requeued:new Set(), stats:{n:0, ok:0, nw:0, xp:0}, cov0:coverage()}, extra);
  const el = $('#ses'); el.hidden = false; el.classList.toggle('jpmode', kind === 'jp');
  document.body.style.overflow = 'hidden';
  renderSes(); autoSpeakCard();
}
function endSession() {
  SES = null; const el = $('#ses'); el.hidden = true; document.body.style.overflow = ''; if (canSpeak) try { speechSynthesis.cancel(); } catch (e) {}
  render();
}
function startEn(extra = 0) {
  const due = enDue().slice(0, 14);
  let news = newCandidates(extra);
  if (!due.length && !news.length) news = newCandidates(3);
  if (!due.length && !news.length) { toast('字庫裡的字都學過了！'); return; }
  const rev = shuffle(due).map(id => ({t:'q', id}));
  const cards = [];
  let ri = 0;
  news.forEach((id, k) => { cards.push({t:'teach', id}, {t:'q', id, isNew:true}); for (let j = 0; j < 2 && ri < rev.length; j++) cards.push(rev[ri++]); });
  while (ri < rev.length) cards.push(rev[ri++]);
  startSession('en', cards, '英文');
}
function startGroupPractice(gid) {
  const g = GROUPS[gid];
  const cards = shuffle(g.sc).map(([t, a]) => ({t:'q', id:a, q:{mode:'sc', id:a, g:gid, text:t, opts:shuffle([a, ...shuffle(g.ids.filter(x => x !== a && !(SYN[a] || []).includes(x))).slice(0, 3)])}}));
  closeSheet(); startSession('en', cards, g.t);
}
function learnedIds() { return allEnIds().filter(id => S.en[id] && !S.en[id].known); }
function startReview() {
  const rank = {conf:0, short:1, fam:2, mast:3};
  const pool = learnedIds().sort((a, b) => (rank[status(S.en[a])] - rank[status(S.en[b])]) || ((S.en[a].last || 0) - (S.en[b].last || 0)));
  if (!pool.length) { toast('還沒有學過的字，先做一次英文練習'); return; }
  const pick15 = shuffle(pool.slice(0, 15));
  const modes = ['mean', 'sc', 'zh2en'];
  const cards = pick15.map((id, i) => ({t:'q', id, q:makeEnQ(id, modes[i % 3])}));
  startSession('en', cards, '複習學過的字', {review:true, missed:[]});
}
function startJp() {
  const due = shuffle(jpDue()).slice(0, 6);
  const cards = due.map(p => ({t:'build', task:patTask(p.id)}));
  if (cards.length < 4) {
    const nxt = PAT.find(p => !S.jp[p.id]);
    if (nxt) cards.push({t:'pteach', pid:nxt.id}, {t:'build', task:patTask(nxt.id)}, {t:'build', task:patTask(nxt.id)});
  }
  if (!cards.length) { const known = PAT.filter(p => S.jp[p.id]); shuffle(known).slice(0, 5).forEach(p => cards.push({t:'build', task:patTask(p.id)})); }
  startSession('jp', cards, '日文');
}
function startScene(sid) {
  const sc = SCENE_MAP[sid];
  const cards = [{t:'sceneIntro', sid}, ...sc.steps.map(st => ({t:'build', task:Object.assign({}, st, {prompt:st.task, tray:shuffle(st.tray), scene:sid})}))];
  closeSheet(); startSession('jp', cards, sc.name, {sceneId:sid});
}
function startPatPractice(pid) {
  const cards = [{t:'build', task:patTask(pid)}, {t:'build', task:patTask(pid)}, {t:'build', task:patTask(pid)}];
  closeSheet(); startSession('jp', cards, PAT_MAP[pid].name);
}
function curCard() { return SES && SES.cards[SES.i]; }
function autoSpeakCard() {
  const c = curCard(); if (!c || !S.settings.autoSpeak) return;
  if (c.t === 'teach') speak(getEn(c.id).w, 'en-US');
  if (c.t === 'wq') speak(c.jp.replace(/^〜/, ''), 'ja-JP', 0.85);
  if (c.t === 'ck' && c.mode === 'l') speak(spokenJp(CK[c.id].jp), 'ja-JP', 0.9);
}

function renderSes() {
  const el = $('#ses'); if (!SES) return;
  const c = curCard(), total = SES.cards.length;
  const head = `<div class="ov-head"><button class="icon-btn" data-a="sesClose" aria-label="結束練習">${IC.x}</button><div class="prog" aria-hidden="true"><i style="width:${Math.min(100, SES.i / total * 100)}%"></i></div><span class="small muted tnum">${Math.min(SES.i + 1, total)}/${total}</span></div>`;
  let body = '', foot = '';
  if (!c) { [body, foot] = sesDone(); }
  else if (c.t === 'teach') [body, foot] = sesTeach(c);
  else if (c.t === 'q') [body, foot] = sesQ(c);
  else if (c.t === 'pteach') [body, foot] = sesPTeach(c);
  else if (c.t === 'sceneIntro') [body, foot] = sesSceneIntro(c);
  else if (c.t === 'build') [body, foot] = sesBuild(c);
  else if (c.t === 'ck') [body, foot] = sesCk(c);
  else if (c.t === 'wq') [body, foot] = sesWq(c);
  const prev = $('#sesBody'), keep = prev && SES._ri === SES.i ? prev.scrollTop : 0;
  el.innerHTML = head + `<div class="ov-body" id="sesBody"><div class="in">${body}</div></div><div class="ov-foot"><div class="in">${foot}</div></div>`;
  SES._ri = SES.i; if (keep) $('#sesBody').scrollTop = keep;
}
function sesTeach(c) {
  const it = getEn(c.id);
  const b = `<p class="small muted">新字 · ${esc(CATS[it.cat] || '')}</p>
    <div class="teach-word"><span class="fakebtn">${esc(it.w)}</span>${spkBtn(it.w, 'en-US')}</div>
    <div><p style="font-size:28px;font-weight:800">${esc(it.zh)}</p><p class="muted" style="font-size:17px">${esc(it.note)}</p></div>
    ${mockHtml(c.id)}${it.exZh && it.exZh !== it.zh ? `<p class="muted small" style="margin-top:-8px">${esc(it.exZh)}</p>` : ''}
    ${(it.groups || []).slice(0, 1).map(g => `<section class="card flat stack" style="gap:10px"><p style="font-weight:800">別和這些搞混</p>${groupCmp(g, c.id)}<p class="rule">${esc(GROUPS[g].rule)}</p></section>`).join('')}`;
  const f = `<button class="btn primary block" data-a="teachOk">看懂了，考我一題</button><button class="btn ghost block" data-a="teachKnown">這個我本來就會</button>`;
  return [b, f];
}
function sesQ(c) {
  if (!c.q) c.q = makeEnQ(c.id);
  const q = c.q, it = getEn(q.id), res = SES.res;
  let b = '';
  if (q.mode === 'mean') b += `<p class="q">畫面上的 <span class="en">${esc(it.w)}</span> 是什麼意思？</p>${mockHtml(q.id)}`;
  else if (q.mode === 'zh2en') b += `<p class="small muted">你想要：</p><p class="q">「${esc(it.zh)}」<span class="muted" style="font-weight:400;font-size:15px">　${esc(it.note)}</span></p><p class="muted">要按哪一個？</p>`;
  else b += `<p class="small muted">情境</p><p class="q">${esc(q.text)}</p><p class="muted">要按哪一個？</p>`;
  b += `<div class="opts">${q.opts.map((o, i) => { const oi = getEn(o); let cls = ''; if (res) { if (o === q.id) cls = 'correct'; else if (i === res.chosen) cls = 'wrong'; }
    const inner = q.mode === 'mean' ? `<span><b>${esc(oi.zh)}</b><span class="sub">${esc(oi.note)}</span></span>` : `<span class="en">${esc(oi.w)}</span>`;
    return `<button class="opt ${cls}" data-a="opt" data-v="${i}" ${res ? 'disabled' : ''}>${inner}</button>`; }).join('')}</div>`;
  if (res) {
    const ch = getEn(q.opts[res.chosen]);
    const g = q.g || (it.groups || []).find(x => GROUPS[x].ids.includes(q.opts[res.chosen]));
    b += res.ok ? `<div class="fb ok"><h3>答對了</h3><div class="row"><p style="flex:1"><b class="en">${esc(it.w)}</b> ＝ ${esc(it.zh)}：${esc(it.note)}</p>${spkBtn(it.w, 'en-US')}</div>${g ? `<p class="rule">${esc(GROUPS[g].rule)}</p>` : ''}</div>`
      : `<div class="fb no"><h3>差一點</h3><p>你選的 <b class="en">${esc(ch.w)}</b> 是「${esc(ch.zh)}」：${esc(g && GROUPS[g].roles[ch.id] ? GROUPS[g].roles[ch.id] : ch.note)}。</p><div class="row"><p style="flex:1">這裡要的是 <b class="en">${esc(it.w)}</b>「${esc(it.zh)}」：${esc(g && GROUPS[g].roles[it.id] ? GROUPS[g].roles[it.id] : it.note)}。</p>${spkBtn(it.w, 'en-US')}</div>${g ? `<p class="rule">分辨方法：${esc(GROUPS[g].rule)}</p>` : ''}<p class="small muted">這個字等一下會再出現一次。</p></div>`;
  }
  const f = res ? `<button class="btn primary block" data-a="next">下一題</button>` : `<p class="small muted" style="text-align:center">選一個答案</p>`;
  return [b, f];
}
function sesPTeach(c) {
  const p = PAT_MAP[c.pid];
  const frame = p.parts.map(part => typeof part === 'string' ? blk(part, {label:true}) : `<span class="blk slot role-${B[part.opt[0]][3]}"><span>〔${ROLES[B[part.opt[0]][3]].n}〕</span></span>`).join('');
  const ex = [0, 1, 2].map(() => patTask(p.id)).filter((t, i, a) => a.findIndex(x => x.ans[0].join() === t.ans[0].join()) === i);
  const b = `<p class="small muted">新的句型骨架</p><h2 class="jpf" style="font-size:24px">${esc(p.name)}</h2>
    <div class="card stack"><div class="sent">${frame}</div><p class="small muted">有虛線的是「可以換的積木」，其他的固定不動。</p></div>
    <div class="parts">${p.parts.map(part => { if (typeof part !== 'string') { const r = B[part.opt[0]][3]; return `<div class="part"><span class="blk slot role-${r}"><span>〔${ROLES[r].n}〕</span></span><p>${esc(ROLES[r].d)}。可以放：${esc(part.opt.map(o => B[o][0]).join('、'))}</p></div>`; }
      const r = B[part][3]; return `<div class="part">${blk(part)}<p>${esc(r === 'pt' ? PT_RULE[part] : '句尾：「' + B[part][2] + '」，固定放最後。')}</p></div>`; }).join('')}</div>
    <p class="sec-title">換積木，就是新句子</p>
    ${ex.map(t => `<div class="row" style="align-items:flex-end"><div style="flex:1;min-width:0">${sentHtml(t.ans[0])}<p class="small muted" style="margin-top:4px">${esc(t.zh)}</p></div>${spkBtn(sentText(t.ans[0]), 'ja-JP')}</div>`).join('')}
    <p class="rule">${esc(p.note)}</p>`;
  return [b, `<button class="btn jp-b block" data-a="next">我來組組看</button>`];
}
function sesSceneIntro(c) {
  const sc = SCENE_MAP[c.sid];
  const pats = [...new Set(sc.steps.map(s => s.pat).filter(Boolean))];
  const b = `<p class="small muted">情境</p><h2 style="font-size:26px">【${esc(sc.name)}】</h2><p class="muted">${esc(sc.sub)}・${sc.steps.length} 句對話</p>
    <p>對方說一句，你從積木裡拼出回答。不用背整句：看懂每一塊的角色，換掉該換的就好。</p>
    ${pats.length ? `<p class="sec-title">會用到的骨架</p><div class="chips">${pats.map(pid => `<span class="chip jpf">${esc(PAT_MAP[pid].name)}</span>`).join('')}</div>` : ''}`;
  return [b, `<button class="btn jp-b block" data-a="next">開始</button>`];
}
function sesBuild(c) {
  const t = c.task;
  if (!SES.build) SES.build = {placed:[], tries:0, solved:false, diag:null, shown:false};
  const st = SES.build;
  const userSeq = st.placed.map(i => t.tray[i]);
  let b = '';
  if (t.who) {
    const real = t.jp && !t.jp.startsWith('（');
    b += `<div class="bubble"><div class="grow"><p class="who">${esc(t.who)}</p>${real ? jline(t.jp, t.ro) + `<p class="small muted" style="margin-top:2px">${esc(t.zh)}</p>` : `<p class="muted">${esc(t.jp)}</p>`}</div>${real ? spkBtn(t.jp, 'ja-JP', '聽這句') : ''}</div>`;
  }
  b += `<p class="q">${esc(t.prompt)}</p>`;
  b += `<div class="answer-zone" aria-label="你的句子">${st.placed.map((ti, pos) => { const bad = st.diag && !st.solved && pos === st.diag.i; return blk(t.tray[ti], {tag:'button', label:true, cls:(st.solved ? 'good' : bad ? 'bad' : ''), attrs:`data-a="placed" data-v="${pos}" ${st.solved ? 'disabled' : ''} aria-label="拿回這塊"`}); }).join('')}</div>`;
  if (!st.solved) b += `<div class="tray" aria-label="積木">${t.tray.map((id, i) => blk(id, {tag:'button', label:true, cls:st.placed.includes(i) ? 'used' : '', attrs:`data-a="tray" data-v="${i}"`})).join('')}</div>`;
  if (st.diag && !st.solved) b += `<div class="fb no"><h3>錯在這一塊</h3><p>${st.diag.msg}</p>${st.tries >= 2 ? '<p class="small muted">可以按「看答案」。</p>' : ''}</div>`;
  if (st.solved) {
    const seq = userSeq;
    b += `<div class="fb ok"><h3>${st.shown ? '正確答案' : '對了！'}</h3><div class="row" style="align-items:flex-end"><div style="flex:1;min-width:0">${jline(sentText(seq), sentRo(seq), true)}</div>${spkBtn(sentText(seq), 'ja-JP')}</div>
      <p class="sec-title" style="margin-top:6px">拆解</p><div class="parts">${seq.map(x => `<div class="part">${blk(x)}<p>〔${ROLES[B[x][3]].n}〕${esc(B[x][3] === 'pt' ? PT_RULE[x] : B[x][2])}</p></div>`).join('')}</div>
      ${t.tip ? `<p class="rule">${esc(t.tip)}</p>` : ''}${st.altNote ? `<p class="small">${esc(st.altNote)}</p>` : ''}</div>`;
  }
  const f = st.solved ? `<button class="btn jp-b block" data-a="next">下一題</button>`
    : `<div class="row"><button class="btn" data-a="bClear" ${st.placed.length ? '' : 'disabled'}>清除</button>${st.tries >= 2 ? '<button class="btn" data-a="bShow">看答案</button>' : ''}<button class="btn jp-b" style="flex:1" data-a="bCheck" ${st.placed.length ? '' : 'disabled'}>檢查</button></div>`;
  return [b, f];
}
function sesDone() {
  const s = SES.stats, isEn = SES.kind === 'en';
  if (SES.review) {
    const tot = SES.graded.size, miss = SES.missed.length, kept = tot - miss;
    const b = `<div class="done-hero"><div class="pop">${tower()}</div><h2 style="font-size:26px">還記得 ${kept} / ${tot} 個</h2>
      <p class="muted">${miss === 0 ? '全部都記得！這些字會隔更久才再出現。' : kept / tot >= 0.8 ? '大部分都記得。忘掉的字已經排進接下來的練習。' : '有些字忘了，很正常。它們會在 10 分鐘後和明天再出現。'}</p></div>
      ${miss ? `<p class="sec-title">這次忘了的字</p><div class="list">${SES.missed.map(id => `<button class="li" data-a="word" data-v="${id}"><div class="grow"><div class="w">${esc(getEn(id).w)}</div><div class="zh">${esc(getEn(id).zh)}・${esc(getEn(id).note)}</div></div>${IC.chev}</button>`).join('')}</div>` : ''}
      <p class="small muted" style="text-align:center">每次複習會優先考：常搞混的、還不熟的、最久沒見到的字。</p>`;
    const left = learnedIds().length > 15;
    return [b, `${left ? '<button class="btn block" data-a="reviewAgain">再複習 15 個</button>' : ''}<button class="btn primary block" data-a="sesClose">完成</button>`];
  }
  const cov1 = coverage(), d = Math.round((cov1 - SES.cov0) * 100);
  const b = `<div class="done-hero"><div class="pop">${tower()}</div><h2 style="font-size:26px">完成！</h2>
    <p class="muted">答對 ${s.ok} / ${s.n} 題${s.nw ? `・新學 ${s.nw} 個` : ''}・經驗值 +${s.xp}</p>
    ${isEn ? `<p style="font-size:18px">看懂率 <b class="tnum">${Math.round(cov1 * 100)}%</b>${d > 0 ? `<span style="color:var(--ok)">（+${d}%）</span>` : ''}</p>` : ''}
    <p class="small muted">最近 7 天學了 ${weekDays()} 天</p></div>
    ${isEn ? '<p class="small muted" style="text-align:center">答錯的字 10 分鐘後會再出現；答對的字會越隔越久才出現。</p>' : (SES.dlg ? '<p class="small muted" style="text-align:center">漏聽的對話很快會再出現；聽懂的會越隔越久，通過了就解鎖下一級。</p>' : '<p class="small muted" style="text-align:center">錯的句型很快會再出現；熟了的會越隔越久。</p>')}`;
  const f = `${isEn && !SES.more ? '<button class="btn block" data-a="more">再學 3 個新字</button>' : ''}<button class="btn primary block" data-a="sesClose">完成</button>`;
  return [b, f];
}

/* ---- answering ---- */
function answerEn(idx) {
  const c = curCard(); if (!c || SES.res) return;
  const q = c.q, chosen = q.opts[idx], ok = chosen === q.id;
  SES.res = {chosen:idx, ok};
  const firstTime = !SES.graded.has(q.id);
  const r = recOf('en', q.id, true);
  if (firstTime && SES.review && ok && r.due > Date.now()) { SES.graded.add(q.id); r.ok++; r.last = Date.now(); }
  else if (firstTime) { SES.graded.add(q.id); grade(r, ok); if (c.isNew) { S.newDay.n = newToday() + 1; L().nw++; SES.stats.nw++; S.boost = S.boost.filter(x => x !== q.id); } }
  if (!ok && SES.review && firstTime) SES.missed.push(q.id);
  if (!ok) { r.conf[chosen] = (r.conf[chosen] || 0) + 1; addAgain(q.id);
    if (!SES.requeued.has(q.id)) { SES.requeued.add(q.id); SES.cards.splice(Math.min(SES.i + 3, SES.cards.length), 0, {t:'q', id:q.id}); } }
  SES.stats.n++; if (ok) SES.stats.ok++;
  const lg = L(); lg.en++; if (ok) lg.enOk++;
  touchStreak(); addXp(ok ? (firstTime ? 10 : 4) : 1);
  persist();
  renderSes();
  if (S.settings.autoSpeak) speak(getEn(q.id).w, 'en-US');
  requestAnimationFrame(() => { const fb = document.querySelector('#sesBody .fb'); fb && fb.scrollIntoView({behavior:'smooth', block:'nearest'}); });
}
function checkBuild(showAnswer) {
  const c = curCard(), t = c.task, st = SES.build;
  let seq = st.placed.map(i => t.tray[i]);
  let ok = t.ans.some(a => a.join() === seq.join());
  if (showAnswer) {
    const a = t.ans[0]; const used = new Set(); st.placed = a.map(id => { const i = t.tray.findIndex((x, k) => x === id && !used.has(k)); used.add(i); return i; });
    st.solved = true; st.shown = true; renderSes(); speakIf(sentText(a)); return;
  }
  const first = st.tries === 0; st.tries++;
  const gradeKey = (t.pid || t.pat) ? (t.pid || t.pat) : null;
  if (ok) {
    st.solved = true; st.diag = null;
    if (t.ans.length > 1 && seq.join() !== t.ans[0].join()) st.altNote = '這樣說也對！另一個常見說法：' + sentText(t.ans[0]) + '。';
    else if (t.ans.length > 1) st.altNote = '另一種說法也對：' + sentText(t.ans[1]) + '。';
  } else {
    st.diag = diagnose(seq, t.ans);
    if (st.diag.kind === 'pt') S.jpConf[st.diag.e + '>' + st.diag.u] = (S.jpConf[st.diag.e + '>' + st.diag.u] || 0) + 1;
  }
  if (first) {
    SES.stats.n++; if (ok) SES.stats.ok++;
    const lg = L(); lg.jp++; if (ok) lg.jpOk++;
    if (gradeKey && !SES.graded.has(gradeKey)) { SES.graded.add(gradeKey); const r = recOf('jp', gradeKey, true); grade(r, ok); if (!ok && st.diag) r.conf[st.diag.kind] = (r.conf[st.diag.kind] || 0) + 1; }
    touchStreak(); addXp(ok ? 12 : 2);
  } else if (ok) addXp(3);
  persist();
  renderSes();
  if (ok) speakIf(sentText(seq));
  requestAnimationFrame(() => { const fb = document.querySelector('#sesBody .fb'); fb && fb.scrollIntoView({behavior:'smooth', block:'nearest'}); });
}
function speakIf(t) { if (S.settings.autoSpeak) speak(t, 'ja-JP'); }
function nextCard() {
  const c = curCard();
  if (c && c.t === 'pteach' && !S.jp[c.pid]) { recOf('jp', c.pid, true); persist(); }
  SES.i++; SES.res = null; SES.build = null; SES.d = null;
  if (!curCard()) finishSession();
  renderSes(); const bd = $('#sesBody'); if (bd) bd.scrollTop = 0; autoSpeakCard();
}
function finishSession() {
  if (SES.sceneId) { const s = S.scenes[SES.sceneId] || (S.scenes[SES.sceneId] = {done:0, best:0}); s.done++; s.best = Math.max(s.best, SES.stats.ok); s.last = Date.now(); addXp(15); persist(); }
}

/* ================= misc ================= */
function toast(msg) { $('#toast')?.remove(); const t = document.createElement('div'); t.className = 'toast'; t.id = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2600); }
function markEncounter(id) {
  const r = S.en[id];
  if (!r) { if (!S.boost.includes(id)) S.boost.push(id); }
  else if (!['fam', 'mast'].includes(status(r))) { r.due = Math.min(r.due, Date.now()); r.enc = (r.enc || 0) + 1; }
  addAgain(id);
}
function addCustom(word, zh, note, text) {
  const w = word.trim(); if (!w || !zh.trim()) return false;
  const lib = lookupWord(w.toLowerCase()); if (lib) { markEncounter(lib); return true; }
  const id = 'c_' + w.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  S.custom[id] = {id, w, zh:zh.trim(), note:(note || '').trim() || '你在 Claude 裡查過的字', cat:'my', f:2, exEn:text ? snippetFor(text, w) : w, exZh:'', al:[], groups:[]};
  if (!S.boost.includes(id)) S.boost.unshift(id);
  addAgain(id); buildIndex(); persist(); return true;
}
function manualSheet(word) {
  return `<h2 style="font-size:20px">把字加進你的練習</h2>
    <label class="small muted" for="mW">英文</label><input type="text" id="mW" value="${esc(word)}" autocapitalize="off" autocorrect="off">
    <label class="small muted" for="mZ">中文意思</label><input type="text" id="mZ" placeholder="例如：編輯">
    <label class="small muted" for="mN">在介面上代表什麼（可不填）</label><input type="text" id="mN" placeholder="例如：修改內容">
    <p class="small muted">不知道意思的話，可以先問 Claude，再回來填。</p>
    <button class="btn en-b block" data-a="manualSave">加入練習</button>`;
}
async function askAi() {
  const lk = UI.look; if (!SAMPLE || lk.busy || !lk.text.trim()) return;
  lk.busy = true; lk.err = ''; render();
  const prompt = `你是幫台灣使用者看懂軟體介面英文的老師。使用者英文非常基礎，目標是看懂 Claude、AI 工具、網頁 App 介面上的英文。
下面是使用者從介面複製的文字：
"""
${lk.text.slice(0, 3000)}
"""
請只回傳一個 JSON 物件，格式：
{"translation":"整段的繁體中文（台灣用語）翻譯","action":"一句話告訴使用者：這段在要他做什麼、該按什麼；沒有就回空字串","words":[{"word":"英文原形（小寫）","zh":"最短的中文意思","note":"在軟體介面裡代表什麼，20 字內","worth":true}]}
words 規則：列出這段裡基礎程度的人可能看不懂的字，最多 8 個。在軟體介面常出現、學了以後常用得到 → worth=true；罕見字、專有名詞、檔名、程式變數 → worth=false。不要列出 the、to、is、you 這類基本字。
範例：{"translation":"允許 Claude 編輯這個資料夾裡的檔案嗎？","action":"要你決定是否給權限：同意按 Allow，不要按 Deny。","words":[{"word":"edit","zh":"編輯","note":"修改內容","worth":true}]}`;
  try {
    const res = await SAMPLE.json(prompt, {modelTier:'quick', cache:{gcTime:DAY}});
    if (!res || typeof res !== 'object') throw {code:'invalid_json'};
    lk.ai = {translation:String(res.translation || ''), action:String(res.action || ''), words:Array.isArray(res.words) ? res.words.slice(0, 10) : []};
    // words the AI thinks are worth it and that are already in the library count as "seen in Claude"
    lk.ai.words.forEach(w => { const id = w && w.word && lookupWord(String(w.word).toLowerCase()); if (id && w.worth) markEncounter(id); });
    persist();
  } catch (e) {
    const code = e && e.code;
    if (code === 'not_granted' || code === 'sampling_disabled' || code === 'not_declared' || code === 'capability_disabled' || code === 'capability_removed') { SAMPLE = null; lk.err = '沒有取得使用 Claude 的許可。不在字庫的字，可以按「自己加」。'; }
    else if (code === 'rate_limited') lk.err = 'Claude 現在太忙或用量到上限了，晚點再試。';
    else if (code === 'cancelled') lk.err = '';
    else lk.err = 'Claude 這次沒有回答成功，可以再按一次。';
  } finally { lk.busy = false; if (UI.tab === 'look') render(); }
}

/* ================= events ================= */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]'); if (!t) return;
  const a = t.dataset.a, v = t.dataset.v;
  switch (a) {
    case 'tab': if(UI.tab==='oral')window.OralModule.unmount();if(v==='oral'){lsStop();try{speechSynthesis.cancel();}catch(x){}}UI.tab = v; try { sessionStorage.setItem('bnk-tab', v); } catch (x) {} render(); window.scrollTo(0, 0); break;
    case 'startEn': startEn(enDue().length || newCandidates().length ? 0 : 3); break;
    case 'more': SES.more = true; { const extra = newCandidates(3).filter(id => !S.en[id]).slice(0, 3); if (!extra.length) { toast('字庫裡的字都學過了！'); break; } extra.forEach(id => SES.cards.push({t:'teach', id}, {t:'q', id, isNew:true})); renderSes(); autoSpeakCard(); } break;
    case 'startJp': startJp(); break;
    case 'runRec': { const r = recommend(); RUN_END = null; startRun(r.tid, r.lv); } break;
    case 'runResume': resumeRun(); break;
    case 'runDrop': S.run = null; persist(); render(); toast('已放棄這段'); break;
    case 'runClose': closeRunView(); break;
    case 'taskSheet': showSheet(() => taskSheet(v)); break;
    case 'taskGo': { const [tid, lv] = v.split(':'); startRun(tid, +lv); } break;
    case 'ckInfo': showSheet(() => ckSheet(v)); break;
    case 'ckWeak': { const st = ckSt(v, true); st.weak = !st.weak; persist(); refreshSheet(); toast(st.weak ? '已標成不熟，會優先複習' : '取消不熟'); } break;
    case 'startCk': startCkReview(); break;
    case 'ckq': answerCk(+v); break;
    case 'read': S.settings.read = v; persist(); render(); if (S.run && !$('#run').hidden) renderRun(); break;
    case 'startWords': startWords(); break;
    case 'wq': answerWq(+v); break;
    case 'wDel': delete S.jpw[v]; persist(); render(); break;
    case 'lsOpen': lsOpen(v); break;
    case 'lsToggle': lsToggle(); break;
    case 'lsSkip': lsSkip(+v); break;
    case 'lsSet': lsSet(t.dataset.k, v); break;
    case 'lsClose': lsClose(); break;
    default: if (S.run) runAction(a, v); break;
    case 'review': startReview(); break;
    case 'reviewAgain': endSession(); startReview(); break;
    case 'scene': startScene(v); break;
    case 'word': if (SES && !curCard()) endSession(); showSheet(() => wordSheet(v)); break;
    case 'group': showSheet(() => groupSheet(v)); break;
    case 'grpPractice': startGroupPractice(v); break;
    case 'pat': { const p = PAT_MAP[v]; WB = {pid:v, fill:{}, sel:p.parts.findIndex(x => typeof x !== 'string')}; p.parts.forEach((x, i) => { if (typeof x !== 'string') WB.fill[i] = x.opt[0]; }); showSheet(patSheet); } break;
    case 'wbSlot': WB.sel = +v; refreshSheet(); break;
    case 'wbPick': WB.fill[WB.sel] = v; refreshSheet(); if (S.settings.autoSpeak) { const p = PAT_MAP[WB.pid]; speak(sentText(p.parts.map((x, i) => typeof x === 'string' ? x : WB.fill[i])), 'ja-JP'); } break;
    case 'patPractice': startPatPractice(v); break;
    case 'speak': e.stopPropagation(); speak(v, t.dataset.l); break;
    case 'peek': t.classList.toggle('peek'); break;
    case 'fav': { const i = S.favs.indexOf(v); if (i >= 0) S.favs.splice(i, 1); else S.favs.unshift(v); persist(); refreshSheet(); toast(i >= 0 ? '取消收藏' : '已收藏'); } break;
    case 'known': { const r = recOf('en', v, true); r.known = true; r.s = 7; r.due = Date.now() + IV[7]; persist(); refreshSheet(); render(); toast('好，這個字不再一直考你'); } break;
    case 'relearn': { const r = recOf('en', v, true); r.known = false; r.s = 1; r.due = Date.now(); persist(); refreshSheet(); render(); toast('已排進下次練習'); } break;
    case 'againWord': markEncounter(v); { const r = S.en[v]; if (r) r.due = Date.now(); } persist(); refreshSheet(); render(); toast('已加入下次練習'); break;
    case 'cat': UI.cat = v; render(); break;
    case 'st': UI.st = v; render(); break;
    case 'enSeg': UI.enSeg = v; render(); break;
    case 'jpSeg': UI.jpSeg = v; render(); break;
    case 'romaji': S.settings.read = S.settings.read === 'none' ? 'furi' : 'none'; persist(); render(); break;
    case 'set': { const k = t.dataset.k; let val = v; if (k === 'dailyNew' || k === 'rate' || k === 'dlgLen') val = +v; if (k === 'autoSpeak') val = v === 'true'; S.settings[k] = val; persist(); render(); } break;
    case 'analyze': {
      const txt = ($('#pasteBox')?.value || '').trim(); UI.look.text = txt; if (!txt) { toast('先貼上一段英文'); break; }
      const res = analyze(txt); UI.look.res = res; UI.look.ai = null; UI.look.err = '';
      res.found.forEach(markEncounter); L().look++; touchStreak();
      S.pastes.unshift({t:Date.now(), text:txt.slice(0, 600), found:res.found}); S.pastes = S.pastes.slice(0, 30);
      persist(); render();
      if (SAMPLE && res.unknown.length) askAi();
    } break;
    case 'lookClear': UI.look = {text:'', res:null, ai:null, busy:false, err:''}; render(); $('#pasteBox')?.focus(); break;
    case 'askAi': askAi(); break;
    case 'forgot': { const r = S.en[v]; if (r) { r.s = Math.min(r.s, 2); r.due = Date.now(); } addAgain(v); persist(); render(); toast('已排進下次練習'); } break;
    case 'addAi': { const w = (UI.look.ai?.words || []).find(x => String(x.word).toLowerCase() === v); if (w && addCustom(String(w.word), String(w.zh || ''), String(w.note || ''), UI.look.text)) { toast('已加入：' + w.word); render(); } } break;
    case 'manual': showSheet(() => manualSheet(v)); break;
    case 'manualSave': { const ok = addCustom($('#mW').value, $('#mZ').value, $('#mN').value, UI.look.text); if (!ok) { toast('請填英文和中文意思'); break; } closeSheet(); toast('已加入練習'); render(); } break;
    case 'hist': { const p = S.pastes[+v]; if (p) { UI.look.text = p.text; UI.look.res = analyze(p.text); UI.look.ai = null; render(); window.scrollTo(0, 0); } } break;
    case 'backup': { const txt = JSON.stringify(S); const done = () => toast('備份已複製，貼到記事本存起來'); try { navigator.clipboard.writeText(txt).then(done, () => showSheet(() => `<h2 style="font-size:20px">備份資料</h2><p class="small muted">全選下面的文字，複製起來。</p><textarea readonly style="min-height:200px">${esc(txt)}</textarea>`)); } catch (x) { showSheet(() => `<textarea readonly>${esc(txt)}</textarea>`); } } break;
    case 'restoreOpen': showSheet(() => `<h2 style="font-size:20px">貼上備份還原</h2><p class="small muted">會取代目前的所有進度。</p><textarea id="restoreBox" placeholder="把備份文字貼在這裡"></textarea><button class="btn primary block" data-a="restoreDo">還原</button>`); break;
    case 'restoreDo': { try { const o = JSON.parse($('#restoreBox').value); if (!o || !o.settings) throw 0; S = migrate(o); S.updatedAt = Date.now(); saveLocal(); scheduleCloud(0); buildIndex(); closeSheet(); render(); toast('已還原'); } catch (x) { toast('這段文字不是備份資料'); } } break;
    case 'resetAsk': showSheet(() => `<h2 style="font-size:20px">真的要全部重來嗎？</h2><p class="muted">所有英文、日文進度、收藏、查過的內容都會清掉，無法復原。</p><div class="row"><button class="btn" style="flex:1" data-a="sheetClose">取消</button><button class="btn" style="flex:1;background:var(--bad);color:#fff;border:0" data-a="resetDo">全部清掉</button></div>`); break;
    case 'resetDo': S = DEF(); S.updatedAt = Date.now(); saveLocal(); scheduleCloud(0); buildIndex(); closeSheet(); render(); toast('已重新開始'); break;
    case 'sheetClose': closeSheet(); break;
    case 'sesClose': endSession(); break;
    case 'teachOk': nextCard(); break;
    case 'teachKnown': { const id = curCard().id; const r = recOf('en', id, true); r.known = true; r.s = 7; r.due = Date.now() + IV[7]; S.boost = S.boost.filter(x => x !== id); SES.cards = SES.cards.filter((c, i) => i <= SES.i || c.id !== id); persist(); toast('好，這個字跳過'); nextCard(); } break;
    case 'opt': answerEn(+v); break;
    case 'next': nextCard(); break;
    case 'tray': { const st = SES.build; const i = +v; if (!st.placed.includes(i)) { st.placed.push(i); st.diag = null; renderSes(); } } break;
    case 'placed': { const st = SES.build; st.placed.splice(+v, 1); st.diag = null; renderSes(); } break;
    case 'bClear': SES.build.placed = []; SES.build.diag = null; renderSes(); break;
    case 'bCheck': checkBuild(false); break;
    case 'bShow': checkBuild(true); break;
  }
});
document.addEventListener('input', e => { if (e.target.id === 'pasteBox') UI.look.text = e.target.value; });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('#sheet')) closeSheet(); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.jline')) { e.preventDefault(); e.target.classList.toggle('peek'); }
});

$('#tabs').innerHTML = [['home','今天',IC.home,''],['en','英文',IC.en,''],['look','查',IC.look,'look'],['jp','日文',IC.jp,'jp'],['oral','口語聽力',IC.speak,'jp'],['me','我的',IC.me,'']].map(([v,l,ic,c]) => `<button class="tab ${c}" data-a="tab" data-v="${v}">${c==='look'?`<span class="dot">${ic}</span>`:ic}<span>${l}</span></button>`).join('');
buildIndex();
render();
initCloud();
initSample();
