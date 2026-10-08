/* ===== 聽讀練習、CAT、模擬考 =====
   題庫＝本 App 新寫的 TOCFL 型題目（EXAM）＋明朗中文的短文題（MING.questions，聽讀共用）。
   難度用數字 b（約 -2～2），能力 θ 用 EAP（貝氏期望值）估計；猜對機率設 25%（四選一）。
   這是練習用的估計，不是 TOCFL 官方計分。 */
const BANDS = ['A1', 'A2', 'A2+', 'B1-', 'B1', 'B1+', 'B2'];
const BAND_B = { A1: -2, A2: -1, 'A2+': -.45, 'B1-': .1, B1: .6, 'B1+': 1.1, B2: 1.7 };
const BAND_NAME = { A1: ['A1・入門級', 'A1'], A2: ['A2・基礎級', 'A2'], 'A2+': ['A2 偏高', 'A2 အမြင့်ပိုင်း'], 'B1-': ['B1 初期・進階級', 'B1 အစပိုင်း'], B1: ['B1・進階級', 'B1'], 'B1+': ['B1 偏高', 'B1 အမြင့်ပိုင်း'], B2: ['B2・高階級', 'B2'] };
const LEVELS = ['A2', 'A2+', 'B1-', 'B1'];
const MODE_L = { guided: ['學習', 'အကူအညီနဲ့'], timed: ['限時', 'အချိန်ကန့်သတ်'], cat: ['CAT', 'CAT'], mock: ['模擬考', 'စမ်းသပ်စာမေးပွဲ'] };
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
VIEWS.practice = function () {
  const p = S.prSet;
  const seg = (k, opts) => '<div class="seg">' + opts.map(o => '<button class="' + (String(p[k]) === String(o[0]) ? 'on' : '') + '" data-a="pset" data-k="' + k + '" data-v="' + o[0] + '">' + esc(o[1]) + (o[2] ? '<small class="my">' + esc(o[2]) + '</small>' : '') + '</button>').join('') + '</div>';
  let h = '<p class="small muted" style="margin:4px 2px 12px">' + zy('照 TOCFL 的題型練習：對話、廣播、選詞填空、段落填空、公告與短文。') + '<small class="my">TOCFL ပုံစံအတိုင်း လေ့ကျင့်：စကားပြော၊ ကြေညာချက်၊ ကွက်လပ်ဖြည့်၊ ကြော်ငြာ/စာတို။</small></p>';
  // 目前估計
  h += '<div class="card"><div class="row between"><b style="font-weight:500">' + zy('目前程度估計') + '</b><span class="tiny">' + esc('黃線＝進階級（B1）參考線') + '</span></div>';
  ['listening', 'reading'].forEach(sk => {
    const c = S.cat[sk];
    h += '<div style="margin-top:10px"><div class="row between small"><span>' + zy(sk === 'listening' ? '聽力' : '閱讀') + '</span><span>' + (c ? '<span class="pill blue">' + esc(BAND_NAME[bandOf(c.th)][0]) + '</span>' : '<span class="tiny">' + esc('還沒有 CAT 紀錄') + '</span>') + '</span></div>' + (c ? scaleBar(c.th, c.se) : '') + '</div>';
  });
  if (!S.cat.listening && !S.cat.reading) h += '<p class="tiny" style="margin-top:8px">' + esc('先做一次 CAT（20 題），App 就知道從哪個難度開始。') + '</p>';
  h += '</div>';
  const wk = weakList(4);
  if (wk.length) {
    h += '<div class="card" style="margin-top:10px"><b style="font-weight:500">' + zy('最需要加強') + '</b><div class="stack" style="margin-top:8px">' +
      wk.map(w => '<div class="row between small"><span>' + zy(SKILL_NAMES[w.k][0]) + '<small class="my">' + esc(SKILL_NAMES[w.k][1]) + '</small></span><span>' + Math.round(w.acc * 100) + '%　<span class="tiny">' + w.n + ' 題</span></span></div>').join('') + '</div></div>';
  }
  // 設定
  h += '<div class="card stack" style="margin-top:10px">';
  h += '<div><div class="tiny">' + zy('練什麼') + '</div>' + seg('skill', [['listening', '聽力', 'နားထောင်'], ['reading', '閱讀', 'ဖတ်']]) + '</div>';
  h += '<div><div class="tiny">' + zy('方式') + '</div>' + seg('mode', [['guided', '學習', 'အကူအညီ'], ['timed', '限時', 'အချိန်'], ['cat', 'CAT', ''], ['mock', '模擬考', 'စမ်းစာမေးပွဲ']]) + '</div>';
  if (p.mode === 'guided' || p.mode === 'timed') {
    h += '<div><div class="tiny">' + zy('難度') + '</div>' + seg('level', [['A2', 'A2'], ['A2+', 'A2+'], ['B1-', 'B1-'], ['B1', 'B1'], ['all', '全部']]) + '</div>';
    const types = p.skill === 'listening' ? [['all', '全部'], ['dlg', '短對話'], ['mono', '長對話・廣播'], ['old', '短文']] : [['all', '全部'], ['cloze', '選詞'], ['para', '段落'], ['text', '閱讀'], ['old', '短文']];
    if (!types.some(t => t[0] === p.type)) p.type = 'all';
    h += '<div><div class="tiny">' + zy('題型') + '</div><div class="chips">' + types.map(t => '<button class="chip' + (p.type === t[0] ? ' on' : '') + '" data-a="pset" data-k="type" data-v="' + t[0] + '">' + esc(t[1]) + '</button>').join('') + '</div></div>';
  }
  if (p.mode !== 'mock') {
    const counts = p.mode === 'cat' ? [10, 20, 30] : [5, 10, 20];
    if (counts.indexOf(+p.count) < 0) p.count = counts[1];
    h += '<div><div class="tiny">' + zy('題數') + '</div>' + seg('count', counts.map(n => [n, n + ' 題'])) + '</div>';
  }
  if (p.mode === 'timed' && p.skill === 'listening') h += '<div><div class="tiny">' + zy('聽完後的作答時間') + '</div>' + seg('sec', [[20, '20 秒'], [15, '15 秒'], [12, '12 秒'], [8, '8 秒']]) + '</div>';
  if (p.mode !== 'mock') h += '<button class="set" style="width:100%;text-align:left;padding:4px 0;border:0" data-a="pfam"><span class="small">' + T('優先出有我學過的字的題目', 'သင်ပြီးသားစကားလုံးပါတဲ့ မေးခွန်းကို ဦးစားပေး') + '</span><span class="sw' + (p.fam ? ' on' : '') + '"></span></button>';
  const desc = {
    guided: ['不限時間。每題馬上看答案、說明和關鍵字；聽力可以重聽、放慢。', 'အချိန်မကန့်သတ်၊ ချက်ချင်း အဖြေ/ရှင်းလင်းချက်။'],
    timed: [p.skill === 'listening' ? '錄音只播一次，播完才開始倒數。最後一起看答案。' : '每題 75 秒（TOCFL 大約一題 72 秒）。最後一起看答案。', 'အချိန်ကန့်သတ်၊ နောက်ဆုံးမှ အဖြေကြည့်။'],
    cat: [p.skill === 'listening' ? '答對變難、答錯變簡單。錄音只播一次，每題 12 秒，不能回上一題。' : '答對變難、答錯變簡單。整回時間＝題數 × 75 秒，不能回上一題。', 'မှန်ရင်ခက်၊ မှားရင်လွယ်။ နောက်ပြန်မရ။'],
    mock: ['迷你模擬考：聽力 20 題＋閱讀 20 題，約 50 分鐘。題目由易到難，題型照 TOCFL。聽力只播一次；閱讀共 25 分鐘。', 'နားထောင် ၂၀ ＋ ဖတ် ၂၀၊ မိနစ် ၅၀ လောက်။ TOCFL ပုံစံ။'] }[p.mode];
  h += '<div class="note small">' + zy(desc[0]) + MY(desc[1]) + '</div>';
  h += '<button class="btn pri block" data-a="pstart">' + T('開始', 'စမယ်') + '</button></div>';
  // 紀錄
  const ss = S.sessions.slice(-6).reverse();
  if (ss.length) {
    h += '<div class="sec"><h2>' + T('最近紀錄', 'မှတ်တမ်း') + '</h2></div><div class="list">';
    ss.forEach(s => { h += '<div class="li"><span class="grow small">' + zy((s.skill === 'mock' ? '聽力＋閱讀' : s.skill === 'listening' ? '聽力' : '閱讀') + '・' + MODE_L[s.mode][0]) + (s.th != null ? ' <span class="pill blue">' + esc(BAND_NAME[bandOf(s.th)][0]) + '</span>' : (s.level && s.level !== 'all' ? ' <span class="pill">' + esc(s.level) + '</span>' : '')) + '<small class="tiny" style="display:block">' + esc(new Date(s.at).toLocaleDateString('zh-TW')) + '</small></span><b style="font-weight:400">' + s.correct + '/' + s.total + '</b></div>'; });
    h += '</div>';
  }
  const nL = ITEMS.filter(it => usable(it, 'listening')).reduce((t, it) => t + it.qs.length, 0), nR = ITEMS.filter(it => usable(it, 'reading')).reduce((t, it) => t + it.qs.length, 0);
  h += '<p class="tiny" style="margin:12px 4px">' + esc('題庫：聽力 ' + nL + ' 題、閱讀 ' + nR + ' 題（短文題聽讀共用）。TOCFL 型題目為本 App 新寫；短文題與緬文說明來自明朗中文。程度估計只是練習參考，不是官方分數。') + '</p>';
  return h;
};

