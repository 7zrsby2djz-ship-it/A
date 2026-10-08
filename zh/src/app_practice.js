/* ===== 聽讀練習、CAT、模擬考 =====
   題庫＝本 App 新寫的 TOCFL 型題目（EXAM）＋明朗中文的短文題（MING.questions，聽讀共用）。
   難度用數字 b（約 -2～2），能力 θ 用 EAP（貝氏期望值）估計；猜對機率設 25%（四選一）。
   這是練習用的估計，不是 TOCFL 官方計分。 */
const BANDS = ['A1', 'A2', 'A2+', 'B1-', 'B1', 'B1+', 'B2'];
const BAND_B = { A1: -2, A2: -1, 'A2+': -.45, 'B1-': .1, B1: .6, 'B1+': 1.1, B2: 1.7 };
const BAND_NAME = { A1: ['A1・入門級', 'A1'], A2: ['A2・基礎級', 'A2'], 'A2+': ['A2 偏高', 'A2（အမြင့်ပိုင်း）'], 'B1-': ['B1 初期・進階級', 'B1（အစပိုင်း）'], B1: ['B1・進階級', 'B1'], 'B1+': ['B1 偏高', 'B1（အမြင့်ပိုင်း）'], B2: ['B2・高階級', 'B2'] };
const LEVELS = ['A2', 'A2+', 'B1-', 'B1'];
const MODE_L = { guided: ['學習', 'လေ့ကျင့်'], timed: ['限時', 'အချိန်ကန့်သတ်'], cat: ['CAT', 'အဆင့်စစ်'], mock: ['模擬考', 'စမ်းသပ်စာမေးပွဲ'] };
const REASONS = [['sound', '沒聽出詞', 'အသံမကြားမိ'], ['meaning', '意思不懂', 'အဓိပ္ပာယ်မသိ'], ['options', '選項讀不完', 'ဖတ်ချိန်မလောက်'], ['hesitation', '猶豫太久', 'ဆုံးဖြတ်ရခက်'], ['other', '其他原因', 'အခြား']];
const B1_LINE = -.15; // 進階級參考線（練習用）

/* ---- 題庫整理 ---- */
const ITEMS = [];
(function buildItems() {
  const adj = id => (typeof ITEMDIFF !== 'undefined' && ITEMDIFF[id]) || 0;
  EXAM.forEach(it => {
    const b = BAND_B[it.lv] + adj(it.id) + (it.type === 'mono' ? .1 : 0);
    ITEMS.push(Object.assign({}, it, { b: b, qs: it.qs.map((q, i) => Object.assign({}, q, { id: it.id + '#' + i })) }));
  });
  MING.questions.forEach(q => {
    const lv = q.level;
    ITEMS.push({ id: q.id, skill: 'both', type: 'old', lv: lv, b: BAND_B[lv] + adj(q.id), audio: [['', q.passage]], text: q.passage, my: q.my, kw: [],
      qs: [{ id: q.id + '#0', q: q.question, qMy: '', o: q.options.map((o, i) => [o, q.optionsMy ? q.optionsMy[i] : '']), a: q.answer, why: q.explanation, ev: q.evidence, sk: /為什麼|表示|意思|最可能/.test(q.question) ? 'infer' : 'detail', tip: '' }] });
  });
  // 關鍵字 → 生字本可用的字
  ITEMS.forEach(it => (it.kw || []).forEach(k => {
    const hit = Object.keys(WORDS).find(id => WORDS[id].zh === k[0]);
    k.wid = hit || ('x' + k[0]);
    if (!hit && !WORDS[k.wid]) WORDS[k.wid] = { id: k.wid, zh: k[0], my: k[1], src: 'x', note: '' };
  }));
})();
const itemById = id => ITEMS.find(it => it.id === id);
const usable = (it, skill) => it.skill === skill || it.skill === 'both';
let FAM = null; // 每題用到哪些 App 裡的字
function famOf(it) {
  if (!FAM) {
    FAM = {};
    const list = Object.keys(WORDS).filter(id => WORDS[id].zh && WORDS[id].zh.length >= 2 && HAN.test(WORDS[id].zh));
    ITEMS.forEach(x => {
      const t = (x.audio || []).map(a => a[1]).join('') + (x.text || '') + x.qs.map(q => q.q + q.o.map(o => o[0]).join('')).join('');
      FAM[x.id] = list.filter(id => t.indexOf(WORDS[id].zh) >= 0);
    });
  }
  return FAM[it.id] || [];
}
const famSeen = it => famOf(it).filter(id => S.w[id] && S.w[id].seen).length;
const itemSeen = it => it.qs.some(q => S.seen.indexOf(q.id) >= 0);

