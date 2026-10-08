/* ===== 聽讀練習與 CAT 模擬（移植自明朗中文；不是官方 TOCFL 計分） ===== */
const LEVELS = ['A1', 'A2', 'B1', 'B2'];
const QUESTIONS = MING.questions;
const MWORD = id => MING.words.find(w => w.id === id);
const REASONS = [['sound', '沒聽出詞', 'အသံမကြားမိ'], ['meaning', '意思不懂', 'အဓိပ္ပာယ်မသိ'], ['options', '選項讀不完', 'ဖတ်ချိန်မလောက်'], ['hesitation', '猶豫太久', 'ဆုံးဖြတ်ရခက်'], ['other', '其他原因', 'အခြား']];
const MODE_L = { guided: ['學習練習', 'အကူအညီနဲ့'], timed: ['限時練習', 'အချိန်ကန့်သတ်'], cat: ['CAT 模擬', 'CAT ပုံစံ'] };
function pickQuestion(o) {
  const base = QUESTIONS.filter(q => o.used.indexOf(q.id) < 0 && (o.mode === 'cat' || q.level === o.level) && (o.mode === 'cat' || !o.wordIds || o.wordIds.indexOf(q.wordId) >= 0));
  if (!base.length) return null;
  const ranked = base.map(q => ({ q, s: (o.mode === 'cat' ? Math.abs(LEVELS.indexOf(q.level) - o.est) : 0) + (S.seen.indexOf(q.id) >= 0 ? .55 : 0) }));
  const min = Math.min.apply(null, ranked.map(x => x.s));
  return pick(ranked.filter(x => x.s <= min + .22)).q;
}
function adapt(est, lv, ok) { const e = 1 / (1 + Math.exp((LEVELS.indexOf(lv) - est) * 1.3)); return Math.max(0, Math.min(3, est + .7 * ((ok ? 1 : 0) - e))); }
function poolSize(level, mode) { return mode === 'cat' ? QUESTIONS.length : QUESTIONS.filter(q => q.level === level).length; }

VIEWS.practice = function () {
  const p = S.prSet;
  const seg = (k, opts) => '<div class="seg">' + opts.map(o => '<button class="' + (String(p[k]) === String(o[0]) ? 'on' : '') + '" data-a="pset" data-k="' + k + '" data-v="' + o[0] + '">' + esc(o[1]) + (o[2] ? '<small class="my">' + esc(o[2]) + '</small>' : '') + '</button>').join('') + '</div>';
  let h = '<p class="small muted" style="margin:4px 2px 12px">' + zy('聽一段話或讀一段文字，再回答問題。CAT 模擬會依你的答案調整難度。') + '<small class="my">နားထောင်/ဖတ်ပြီး မေးခွန်းဖြေ။ CAT က အဖြေပေါ်မူတည်ပြီး ခက်/လွယ် ပြောင်းတယ်။</small></p>';
  h += '<div class="card stack">';
  h += '<div><div class="tiny">' + zy('練什麼') + '</div>' + seg('skill', [['listening', '聽力', 'နားထောင်'], ['reading', '閱讀', 'ဖတ်']]) + '</div>';
  h += '<div><div class="tiny">' + zy('方式') + '</div>' + seg('mode', [['guided', '學習', 'အကူအညီ'], ['timed', '限時', 'အချိန်'], ['cat', 'CAT', '']]) + '</div>';
  if (p.mode !== 'cat') h += '<div><div class="tiny">' + zy('級數') + '</div>' + seg('level', LEVELS.map(l => [l, l])) + '</div>';
  const counts = p.mode === 'cat' ? [5, 10, 20, 35] : [5, 10, 20, 30];
  if (counts.indexOf(+p.count) < 0) p.count = counts[1];
  h += '<div><div class="tiny">' + zy('題數') + '</div>' + seg('count', counts.map(n => [n, n + ' 題'])) + '</div>';
  if (p.mode === 'timed' && p.skill === 'listening') h += '<div><div class="tiny">' + zy('聽完後的作答時間') + '</div>' + seg('sec', [20, 15, 10, 5].map(n => [n, n + ' 秒'])) + '</div>';
  const pool = poolSize(p.level, p.mode);
  h += '<div class="tiny">' + esc('這一級題庫 ' + pool + ' 題；這次最多 ' + Math.min(pool, p.count) + ' 題。') + '</div>';
  const desc = {
    guided: ['不限時間，每題馬上看答案和說明。聽力可以重聽。', 'အချိန်မကန့်သတ်၊ ချက်ချင်း အဖြေကြည့်။'],
    timed: [p.skill === 'listening' ? '聲音播完才開始倒數。不能重聽，最後一起看答案。' : '每題 90 秒，最後一起看答案。', 'အချိန်ကန့်သတ်၊ နောက်ဆုံးမှ အဖြေကြည့်။'],
    cat: [p.skill === 'listening' ? '答對變難、答錯變簡單。聽完後每題 10 秒，不能回上一題。' : '答對變難、答錯變簡單。整回最多 60 分鐘，不能回上一題。', 'မှန်ရင်ခက်၊ မှားရင်လွယ်။ နောက်ပြန်မရ။'] }[p.mode];
  h += '<div class="note small">' + zy(desc[0]) + MY(desc[1]) + '</div>';
  h += '<button class="btn pri block" data-a="pstart">' + T('開始', 'စမယ်') + '</button></div>';
  // 紀錄
  const ss = S.sessions.slice(-5).reverse();
  if (ss.length) {
    h += '<div class="sec"><h2>' + T('最近紀錄', 'မှတ်တမ်း') + '</h2></div><div class="list">';
    ss.forEach(s => { h += '<div class="li"><span class="grow small">' + zy((s.skill === 'listening' ? '聽力' : '閱讀') + '・' + MODE_L[s.mode][0]) + (s.mode === 'cat' && s.est != null ? ' <span class="pill blue">' + esc('約 ' + LEVELS[Math.round(s.est)]) + '</span>' : (s.level ? ' <span class="pill">' + esc(s.level) + '</span>' : '')) + '<small class="tiny" style="display:block">' + esc(new Date(s.at).toLocaleDateString('zh-TW')) + '</small></span><b style="font-weight:400">' + s.correct + '/' + s.total + '</b></div>'; });
    h += '</div>';
  }
  h += '<p class="tiny" style="margin:12px 4px">' + esc('題目與緬文說明來自「明朗中文」。CAT 是練習用的估計，不是官方 TOCFL 分數。') + '</p>';
  return h;
};