/* ---- 出題 ---- */
function rankItems(pool, target, s) {
  return pool.map(it => ({ it, sc: Math.abs(it.b - target) + (itemSeen(it) ? .6 : 0) + Math.random() * .35 - (s.fam ? Math.min(famSeen(it), 3) * .08 : 0) + (it.type === 'old' ? .15 : 0) }))
    .sort((a, b) => a.sc - b.sc).map(x => x.it);
}
function planFixed(s) {
  // 學習／限時：依難度與題型篩選，湊到題數
  let pool = ITEMS.filter(it => usable(it, s.skill) && (s.type === 'all' || it.type === s.type));
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
  const s = { v: 'pr', skill: p.skill, mode: p.mode, level: p.level || 'B1-', type: p.type || 'all', count: +p.count || 10, sec: +p.sec || 12, fam: p.fam !== false, tag: p.tag || null,
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
  return '<div class="tiny" style="margin-top:10px">' + zy('這題的關鍵字（按 ☆ 加入生字本）') + '</div><div class="chips" style="margin-top:6px">' +
    it.kw.map(k => { const on = S.w[k.wid] && S.w[k.wid].star; return '<span class="chip">' + zy(k[0]) + ' <span class="my" lang="my" style="font-size:.75em;display:inline">' + esc(k[1]) + '</span><button class="ib star' + (on ? ' on' : '') + '" style="width:28px;height:28px;border:0;background:none" data-a="star" data-id="' + esc(k.wid) + '">' + ICON.star + '</button></span>'; }).join('') + '</div>';
}
SHEETS.pr = function (s) {
  if (s.phase === 'break') {
    const L = s.sections[0];
    return sheetHead('模擬考') + '<div class="card endcard"><div class="mark">' + ICON.check + '</div><div>' + T('聽力完成 ' + L.ok + ' / ' + L.n, 'နားထောင်ပိုင်း ပြီးပြီ') + '</div><p class="small muted">' + T('下一部分是閱讀，20 題，共 25 分鐘。準備好再開始。', 'နောက်ပိုင်း ဖတ်ခြင်း ၂၀ မေးခွန်း၊ မိနစ် ၂၅။') + '</p></div><button class="btn pri block" style="margin-top:16px" data-a="pnextsec">' + T('開始閱讀', 'ဖတ်ခြင်း စမယ်') + '</button>';
  }
  const it = s.cur, q = it.qs[s.qi];
  const done = s.ans.filter(a => a.skill === s.skill).length;
  const title = s.mode === 'mock' ? '模擬考・' + (s.skill === 'listening' ? '聽力' : '閱讀') : (s.skill === 'listening' ? '聽力' : '閱讀') + '・' + MODE_L[s.mode][0];
  let h = sheetHead(title, done + (s.phase === 'feedback' ? 0 : 1), s.count);
  h += '<div class="row between" style="margin:-6px 0 10px"><span class="pill">' + esc((TYPE_NAMES[it.type] || ['', ''])[0] + (it.qs.length > 1 ? '・第 ' + (s.qi + 1) + '/' + it.qs.length + ' 題' : '')) + '</span>' + (s.overallEnd ? '<span class="tiny">' + esc('剩下 ') + '<span class="overall">' + fmtLeft(s.overallEnd - now()) + '</span></span>' : '') + '</div>';
  const fb = s.phase === 'feedback';
  if (s.skill === 'listening') {
    const canReplay = s.mode === 'guided';
    h += '<div class="card center" style="padding:16px"><button class="play' + (s.phase === 'playing' ? ' busy' : '') + '" data-a="preplay"' + (canReplay && s.phase !== 'playing' ? '' : ' disabled') + '>' + ICON.sound + '</button>' +
      '<div class="small muted" style="margin-top:6px">' + zy(s.phase === 'playing' ? '正在播放…（只播一次，請專心聽）' : canReplay ? '可以按喇叭重聽' : '錄音已播完') + '</div>' +
      (canReplay && s.phase !== 'playing' ? '<div class="chips" style="justify-content:center;margin-top:8px"><button class="chip" data-a="pslow">' + zy('放慢再聽') + '</button>' + (!fb && !s.hint ? '<button class="chip" data-a="phint">' + zy('看原文') + '</button>' : '') + '</div>' : '') +
      (s.noAudio ? '<div class="tiny" style="margin-top:6px">' + esc('這台手機沒有中文語音，先看文字。') + '</div>' : '') + '</div>';
    if (fb || s.noAudio || s.hint) h += '<div class="passage" style="margin-top:10px">' + audioScript(it) + (fb ? MY(it.my) : '') + '</div>';
  } else {
    h += readingText(it);
    if (fb) h += '<div style="margin-top:6px">' + MY(it.my) + '</div>';
  }
  h += '<div style="margin:14px 0 8px;font-weight:500">' + zy(q.q) + (q.qMy ? '<small class="my">' + esc(q.qMy) + '</small>' : '') + '</div>';
  if (s.deadline && s.phase === 'answer') h += '<div class="row between"><div class="timer grow" style="margin:0"><i style="width:' + Math.max(0, (s.deadline - now()) / (s.limit * 1000) * 100) + '%"></i></div><span class="countdown tiny">' + esc(Math.ceil((s.deadline - now()) / 1000) + ' 秒') + '</span></div><div style="height:10px"></div>';
  s.ord.forEach((k, i) => {
    let c = '';
    if (fb) c = k === q.a ? ' ok' : (k === s.sel ? ' bad' : ' dim');
    h += '<button class="opt' + c + '" data-a="pans" data-k="' + k + '"' + (s.phase !== 'answer' ? ' disabled' : '') + '><span class="k">' + 'ABCD'[i] + '</span><span class="grow">' + zy(q.o[k][0]) + (q.o[k][1] && (s.mode === 'guided' || fb) ? '<small class="my">' + esc(q.o[k][1]) + '</small>' : '') + '</span></button>';
  });
  if (s.mode !== 'guided' && !fb && s.ans.length === 0 && s.qi === 0) h += '<p class="tiny" style="margin-top:8px">' + esc('考試模式不顯示選項的緬文，跟正式考試一樣；做完後在結果裡都看得到。') + '</p>';
  if (fb) {
    const ok = s.sel === q.a;
    h += '<div class="fb ' + (ok ? 'ok' : 'bad') + '"><b>' + T(ok ? '答對了' : (s.sel === -1 ? '時間到' : '答錯了'), ok ? 'မှန်တယ်' : 'မှားတယ်') + '</b><div class="why"><span class="my" lang="my" style="display:block">' + esc(q.why) + '</span>' +
      (q.ev ? '<div class="small" style="margin-top:4px">' + zy('根據：' + q.ev) + '</div>' : '') + (q.tip ? '<div class="note small" style="margin-top:8px">' + zy('技巧：' + q.tip) + '</div>' : '') + '</div></div>';
    if (s.qi === it.qs.length - 1) h += kwChips(it);
    h += '<button class="btn pri block" style="margin-top:12px" data-a="pnext">' + T(done < s.count ? '下一題' : '看結果', done < s.count ? 'နောက်တစ်ခု' : 'ရလဒ်') + '</button>';
  }
  return h;
};
function accTable(list, names) {
  return list.map(x => '<div class="row between small" style="padding:6px 0;border-top:1px solid var(--line)"><span>' + zy(names[x.k] ? names[x.k][0] : x.k) + '</span><span>' + x.ok + '/' + x.n + '　<b style="font-weight:500">' + Math.round(x.ok / x.n * 100) + '%</b></span></div>').join('');
}
function group(ans, key) { const m = {}; ans.forEach(a => { const k = a[key]; m[k] = m[k] || { k, n: 0, ok: 0 }; m[k].n++; if (a.ok) m[k].ok++; }); return Object.values(m).sort((a, b) => a.ok / a.n - b.ok / b.n); }
SHEETS.prres = function (r) {
  const s = r.src, correct = s.ans.filter(a => a.ok).length;
  const avg = Math.round(s.ans.reduce((t, a) => t + a.ms, 0) / Math.max(1, s.ans.length) / 1000);
  let h = sheetHead(s.mode === 'mock' ? '模擬考結果' : '結果');
  h += '<div class="stat"><div><b>' + correct + '/' + s.ans.length + '</b><span>' + zy('答對') + '</span></div><div><b>' + s.ans.filter(a => a.to).length + '</b><span>' + zy('時間到') + '</span></div><div><b>' + avg + 's</b><span>' + zy('平均') + '</span></div></div>';
  if (s.mode === 'cat' || s.mode === 'mock') {
    s.sections.forEach(sec => {
      const band = bandOf(sec.th), gap = B1_LINE - sec.th;
      h += '<div class="card" style="margin-top:10px"><div class="row between"><b style="font-weight:500">' + zy(sec.skill === 'listening' ? '聽力' : '閱讀') + '</b><span class="pill blue">' + esc(BAND_NAME[band][0]) + '</span></div>' + scaleBar(sec.th, sec.se) +
        '<p class="small" style="margin:8px 0 0">' + zy(gap > .35 ? '離進階級（B1）還有一段距離，先把 A2 偏高的題目練穩。' : gap > 0 ? '很接近進階級（B1）了！多練 B1- 的題目。' : '已經在進階級（B1）附近，繼續練 B1 的題目讓它更穩。') + '</p>' +
        '<p class="tiny" style="margin:4px 0 0">' + esc('答 ' + sec.n + ' 題，估計範圍 ' + BAND_NAME[bandOf(sec.th - sec.se)][0] + ' ～ ' + BAND_NAME[bandOf(sec.th + sec.se)][0] + '。題數越多越準。') + '</p></div>';
    });
    h += '<p class="tiny" style="margin:6px 4px">' + esc('這是用本 App 題目的難度估計的練習結果，不是 TOCFL 官方分數。') + '</p>';
  }
  const bySk = group(s.ans, 'sk').filter(x => x.n >= 2), byTy = group(s.ans, 'type');
  if (bySk.length) h += '<div class="sec"><h2>' + T('哪種題目比較弱', 'ဘယ်အမျိုးအစား အားနည်းလဲ') + '</h2></div><div class="card">' + accTable(bySk, SKILL_NAMES) + '</div>';
  if (byTy.length > 1) h += '<div class="card" style="margin-top:8px">' + accTable(byTy, TYPE_NAMES) + '</div>';
  const weakType = byTy.find(x => x.ok / x.n < .7 && x.n >= 2);
  h += '<div class="btns" style="margin-top:14px">' + (weakType ? '<button class="btn pri" data-a="pweak" data-t="' + weakType.k + '" data-s="' + s.ans.find(a => a.type === weakType.k).skill + '">' + T('練我最弱的：' + TYPE_NAMES[weakType.k][0], 'အားနည်းတာ လေ့ကျင့်') + '</button>' : '') +
    '<div class="btns two"><button class="btn" data-a="pagain">' + T('再練一回', 'ထပ်လေ့ကျင့်') + '</button><button class="btn' + (weakType ? '' : ' pri') + '" data-a="close">' + T('完成', 'ပြီးပြီ') + '</button></div></div>';
  // 逐題
  h += '<div class="sec"><h2>' + T('一題一題看', 'တစ်ခုချင်းကြည့်') + '</h2></div>';
  let lastItem = null;
  s.ans.forEach((a, i) => {
    const it = itemById(a.item), q = it.qs.find(x => x.id === a.qid);
    if (a.item !== lastItem) {
      if (lastItem) h += '</div>';
      h += '<div class="card"><div class="tiny">' + esc((a.skill === 'listening' ? '聽力' : '閱讀') + '・' + TYPE_NAMES[it.type][0] + '・' + it.lv) + '</div>' +
        '<div class="small" style="margin-top:6px;line-height:2.1">' + (a.skill === 'listening' ? audioScript(it) : (it.type === 'cloze' ? zy(it.text.replace('＿＿', '【' + it.qs[0].o[it.qs[0].a][0] + '】')) : zy(it.text.replace(/\n/g, '　')))) + '</div>' + MY(it.my) + kwChips(it);
      const fs = famOf(it).filter(id => S.w[id] && S.w[id].seen);
      if (fs.length) h += '<div class="tiny" style="margin-top:8px">' + esc('這題裡你學過的字：' + fs.map(id => WORDS[id].zh).join('、')) + '</div>';
      lastItem = a.item;
    }
    h += '<div style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px"><div class="row between"><span style="font-weight:500" class="small">' + zy(q.q) + '</span><span class="pill' + (a.ok ? ' ok' : '') + '">' + esc(a.ok ? '對' : (a.to ? '時間到' : '錯')) + '</span></div>' +
      '<div class="small">' + zy('答案：' + q.o[q.a][0]) + (!a.ok && a.sel >= 0 ? '<span class="muted">　' + zy('你選：' + q.o[a.sel][0]) + '</span>' : '') + '</div>' +
      '<div class="my small" lang="my" style="color:var(--ink2)">' + esc(q.why) + '</div>' + (q.tip ? '<div class="note small" style="margin-top:6px">' + zy('技巧：' + q.tip) + '</div>' : '');
    if (!a.ok) {
      h += '<div class="reasons">' + REASONS.filter(x => a.skill === 'listening' || x[0] !== 'sound').map(x => '<button class="chip' + (a.reason === x[0] ? ' on' : '') + '" data-a="preason" data-i="' + i + '" data-r="' + x[0] + '">' + zy(x[1]) + '</button>').join('') + '</div>';
      if (a.reason) h += '<div class="note small" style="margin-top:8px">' + zy({ sound: '先看原文，放慢再聽一次，聽出那個詞。', meaning: '把不懂的詞按 ☆ 加入生字本。', options: '先看問題，再看選項；不用每個字都看懂。', hesitation: '先找根據的那一句，再刪掉不可能的選項。', other: '下次再試一次這種題目。' }[a.reason]) + '</div>';
    }
    h += '</div>';
  });
  if (lastItem) h += '</div>';
  return h;
};