/* ---- 能力估計：EAP ---- */
function pCorrect(th, b) { return .25 + .75 / (1 + Math.exp(-(th - b) * 1.25)); }
function eap(ans, mu) {
  let sw = 0, sm = 0, ss = 0; const pts = [];
  for (let t = -3; t <= 3.0001; t += .1) {
    let lg = -((t - mu) * (t - mu)) / 2;
    ans.forEach(a => { const p = pCorrect(t, a.b); lg += Math.log(a.ok ? p : 1 - p); });
    pts.push([t, lg]);
  }
  const mx = Math.max.apply(null, pts.map(p => p[1]));
  pts.forEach(p => { const w = Math.exp(p[1] - mx); sw += w; sm += w * p[0]; });
  const m = sm / sw;
  pts.forEach(p => { const w = Math.exp(p[1] - mx); ss += w * (p[0] - m) * (p[0] - m); });
  return { th: m, se: Math.sqrt(ss / sw) };
}
function bandOf(th) {
  if (th < -1.5) return 'A1'; if (th < -.7) return 'A2'; if (th < -.15) return 'A2+'; if (th < .35) return 'B1-'; if (th < .85) return 'B1'; if (th < 1.4) return 'B1+'; return 'B2';
}
function startTheta(skill) { const c = S.cat[skill]; return c ? c.th : BAND_B[S.prSet.level] || -.3; }