function startPractice(opt) {
  stopAll();
  const p = Object.assign({}, S.prSet, opt || {});
  const total = Math.min(+p.count, poolSize(p.level, p.mode), p.wordIds ? QUESTIONS.filter(q => p.wordIds.indexOf(q.wordId) >= 0).length : 999);
  if (!total) { toast('沒有題目'); return; }
  NAV.sheet = { v: 'pr', skill: p.skill, mode: p.mode, level: p.level, count: total, sec: +p.sec, wordIds: p.wordIds || null, tag: p.tag || null,
    est: p.mode === 'cat' ? LEVELS.indexOf(p.level === 'A1' ? 'A2' : p.level) - .3 : 0, used: [], ans: [], cur: null, phase: 'ready', t0: now(), deadline: null, overallEnd: p.mode === 'cat' && p.skill === 'reading' ? now() + 3600e3 : null };
  prNext();
}
function prNext() {
  const s = NAV.sheet;
  if (s.ans.length >= s.count) return prFinish();
  const q = pickQuestion({ level: s.level, mode: s.mode, used: s.used, est: s.est, wordIds: s.wordIds });
  if (!q) return prFinish();
  s.cur = q; s.used.push(q.id); s.ord = shuffle(q.options.map((_, i) => i)); s.sel = null; s.deadline = null; s.noAudio = false; s.replay = 0;
  render();
  if (s.skill === 'listening') { s.phase = 'playing'; render(); prPlay(); }
  else { s.phase = 'answer'; s.qt = now(); if (s.mode === 'timed') prDeadline(90); render(); }
}
function prPlay(rate) {
  const s = NAV.sheet;
  speak(s.cur.passage, rate || 1, ok => {
    if (NAV.sheet !== s || s.phase === 'feedback') return;
    if (!ok) { s.noAudio = true; }
    if (s.phase === 'playing') {
      s.phase = 'answer'; s.qt = now();
      const lim = s.mode === 'cat' ? 10 : (s.mode === 'timed' ? s.sec : 0);
      if (lim && ok) prDeadline(lim);
    }
    render();
  });
}
function prDeadline(sec) {
  const s = NAV.sheet; s.deadline = now() + sec * 1000; s.limit = sec;
  clearInterval(s.tick);
  s.tick = setInterval(() => {
    if (NAV.sheet !== s) return clearInterval(s.tick);
    const left = Math.max(0, Math.ceil((s.deadline - now()) / 1000));
    const el = $('.countdown'); if (el) el.textContent = left + ' 秒';
    const bar = $('.timer i'); if (bar) bar.style.width = (Math.max(0, s.deadline - now()) / (s.limit * 1000) * 100) + '%';
    if (s.overallEnd && now() > s.overallEnd) { clearInterval(s.tick); return prSubmit(-1, true); }
    if (left <= 0) { clearInterval(s.tick); prSubmit(-1, true); }
  }, 250);
}
function prSubmit(k, timedOut) {
  const s = NAV.sheet; if (!s || s.v !== 'pr' || s.phase === 'feedback' || s.locked) return;
  if (s.phase === 'playing' && !timedOut) return;
  clearInterval(s.tick); stopAll();
  const q = s.cur, ok = k === q.answer;
  s.ans.push({ qid: q.id, sel: k, ms: now() - (s.qt || now()), to: !!timedOut, ok: ok, reason: null });
  if (S.seen.indexOf(q.id) < 0) S.seen.push(q.id);
  if (s.mode === 'cat') s.est = adapt(s.est, q.level, ok);
  if (s.mode === 'guided') { s.sel = k; s.phase = 'feedback'; sfx(ok ? 'pass' : 'fail'); save(); render(); }
  else { s.locked = true; save(); setTimeout(() => { s.locked = false; prNext(); }, 200); }
}
function prFinish() {
  const s = NAV.sheet;
  clearInterval(s.tick); stopAll();
  const correct = s.ans.filter(a => a.ok).length;
  S.sessions.push({ at: now(), skill: s.skill, mode: s.mode, level: s.mode === 'cat' ? null : s.level, total: s.ans.length, correct: correct, to: s.ans.filter(a => a.to).length, est: s.mode === 'cat' ? s.est : null });
  if (S.sessions.length > 20) S.sessions = S.sessions.slice(-20);
  const st = S.pstat[s.skill] || (S.pstat[s.skill] = { n: 0, ok: 0 }); st.n += s.ans.length; st.ok += correct;
  if (s.tag) doneTask(s.tag);
  logToday('p'); save();
  NAV.sheet = { v: 'prres', src: s };
  render();
}
SHEETS.pr = function (s) {
  const q = s.cur;
  let h = sheetHead((s.skill === 'listening' ? '聽力' : '閱讀') + '・' + MODE_L[s.mode][0], s.ans.length + (s.phase === 'feedback' ? 0 : 1), s.count);
  if (s.overallEnd) h += '<p class="tiny">' + esc('整回剩下 ' + Math.max(0, Math.ceil((s.overallEnd - now()) / 60000)) + ' 分鐘') + '</p>';
  const showText = s.skill === 'reading' || s.phase === 'feedback' || s.noAudio;
  if (s.skill === 'listening') {
    h += '<div class="card center" style="padding:18px"><button class="play' + (s.phase === 'playing' ? ' busy' : '') + '" data-a="preplay"' + (s.mode === 'guided' || s.phase === 'feedback' ? '' : ' disabled') + '>' + ICON.sound + '</button>' +
      '<div class="small muted" style="margin-top:6px">' + zy(s.phase === 'playing' ? '正在播放…' : (s.mode === 'guided' ? '可以按喇叭重聽' : '聽完了')) + '</div>' +
      (s.noAudio ? '<div class="tiny">' + esc('這台手機沒有中文語音，先看文字。') + '</div>' : '') + '</div>';
  }
  if (showText) h += '<div class="passage" style="margin-top:12px">' + zy(q.passage) + (s.phase === 'feedback' ? MY(q.my) : '') + '</div>';
  h += '<div style="margin:14px 0 8px;font-weight:500">' + zy(q.question) + '</div>';
  if (s.deadline && s.phase === 'answer') h += '<div class="row between"><div class="timer grow" style="margin:0"><i style="width:100%"></i></div><span class="countdown">' + esc(Math.ceil((s.deadline - now()) / 1000) + ' 秒') + '</span></div><div style="height:10px"></div>';
  s.ord.forEach(k => {
    let c = '';
    if (s.phase === 'feedback') c = k === q.answer ? ' ok' : (k === s.sel ? ' bad' : ' dim');
    h += '<button class="opt' + c + '" data-a="pans" data-k="' + k + '"' + (s.phase !== 'answer' ? ' disabled' : '') + '><span class="grow">' + zy(q.options[k]) + (q.optionsMy ? '<small class="my">' + esc(q.optionsMy[k]) + '</small>' : '') + '</span></button>';
  });
  if (s.phase === 'feedback') {
    const ok = s.sel === q.answer;
    h += '<div class="fb ' + (ok ? 'ok' : 'bad') + '"><b>' + T(ok ? '答對了' : (s.sel === -1 ? '時間到' : '答錯了'), ok ? 'မှန်တယ်' : 'မှားတယ်') + '</b><div class="why"><span class="my" lang="my" style="display:block">' + esc(q.explanation) + '</span><div class="small">' + zy('關鍵：' + q.evidence) + '</div></div></div>' +
      '<button class="btn pri block" style="margin-top:12px" data-a="pnext">' + T(s.ans.length < s.count ? '下一題' : '看結果', s.ans.length < s.count ? 'နောက်တစ်ခု' : 'ရလဒ်') + '</button>';
  }
  return h;
};
SHEETS.prres = function (r) {
  const s = r.src, correct = s.ans.filter(a => a.ok).length;
  const avg = Math.round(s.ans.reduce((t, a) => t + a.ms, 0) / Math.max(1, s.ans.length) / 1000);
  let h = sheetHead('結果');
  h += '<div class="stat"><div><b>' + correct + '/' + s.ans.length + '</b><span>' + zy('答對') + '</span></div><div><b>' + s.ans.filter(a => a.to).length + '</b><span>' + zy('時間到') + '</span></div><div><b>' + avg + 's</b><span>' + zy('平均') + '</span></div></div>';
  if (s.mode === 'cat') h += '<div class="note blue" style="margin-top:12px">' + zy('這次練習估計大約在 ' + LEVELS[Math.round(s.est)] + ' 附近。') + MY('ဒီလေ့ကျင့်မှုအရ ' + LEVELS[Math.round(s.est)] + ' ဝန်းကျင်လောက်။') + '<div class="tiny">' + esc('只是練習估計，不是官方 TOCFL 分數。') + '</div></div>';
  h += '<div class="sec"><h2>' + T('一題一題看', 'တစ်ခုချင်းကြည့်') + '</h2></div>';
  s.ans.forEach((a, i) => {
    const q = QUESTIONS.find(x => x.id === a.qid);
    h += '<div class="card"><div class="row between"><span class="tiny">' + esc('第 ' + (i + 1) + ' 題・' + q.level + '・' + Math.round(a.ms / 1000) + ' 秒') + '</span><span class="pill' + (a.ok ? ' ok' : '') + '">' + esc(a.ok ? '對' : (a.to ? '時間到' : '錯')) + '</span></div>' +
      '<div class="small" style="margin-top:6px;line-height:2.1">' + zy(q.passage) + '</div>' + MY(q.my) +
      '<div style="margin-top:8px;font-weight:500">' + zy(q.question) + '</div><div class="small">' + zy('答案：' + q.options[q.answer]) + (!a.ok && a.sel >= 0 ? '<span class="muted">　' + zy('你選：' + q.options[a.sel]) + '</span>' : '') + '</div>' +
      '<div class="my small" lang="my" style="color:var(--ink2)">' + esc(q.explanation) + '</div>';
    if (!a.ok) {
      h += '<div class="tiny" style="margin-top:8px">' + zy('哪裡卡住？') + '</div><div class="reasons">' + REASONS.filter(x => s.skill === 'listening' || x[0] !== 'sound').map(x => '<button class="chip' + (a.reason === x[0] ? ' on' : '') + '" data-a="preason" data-i="' + i + '" data-r="' + x[0] + '">' + zy(x[1]) + '</button>').join('') + '</div>';
      if (a.reason) h += '<div class="note small" style="margin-top:8px">' + zy({ sound: '先看文字，放慢再聽一次，聽出那個詞。', meaning: '把不懂的詞加入生字本。', options: '先看問題，再看選項。', hesitation: '先找關鍵句，再刪掉不可能的選項。', other: '下次再試一次這種題目。' }[a.reason]) + '</div>';
    }
    h += '</div>';
  });
  h += '<div class="btns two" style="margin-top:14px"><button class="btn" data-a="pagain">' + T('再練一回', 'ထပ်လေ့ကျင့်') + '</button><button class="btn pri" data-a="close">' + T('完成', 'ပြီးပြီ') + '</button></div>';
  return h;
};