/* ---- 練習首頁 ---- */
function scaleBar(th, se) {
  const x = v => Math.max(0, Math.min(100, (v + 2.5) / 4.8 * 100));
  const ticks = [['A1', -2], ['A2', -1], ['B1', .35], ['B2', 1.7]];
  return '<div style="position:relative;height:38px;margin:8px 4px 2px">' +
    '<div style="position:absolute;left:0;right:0;top:14px;height:4px;background:var(--line);border-radius:2px"></div>' +
    (se != null ? '<div style="position:absolute;top:12px;height:8px;border-radius:4px;background:var(--blue-soft);left:' + x(th - se) + '%;width:' + (x(th + se) - x(th - se)) + '%"></div>' : '') +
    '<div style="position:absolute;top:6px;bottom:14px;width:1.5px;background:var(--kraft);left:' + x(B1_LINE) + '%"></div>' +
    '<div style="position:absolute;top:8px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:var(--blue);left:' + x(th) + '%"></div>' +
    ticks.map(t => '<span class="tiny" style="position:absolute;top:24px;transform:translateX(-50%);left:' + x(t[1]) + '%">' + t[0] + '</span>').join('') + '</div>';
}
function weakList(minN) {
  return Object.keys(S.pskill).map(k => ({ k, n: S.pskill[k].n, acc: S.pskill[k].ok / S.pskill[k].n })).filter(x => x.n >= (minN || 4) && SKILL_NAMES[x.k]).sort((a, b) => a.acc - b.acc).slice(0, 3);
}
const SKN = k => (SKILL_NAMES[k] || [k, k])[1], TYN = k => (TYPE_NAMES[k] || [k, k])[1];
VIEWS.practice = function () {
  const p = S.prSet;
  let h = '';
  // 程度
  const est = ['listening', 'reading'].map(sk => {
    const c = S.cat[sk];
    return '<div style="margin-top:8px"><div class="row between"><span class="ui">' + esc(sk === 'listening' ? 'နားထောင်' : 'ဖတ်') + '</span>' + (c ? '<span class="pill blue">' + esc(BAND_NAME[bandOf(c.th)][1]) + '</span>' : '<span class="small muted ui">' + esc('မစစ်ရသေး') + '</span>') + '</div>' + (c ? scaleBar(c.th, c.se) : '') + '</div>';
  }).join('');
  h += '<div class="card"><div class="row between"><b class="ui">' + esc('အခု အဆင့် ခန့်မှန်းချက်') + '</b><span class="small muted ui">' + esc('အဝါမျဉ်း＝B1') + '</span></div>' + est + '</div>';
  // 四個大選項
  const card = (act, data, ico, t, d, pri) => '<button class="bigcard' + (pri ? ' pri' : '') + '" data-a="' + act + '" ' + data + '><span class="ico">' + ico + '</span><span class="grow"><span class="t">' + esc(t) + '</span><span class="d">' + esc(d) + '</span></span></button>';
  h += '<div style="margin-top:14px">';
  h += card('pquick', 'data-s="listening" data-m="guided" data-n="10"', ICON.ear, 'နားထောင် လေ့ကျင့်', 'မေးခွန်း ၁၀ ခု・ထပ်နားထောင်လို့ရ・ချက်ချင်း အဖြေကြည့်', true);
  h += card('pquick', 'data-s="reading" data-m="guided" data-n="10"', ICON.book, 'ဖတ် လေ့ကျင့်', 'မေးခွန်း ၁၀ ခု・ချက်ချင်း အဖြေကြည့်');
  h += card('go', 'data-v="catpick"', ICON.repeat, 'အဆင့်စစ်မယ်（CAT）', 'မေးခွန်း ၂၀・မှန်ရင်ခက်၊ မှားရင်လွယ်');
  h += card('pquick', 'data-s="listening" data-m="mock" data-n="20"', ICON.exam, 'စမ်းသပ် စာမေးပွဲ', 'နားထောင် ၂၀ ＋ ဖတ် ၂၀・မိနစ် ၅၀ လောက်・TOCFL ပုံစံ');
  h += '</div>';
  // 弱點
  const wk = weakList(4);
  if (wk.length) {
    h += '<div class="sec"><h2>' + B('အားနည်းတဲ့ နေရာ') + '</h2></div><div class="list">' +
      wk.map(w => '<button class="li" data-a="pweaksk" data-k="' + w.k + '"><span class="grow ui">' + esc(SKN(w.k)) + '</span><span class="small">' + Math.round(w.acc * 100) + '%</span><span class="pill blue ui">' + esc('လေ့ကျင့်မယ်') + '</span></button>').join('') + '</div>';
  }
  // 自己選
  h += '<details class="more" id="prmore"' + (NAV.prMore ? ' open' : '') + '><summary>' + esc('ကိုယ်တိုင် ရွေးမယ် ›') + '</summary><div class="card stack">';
  const seg = (k, opts) => '<div class="seg">' + opts.map(o => '<button class="' + (String(p[k]) === String(o[0]) ? 'on' : '') + '" data-a="pset" data-k="' + k + '" data-v="' + o[0] + '">' + B(o[1]) + '</button>').join('') + '</div>';
  h += seg('skill', [['listening', 'နားထောင်'], ['reading', 'ဖတ်']]);
  h += seg('mode', [['guided', 'လေ့ကျင့်'], ['timed', 'အချိန်'], ['cat', 'CAT'], ['mock', 'စာမေးပွဲ']]);
  if (p.mode === 'guided' || p.mode === 'timed') {
    h += seg('level', [['A2', 'A2'], ['A2+', 'A2+'], ['B1-', 'B1-'], ['B1', 'B1'], ['all', 'အားလုံး']]);
    const types = p.skill === 'listening' ? [['all', 'အားလုံး'], ['dlg', TYN('dlg')], ['mono', TYN('mono')], ['old', TYN('old')]] : [['all', 'အားလုံး'], ['cloze', TYN('cloze')], ['para', TYN('para')], ['text', TYN('text')], ['old', TYN('old')]];
    if (!types.some(t => t[0] === p.type)) p.type = 'all';
    h += '<div class="chips">' + types.map(t => '<button class="chip' + (p.type === t[0] ? ' on' : '') + '" data-a="pset" data-k="type" data-v="' + t[0] + '">' + B(t[1]) + '</button>').join('') + '</div>';
  }
  if (p.mode !== 'mock') {
    const counts = p.mode === 'cat' ? [10, 20, 30] : [5, 10, 20];
    if (counts.indexOf(+p.count) < 0) p.count = counts[1];
    h += seg('count', counts.map(n => [n, 'မေးခွန်း ' + MYNUM(n)]));
  }
  if (p.mode === 'timed' && p.skill === 'listening') h += seg('sec', [[20, '၂၀ စက္ကန့်'], [15, '၁၅'], [12, '၁၂'], [8, '၈']]);
  if (p.mode !== 'mock') h += '<button class="set" style="width:100%;text-align:left;padding:4px 0;border:0" data-a="pfam"><span class="setlbl small">' + esc('သင်ပြီးသား စကားလုံးပါတဲ့ မေးခွန်း ဦးစားပေး') + '</span><span class="sw' + (p.fam ? ' on' : '') + '"></span></button>';
  h += '<button class="btn pri block" data-a="pstart">' + B('စမယ်') + '</button></div></details>';
  const ss = S.sessions.slice(-5).reverse();
  if (ss.length) {
    h += '<div class="sec"><h2>' + B('မှတ်တမ်း') + '</h2></div><div class="list">';
    ss.forEach(x => { h += '<div class="li"><span class="grow ui">' + esc((x.skill === 'mock' ? 'စာမေးပွဲ' : x.skill === 'listening' ? 'နားထောင်' : 'ဖတ်') + '・' + MODE_L[x.mode][1]) + (x.th != null ? ' <span class="pill blue">' + esc(BAND_NAME[bandOf(x.th)][1]) + '</span>' : '') + '</span><b style="font-weight:400">' + x.correct + '/' + x.total + '</b></div>'; });
    h += '</div>';
  }
  h += '<p class="tiny" style="margin:12px 4px">' + esc('Practice estimate only — not an official TOCFL score.') + '</p>';
  return h;
};
VIEWS.catpick = function () {
  return pageHead('', 'အဆင့်စစ်မယ်（CAT）') + '<p class="ui muted">' + esc('မေးခွန်း ၂၀။ မှန်ရင် ပိုခက်တာ၊ မှားရင် ပိုလွယ်တာ ပေါ်လာမယ်။ နောက်ပြန်သွားလို့ မရဘူး။') + '</p>' +
    '<button class="bigcard pri" data-a="pquick" data-s="listening" data-m="cat" data-n="20"><span class="ico">' + ICON.ear + '</span><span class="grow"><span class="t">နားထောင် အဆင့်စစ်</span><span class="d">အသံ တစ်ခါပဲ ဖွင့်မယ်・မေးခွန်းတစ်ခု ၁၂ စက္ကန့်</span></span></button>' +
    '<button class="bigcard" data-a="pquick" data-s="reading" data-m="cat" data-n="20"><span class="ico">' + ICON.book + '</span><span class="grow"><span class="t">ဖတ် အဆင့်စစ်</span><span class="d">စုစုပေါင်း ၂၅ မိနစ်</span></span></button>';
};

/* ---- 出題 ---- */
function rankItems(pool, target, s) {
  return pool.map(it => ({ it, sc: Math.abs(it.b - target) + (itemSeen(it) ? .6 : 0) + Math.random() * .35 - (s.fam ? Math.min(famSeen(it), 3) * .08 : 0) + (it.type === 'old' ? .15 : 0) }))
    .sort((a, b) => a.sc - b.sc).map(x => x.it);
}
function planFixed(s) {
  // 學習／限時：依難度與題型篩選，湊到題數
  let pool = ITEMS.filter(it => usable(it, s.skill) && (s.type === 'all' || it.type === s.type) && (!s.sk || it.qs.some(q => q.sk === s.sk)));
  let lvPool = s.level === 'all' ? pool : pool.filter(it => it.lv === s.level || (s.level === 'B1' && it.lv === 'B1+') || (s.level === 'A2' && it.lv === 'A1'));
  if (lvPool.reduce((t, it) => t + it.qs.length, 0) < s.count) lvPool = pool.filter(it => Math.abs(it.b - BAND_B[s.level === 'all' ? 'B1-' : s.level]) < .8);
  const target = s.level === 'all' ? startTheta(s.skill) : BAND_B[s.level];
  const out = []; let n = 0;
  for (const it of rankItems(lvPool, target, s)) { if (n >= s.count) break; out.push(it); n += it.qs.length; }
  return out;
}
function planMock(skill, th, nq) {
  const quota = skill === 'listening' ? { dlg: 12, mono: 8 } : { cloze: 6, para: 6, text: 8 };
  const pool = ITEMS.filter(it => usable(it, skill) && quota[it.type] != null);
  const out = [], got = {};
  // 難度分布：從 A2 到 B1+，中心在目前估計附近
  const targets = []; for (let i = 0; i < nq; i++) targets.push(th - .9 + 1.8 * i / (nq - 1));
  const used = new Set();
  let ti = 0;
  while (out.reduce((t, it) => t + it.qs.length, 0) < nq && ti < 200) {
    const tgt = targets[Math.min(targets.length - 1, out.reduce((t, it) => t + it.qs.length, 0))];
    const cand = rankItems(pool.filter(it => !used.has(it.id) && (got[it.type] || 0) + it.qs.length <= quota[it.type] + 1), tgt, { fam: false });
    if (!cand.length) break;
    const it = cand[0]; used.add(it.id); out.push(it); got[it.type] = (got[it.type] || 0) + it.qs.length; ti++;
  }
  return out.sort((a, b) => a.b - b.b);
}
function catPick(s) {
  const done = s.ans.filter(a => a.skill === s.skill);
  const share = {}; done.forEach(a => { share[a.type] = (share[a.type] || 0) + 1; });
  const target = s.skill === 'listening' ? { dlg: .55, mono: .3, old: .15 } : { cloze: .35, para: .2, text: .35, old: .1 };
  const pool = ITEMS.filter(it => usable(it, s.skill) && !s.used.has(it.id) && target[it.type] != null && it.qs.length <= Math.max(1, s.count - done.length + 1));
  if (!pool.length) return null;
  const n = Math.max(1, done.length);
  return pool.map(it => ({ it, sc: Math.abs(it.b - s.th) + ((share[it.type] || 0) / n > target[it.type] + .05 ? .45 : 0) + (itemSeen(it) ? .5 : 0) + Math.random() * .3 - (s.fam ? Math.min(famSeen(it), 3) * .06 : 0) }))
    .sort((a, b) => a.sc - b.sc)[0].it;
}

/* ---- 執行 ---- */
function startPractice(opt) {
  stopAll();
  const p = Object.assign({}, S.prSet, opt || {});
  const s = { v: 'pr', skill: p.skill, mode: p.mode, level: p.level || 'B1-', type: p.type || 'all', sk: p.sk || null, count: +p.count || 10, sec: +p.sec || 12, fam: p.fam !== false, tag: p.tag || null,
    ans: [], used: new Set(), queue: [], cur: null, qi: 0, phase: 'ready', t0: now(), overallEnd: null, section: null, sections: [] };
  if (s.mode === 'mock') {
    s.count = 20; s.section = 'listening'; s.skill = 'listening';
    s.th = startTheta('listening'); s.mu = s.th;
    s.queue = planMock('listening', s.th, 20);
  } else if (s.mode === 'cat') {
    s.th = startTheta(s.skill); s.mu = s.th; s.se = 1;
    if (s.skill === 'reading') s.overallEnd = now() + s.count * 75e3;
  } else {
    s.queue = planFixed(s); s.count = Math.min(s.count, s.queue.reduce((t, it) => t + it.qs.length, 0));
    s.mu = startTheta(s.skill);
    if (!s.queue.length) { toast('這個條件沒有題目，換一個難度或題型'); return; }
  }
  NAV.sheet = s;
  prNextItem();
}
function prSectionDone(s) { return s.ans.filter(a => a.skill === s.skill).length >= s.count; }
function prNextItem() {
  const s = NAV.sheet;
  clearInterval(s.tick); stopAll();
  if (prSectionDone(s) || (s.overallEnd && now() > s.overallEnd)) return prSectionEnd();
  let it = s.mode === 'cat' ? catPick(s) : s.queue.shift();
  if (!it) return prSectionEnd();
  s.cur = it; s.used.add(it.id); s.qi = 0; s.noAudio = false; s.hint = false; s.replay = 0;
  prStartQuestion(true);
}
function prStartQuestion(first) {
  const s = NAV.sheet, it = s.cur, q = it.qs[s.qi];
  s.ord = shuffle(q.o.map((_, i) => i)); s.sel = null; s.deadline = null;
  if (s.skill === 'listening' && first) {
    s.phase = 'playing'; render();
    speakSeq(it.audio, 1, ok => {
      if (NAV.sheet !== s || s.cur !== it) return;
      if (!ok) s.noAudio = true;
      s.phase = 'answer'; s.qt = now(); prArmTimer(ok); render();
    });
  } else { s.phase = 'answer'; s.qt = now(); prArmTimer(true); render(); }
}
function prArmTimer(audioOk) {
  const s = NAV.sheet;
  let lim = 0;
  if (s.skill === 'listening' && audioOk) lim = s.mode === 'timed' ? s.sec : (s.mode === 'cat' || s.mode === 'mock') ? 12 : 0;
  if (s.skill === 'reading' && s.mode === 'timed') lim = 75;
  if (lim) { s.deadline = now() + lim * 1000; s.limit = lim; }
  clearInterval(s.tick);
  if (!lim && !s.overallEnd) return;
  s.tick = setInterval(() => {
    if (NAV.sheet !== s) return clearInterval(s.tick);
    if (s.deadline) {
      const left = Math.max(0, s.deadline - now());
      const el = $('.countdown'); if (el) el.textContent = Math.ceil(left / 1000) + ' 秒';
      const bar = $('.timer i'); if (bar) bar.style.width = (left / (s.limit * 1000) * 100) + '%';
      if (left <= 0) { clearInterval(s.tick); return prSubmit(-1, true); }
    }
    if (s.overallEnd) {
      const el = $('.overall'); if (el) el.textContent = fmtLeft(s.overallEnd - now());
      if (now() > s.overallEnd) { clearInterval(s.tick); return prSectionEnd(); }
    }
  }, 250);
}
function fmtLeft(ms) { ms = Math.max(0, ms); const m = Math.floor(ms / 60000), sec = Math.floor(ms % 60000 / 1000); return m + ':' + String(sec).padStart(2, '0'); }
function prSubmit(k, timedOut) {
  const s = NAV.sheet; if (!s || s.v !== 'pr' || s.phase !== 'answer') return;
  clearInterval(s.tick);
  const it = s.cur, q = it.qs[s.qi], ok = k === q.a;
  s.ans.push({ qid: q.id, item: it.id, skill: s.skill, type: it.type, lv: it.lv, b: it.b, sk: q.sk, sel: k, ok: ok, to: !!timedOut, ms: now() - (s.qt || now()), hint: s.hint || s.noAudio, reason: null });
  if (S.seen.indexOf(q.id) < 0) S.seen.push(q.id);
  if (S.seen.length > 2000) S.seen = S.seen.slice(-2000);
  const e = eap(s.ans.filter(a => a.skill === s.skill), s.mu); s.th = e.th; s.se = e.se;
  if (s.mode === 'guided') { s.sel = k; s.phase = 'feedback'; sfx(ok ? 'pass' : 'fail'); save(); render(); return; }
  save(); prAdvance();
}
function prAdvance() {
  const s = NAV.sheet;
  if (s.qi + 1 < s.cur.qs.length && !prSectionDone(s)) { s.qi++; prStartQuestion(false); }
  else prNextItem();
}
function prSectionEnd() {
  const s = NAV.sheet;
  clearInterval(s.tick); stopAll();
  const part = s.ans.filter(a => a.skill === s.skill);
  if (part.length) s.sections.push({ skill: s.skill, th: s.th, se: s.se, n: part.length, ok: part.filter(a => a.ok).length });
  if (s.mode === 'mock' && s.section === 'listening') {
    s.section = 'reading'; s.skill = 'reading'; s.th = startTheta('reading'); s.mu = s.th;
    s.queue = planMock('reading', s.th, 20); s.overallEnd = now() + 25 * 60e3; s.cur = null; s.phase = 'break';
    render(); return;
  }
  prFinish();
}
function prFinish() {
  const s = NAV.sheet;
  const correct = s.ans.filter(a => a.ok).length;
  s.ans.forEach(a => {
    const k = S.pskill[a.sk] || (S.pskill[a.sk] = { n: 0, ok: 0 }); k.n++; if (a.ok) k.ok++;
    const t = S.ptype[a.type] || (S.ptype[a.type] = { n: 0, ok: 0 }); t.n++; if (a.ok) t.ok++;
    const st = S.pstat[a.skill] || (S.pstat[a.skill] = { n: 0, ok: 0 }); st.n++; if (a.ok) st.ok++;
  });
  if (s.mode === 'cat' || s.mode === 'mock') s.sections.forEach(sec => { if (sec.n >= 8) S.cat[sec.skill] = { th: sec.th, se: sec.se, at: now() }; });
  const one = s.sections.length === 1 ? s.sections[0] : null;
  S.sessions.push({ at: now(), skill: s.mode === 'mock' ? 'mock' : s.skill, mode: s.mode, level: s.mode === 'guided' || s.mode === 'timed' ? s.level : null, total: s.ans.length, correct: correct, th: (s.mode === 'cat' && one) ? one.th : null });
  if (S.sessions.length > 30) S.sessions = S.sessions.slice(-30);
  if (s.tag) doneTask(s.tag);
  logToday('p'); save();
  NAV.sheet = { v: 'prres', src: s };
  render();
}

/* ---- 畫面 ---- */
function audioScript(it) { return it.audio.map(a => '<div style="margin:2px 0">' + (a[0] ? '<span class="pill" style="margin-right:6px">' + esc(a[0]) + '</span>' : '') + zy(a[1]) + '</div>').join(''); }
function readingText(it) {
  if (it.type === 'cloze') { const parts = it.text.split('＿＿'); return '<div class="passage">' + zy(parts[0]) + '<span style="display:inline-block;width:3.2em;border-bottom:1.5px solid var(--blue);margin:0 .2em"></span>' + zy(parts[1]) + '</div>'; }
  const body = esc(it.text).split('\n').map(line => zy(line.replace(/&amp;/g, '&'))).join('<br>');
  return '<div class="passage' + (it.type === 'text' && it.text.indexOf('\n') >= 0 ? ' notice' : '') + '">' + (it.title ? '<div class="tiny" style="margin-bottom:4px">' + esc(it.title) + '</div>' : '') + body + '</div>';
}
function kwChips(it) {
  if (!it.kw || !it.kw.length) return '';
  return '<div class="small muted ui" style="margin-top:10px">' + esc('အဓိကစကားလုံး（☆ နှိပ်ရင် စာအုပ်ထဲရောက်မယ်）') + '</div><div class="chips" style="margin-top:6px">' +
    it.kw.map(k => { const on = S.w[k.wid] && S.w[k.wid].star; return '<span class="chip">' + zy(k[0]) + ' <span class="my" lang="my" style="font-size:.75em;display:inline">' + esc(k[1]) + '</span><button class="ib star' + (on ? ' on' : '') + '" style="width:28px;height:28px;border:0;background:none" data-a="star" data-id="' + esc(k.wid) + '">' + ICON.star + '</button></span>'; }).join('') + '</div>';
}
SHEETS.pr = function (s) {
  if (s.phase === 'break') {
    const L = s.sections[0];
    return sheetHead('စမ်းသပ် စာမေးပွဲ') + '<div class="card endcard"><div class="mark">' + ICON.check + '</div><div>' + B('နားထောင်ပိုင်း ပြီးပြီ（' + L.ok + ' / ' + L.n + '）') + '</div><p class="muted">' + B('နောက်တစ်ပိုင်းက ဖတ်ခြင်း၊ မေးခွန်း ၂၀၊ မိနစ် ၂၅။ အဆင်သင့်ဖြစ်မှ စပါ။') + '</p></div><button class="btn pri block" style="margin-top:16px" data-a="pnextsec">' + B('ဖတ်ခြင်း စမယ်') + '</button>';
  }
  const it = s.cur, q = it.qs[s.qi];
  const done = s.ans.filter(a => a.skill === s.skill).length;
  const title = (s.mode === 'mock' ? 'စာမေးပွဲ・' : '') + (s.skill === 'listening' ? 'နားထောင်' : 'ဖတ်') + (s.mode !== 'mock' ? '・' + MODE_L[s.mode][1] : '');
  let h = sheetHead(title, done + (s.phase === 'feedback' ? 0 : 1), s.count);
  h += '<div class="row between" style="margin:-6px 0 10px"><span class="pill ui">' + esc(TYN(it.type) + (it.qs.length > 1 ? '・' + MYNUM(s.qi + 1) + '/' + MYNUM(it.qs.length) : '')) + '</span>' + (s.overallEnd ? '<span class="small">⏱ <span class="overall">' + fmtLeft(s.overallEnd - now()) + '</span></span>' : '') + '</div>';
  const fb = s.phase === 'feedback';
  if (s.skill === 'listening') {
    const canReplay = s.mode === 'guided';
    h += '<div class="card center" style="padding:16px"><button class="play' + (s.phase === 'playing' ? ' busy' : '') + '" data-a="preplay"' + (canReplay && s.phase !== 'playing' ? '' : ' disabled') + '>' + ICON.sound + '</button>' +
      '<div class="muted ui" style="margin-top:6px">' + esc(s.phase === 'playing' ? 'ဖွင့်နေတယ်… ဂရုစိုက် နားထောင်ပါ' : canReplay ? 'ထပ်နားထောင်ချင်ရင် 🔊 ကိုနှိပ်' : 'အသံ ပြီးသွားပြီ') + '</div>' +
      (canReplay && s.phase !== 'playing' ? '<div class="chips" style="justify-content:center;margin-top:8px"><button class="chip" data-a="pslow">' + B('ဖြည်းဖြည်း') + '</button>' + (!fb && !s.hint ? '<button class="chip" data-a="phint">' + B('စာ ကြည့်မယ်') + '</button>' : '') + '</div>' : '') +
      (s.noAudio ? '<div class="small ui" style="margin-top:6px">' + esc('ဒီဖုန်းမှာ တရုတ်အသံ မရှိလို့ စာကို ကြည့်ပါ။') + '</div>' : '') + '</div>';
    if (fb || s.noAudio || s.hint) h += '<div class="passage" style="margin-top:10px">' + audioScript(it) + (fb ? MY(it.my) : '') + '</div>';
  } else {
    h += readingText(it);
    if (fb) h += '<div style="margin-top:6px">' + MY(it.my) + '</div>';
  }
  h += '<div style="margin:14px 0 8px;font-weight:500;font-size:1.12rem">' + zy(q.q) + (q.qMy ? '<span class="my" lang="my" style="display:block;font-weight:400">' + esc(q.qMy) + '</span>' : '') + '</div>';
  if (s.deadline && s.phase === 'answer') h += '<div class="row between"><div class="timer grow" style="margin:0"><i style="width:' + Math.max(0, (s.deadline - now()) / (s.limit * 1000) * 100) + '%"></i></div><span class="countdown tiny">' + esc(Math.ceil((s.deadline - now()) / 1000) + ' 秒') + '</span></div><div style="height:10px"></div>';
  s.ord.forEach((k, i) => {
    let c = '';
    if (fb) c = k === q.a ? ' ok' : (k === s.sel ? ' bad' : ' dim');
    h += '<button class="opt' + c + '" data-a="pans" data-k="' + k + '"' + (s.phase !== 'answer' ? ' disabled' : '') + '><span class="k">' + 'ABCD'[i] + '</span><span class="grow">' + zy(q.o[k][0]) + (q.o[k][1] && (s.mode === 'guided' || fb) ? '<small class="my">' + esc(q.o[k][1]) + '</small>' : '') + '</span></button>';
  });
  if (s.mode !== 'guided' && !fb && s.ans.length === 0 && s.qi === 0) h += '<p class="small muted ui" style="margin-top:8px">' + esc('စာမေးပွဲလိုပဲ အဖြေတွေမှာ မြန်မာဘာသာ မပြဘူး။ ပြီးရင် ရလဒ်မှာ ကြည့်လို့ရတယ်။') + '</p>';
  if (fb) {
    const ok = s.sel === q.a;
    h += '<div class="fb ' + (ok ? 'ok' : 'bad') + '"><b>' + B(ok ? 'မှန်တယ် ✓' : (s.sel === -1 ? 'အချိန်ပြည့်ပြီ' : 'မှားတယ်')) + '</b><div class="why"><span class="my" lang="my" style="display:block">' + esc(q.why) + '</span>' +
      (q.ev ? '<div class="small" style="margin-top:6px"><span class="ui">' + esc('အထောက်အထား：') + '</span>' + zy(q.ev) + '</div>' : '') + (q.tip ? '<div class="note small" style="margin-top:8px"><span class="ui">' + esc('💡 နည်းလမ်း：') + '</span>' + zy(q.tip) + '</div>' : '') + '</div></div>';
    if (s.qi === it.qs.length - 1) h += kwChips(it);
    h += '<button class="btn pri block" style="margin-top:12px" data-a="pnext">' + B(done < s.count ? 'နောက်တစ်ခု →' : 'ရလဒ် ကြည့်မယ်') + '</button>';
  }
  return h;
};
function accTable(list, names) {
  return list.map(x => '<div class="row between" style="padding:8px 0;border-top:1px solid var(--line)"><span class="ui">' + esc(names[x.k] ? names[x.k][1] : x.k) + '</span><span>' + x.ok + '/' + x.n + '　<b style="font-weight:600">' + Math.round(x.ok / x.n * 100) + '%</b></span></div>').join('');
}
function group(ans, key) { const m = {}; ans.forEach(a => { const k = a[key]; m[k] = m[k] || { k, n: 0, ok: 0 }; m[k].n++; if (a.ok) m[k].ok++; }); return Object.values(m).sort((a, b) => a.ok / a.n - b.ok / b.n); }
SHEETS.prres = function (r) {
  const s = r.src, correct = s.ans.filter(a => a.ok).length;
  const avg = Math.round(s.ans.reduce((t, a) => t + a.ms, 0) / Math.max(1, s.ans.length) / 1000);
  let h = sheetHead('ရလဒ်');
  h += '<div class="stat"><div><b>' + correct + '/' + s.ans.length + '</b><span class="ui">မှန်</span></div><div><b>' + s.ans.filter(a => a.to).length + '</b><span class="ui">အချိန်ပြည့်</span></div><div><b>' + avg + 's</b><span class="ui">ပျမ်းမျှ</span></div></div>';
  if (s.mode === 'cat' || s.mode === 'mock') {
    s.sections.forEach(sec => {
      const band = bandOf(sec.th), gap = B1_LINE - sec.th;
      h += '<div class="card" style="margin-top:10px"><div class="row between"><b class="ui">' + esc(sec.skill === 'listening' ? 'နားထောင်' : 'ဖတ်') + '</b><span class="pill blue">' + esc(BAND_NAME[band][1]) + '</span></div>' + scaleBar(sec.th, sec.se) +
        '<p class="ui" style="margin:8px 0 0">' + esc(gap > .35 ? 'B1 နဲ့ ဝေးသေးတယ်။ A2+ မေးခွန်းတွေကို အရင် ခိုင်မာအောင် လေ့ကျင့်ပါ။' : gap > 0 ? 'B1 နဲ့ အရမ်းနီးပြီ！ B1- မေးခွန်းတွေ များများ လေ့ကျင့်ပါ။' : 'B1 အဆင့်လောက် ရောက်နေပြီ။ B1 မေးခွန်းတွေနဲ့ ပိုခိုင်မာအောင် ဆက်လေ့ကျင့်ပါ။') + '</p>' +
        '<p class="small muted ui" style="margin:4px 0 0">' + esc('ခန့်မှန်းနိုင်တဲ့ အပိုင်းအခြား：' + BAND_NAME[bandOf(sec.th - sec.se)][1] + ' ～ ' + BAND_NAME[bandOf(sec.th + sec.se)][1] + '။ မေးခွန်းများလေ ပိုတိကျလေ။') + '</p></div>';
    });
    h += '<p class="tiny" style="margin:6px 4px">' + esc('Practice estimate only — not an official TOCFL score.') + '</p>';
  }
  const bySk = group(s.ans, 'sk').filter(x => x.n >= 2), byTy = group(s.ans, 'type');
  if (bySk.length) h += '<div class="sec"><h2>' + B('ဘယ်အမျိုးအစား အားနည်းလဲ') + '</h2></div><div class="card">' + accTable(bySk, SKILL_NAMES) + '</div>';
  if (byTy.length > 1) h += '<div class="card" style="margin-top:8px">' + accTable(byTy, TYPE_NAMES) + '</div>';
  const weakType = byTy.find(x => x.ok / x.n < .7 && x.n >= 2);
  h += '<div class="btns" style="margin-top:14px">' + endBtn() + (weakType && !NAV.flow ? '<button class="btn" data-a="pweak" data-t="' + weakType.k + '" data-s="' + s.ans.find(a => a.type === weakType.k).skill + '">' + B('အားနည်းတာ လေ့ကျင့်မယ်：' + TYPE_NAMES[weakType.k][1]) + '</button>' : '') + '</div>' +
    '<button class="linkbtn" data-a="pagain">' + esc('ထပ်လေ့ကျင့်မယ်') + '</button>';
  // 逐題
  h += '<div class="sec"><h2>' + B('တစ်ခုချင်း ပြန်ကြည့်') + '</h2></div>';
  let lastItem = null;
  s.ans.forEach((a, i) => {
    const it = itemById(a.item), q = it.qs.find(x => x.id === a.qid);
    if (a.item !== lastItem) {
      if (lastItem) h += '</div>';
      h += '<div class="card"><span class="pill ui">' + esc((a.skill === 'listening' ? 'နားထောင်' : 'ဖတ်') + '・' + TYN(it.type) + '・' + it.lv) + '</span>' +
        '<div style="margin-top:8px;line-height:2.1">' + (a.skill === 'listening' ? audioScript(it) : (it.type === 'cloze' ? zy(it.text.replace('＿＿', '【' + it.qs[0].o[it.qs[0].a][0] + '】')) : zy(it.text.replace(/\n/g, '　')))) + '</div>' + MY(it.my) + kwChips(it);
      const fs = famOf(it).filter(id => S.w[id] && S.w[id].seen);
      if (fs.length) h += '<div class="small muted" style="margin-top:8px"><span class="ui">' + esc('သင်ပြီးသား စကားလုံး：') + '</span>' + zy(fs.map(id => WORDS[id].zh).join('、')) + '</div>';
      lastItem = a.item;
    }
    h += '<div style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px"><div class="row between"><span style="font-weight:500">' + zy(q.q) + '</span><span class="pill ui' + (a.ok ? ' ok' : '') + '">' + esc(a.ok ? 'မှန်' : (a.to ? 'အချိန်ပြည့်' : 'မှား')) + '</span></div>' +
      '<div><span class="ui small">' + esc('အဖြေ：') + '</span>' + zy(q.o[q.a][0]) + (!a.ok && a.sel >= 0 ? '<span class="muted">　<span class="ui small">' + esc('မင်းရွေးတာ：') + '</span>' + zy(q.o[a.sel][0]) + '</span>' : '') + '</div>' +
      '<div class="ui small" style="color:var(--ink2)">' + esc(q.why) + '</div>' + (q.tip ? '<div class="note small" style="margin-top:6px"><span class="ui">' + esc('💡 ') + '</span>' + zy(q.tip) + '</div>' : '');
    if (!a.ok) {
      h += '<div class="small muted ui" style="margin-top:8px">' + esc('ဘာကြောင့် မှားလဲ？') + '</div><div class="reasons">' + REASONS.filter(x => a.skill === 'listening' || x[0] !== 'sound').map(x => '<button class="chip' + (a.reason === x[0] ? ' on' : '') + '" data-a="preason" data-i="' + i + '" data-r="' + x[0] + '">' + B(x[2]) + '</button>').join('') + '</div>';
      if (a.reason) h += '<div class="note small ui" style="margin-top:8px">' + esc({ sound: 'စာကို အရင်ကြည့်ပြီး ဖြည်းဖြည်း ပြန်နားထောင်ပါ။', meaning: 'မသိတဲ့ စကားလုံးကို ☆ နှိပ်ပြီး စာအုပ်ထဲ ထည့်ပါ။', options: 'မေးခွန်းကို အရင်ဖတ်၊ ပြီးမှ အဖြေတွေ ဖတ်ပါ။ စာလုံးတိုင်း နားလည်စရာ မလိုဘူး။', hesitation: 'အထောက်အထား စာကြောင်းကို အရင်ရှာ၊ မဖြစ်နိုင်တာတွေ ဖယ်ပါ။', other: 'ဒီလို မေးခွန်းမျိုး နောက်တစ်ခါ ထပ်စမ်းပါ။' }[a.reason]) + '</div>';
    }
    h += '</div>';
  });
  if (lastItem) h += '</div>';
  return h;
};
