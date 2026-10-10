/* ===== 單字：書、單元、學習卡、5 秒測驗、生字本、介面字 ===== */
function wordProgress(ids) { let seen = 0, good = 0; ids.forEach(id => { const s = S.w[id]; if (s && s.seen) { seen++; if (s.s >= 2) good++; } }); return { seen, good, n: ids.length }; }
function bookIds(b) { return b.units.reduce((a, u) => a.concat(u.ids), []); }
function srcPill(w) { return { c: '<span class="pill">情境</span>', m: '<span class="pill blue">明朗</span>', u: '<span class="pill kraft">介面</span>', s: '<span class="pill ok">對話</span>', x: '<span class="pill">考試</span>' }[w.src] || ''; }
function starBtn(id) { const on = S.w[id] && S.w[id].star; return '<button class="ib star' + (on ? ' on' : '') + '" data-a="star" data-id="' + id + '" aria-label="生字本">' + ICON.star + '</button>'; }
function playBtn(id, sm) { return '<button class="play' + (sm ? ' sm' : '') + '" data-a="playw" data-id="' + id + '" aria-label="播放">' + ICON.sound + '</button>'; }

const SUBMY = { '家庭成員': 'မိသားစုဝင်', '問候禮貌': 'နှုတ်ဆက်ခြင်း', '聯絡資料': 'ဆက်သွယ်ရန်', '辦事': 'ကိစ္စဆောင်ရွက်', '認識新朋友': 'သူငယ်ချင်းသစ်', '時間頻率': 'အချိန်・အကြိမ်', '大自然': 'သဘာဝ', '動物': 'တိရစ္ဆာန်', '居家格局': 'အိမ်ပုံစံ', '居家用品': 'အိမ်သုံးပစ္စည်း', '日常起居': 'နေ့စဉ်ဘဝ', '身體健康': 'ခန္ဓာကိုယ်・ကျန်းမာရေး', '情緒表達': 'ခံစားချက်', '生活態度': 'ဘဝသဘောထား', '工作': 'အလုပ်', '學校': 'ကျောင်း', '學習': 'သင်ယူခြင်း', '購物': 'ဈေးဝယ်', '美食': 'အစားအသောက်', '休閒娛樂': 'အပန်းဖြေ',
  '延伸家庭稱謂': 'ဆွေမျိုး ခေါ်ပုံ', '家人關係': 'မိသားစု ဆက်ဆံရေး', '個人記錄': 'ကိုယ်ရေးမှတ်တမ်း', '時間細節': 'အချိန် အသေးစိတ်', '心理感受': 'စိတ်ခံစားချက်', '個性': 'စရိုက်', '職場進階': 'အလုပ်ခွင်（အဆင့်မြင့်）', '職場溝通': 'အလုပ်ခွင် ဆက်သွယ်ရေး', '考試': 'စာမေးပွဲ', '科目': 'ဘာသာရပ်', '大學生活': 'တက္ကသိုလ်ဘဝ', '校園生活': 'ကျောင်းဝင်းဘဝ', '學習方法': 'သင်ယူနည်း', '房間格局': 'အခန်းပုံစံ', '居家生活': 'အိမ်ဘဝ', '天氣': 'ရာသီဥတု', '環境': 'ပတ်ဝန်းကျင်', '位置': 'တည်နေရာ', '個人衛生': 'ကိုယ်ရေးသန့်ရှင်းမှု', '日常話題': 'နေ့စဉ်စကား', '休閒活動': 'အားလပ်ချိန်', '興趣愛好': 'ဝါသနာ', '活動': 'လှုပ်ရှားမှု', '書信往來': 'စာအပြန်အလှန်', '出遊': 'ခရီးထွက်', '傳統節日': 'ရိုးရာပွဲတော်', '生活瑣事': 'နေ့စဉ်ကိစ္စငယ်', '看病': 'ဆေးကုသ', '健康': 'ကျန်းမာရေး', '消費': 'ငွေသုံး' };
function bookName(b) { return b.kind === 'tocfl' ? (b.zh.indexOf('入門') >= 0 ? 'TOCFL အဆင့် ၁' : 'TOCFL အဆင့် ၂') : b.kind === 'ming' ? b.zh.replace('明朗 ', '') + ' လေ့ကျင့်' : (b.my || b.zh); }
function unitName(b, u) {
  if (b.kind === 'scene') { const m = u.title.match(/\(([^)]*)\)/); return m ? m[1] : u.title; }
  if (b.kind === 'tocfl') return SUBMY[u.title] || u.title;
  if (b.kind === 'ui') return b.my;
  return u.title;
}
VIEWS.words = function () {
  const tab = NAV.wtab || 'scene';
  const all = Object.keys(S.w).filter(id => S.w[id].star && WORDS[id]), dueN = all.filter(due).length;
  let h = '<button class="bigcard" data-a="go" data-v="note"><span class="ico">' + ICON.star + '</span><span class="grow"><span class="t">စကားလုံးစာအုပ်</span><span class="d">' + esc(all.length ? MYNUM(all.length) + ' လုံး' + (dueN ? '・ပြန်ကြည့်ရန် ' + MYNUM(dueN) + ' လုံး' : '') : '☆ နှိပ်ထားတဲ့ စကားလုံးတွေ ဒီမှာ ရှိမယ်') + '</span></span><span class="arr">›</span></button>';
  const seg = [['scene', 'နေ့စဉ်'], ['tocfl', 'TOCFL'], ['ming', 'A1～B2'], ['ui', 'ဖုန်း']]
    .map(t => '<button class="' + (tab === t[0] ? 'on' : '') + '" data-a="wtab" data-t="' + t[0] + '">' + B(t[1]) + '</button>').join('');
  h += '<div class="seg" style="margin-top:16px">' + seg + '</div>';
  if (tab === 'ui') return h + uiHome();
  h += '<div class="list" style="margin-top:12px">';
  BOOKS.filter(b => b.kind === tab).forEach(b => {
    const p = wordProgress(bookIds(b));
    h += '<button class="li" data-a="go" data-v="book" data-id="' + b.id + '"><span class="grow">' + B(bookName(b)) +
      '<span class="bar" style="margin-top:6px;width:80%"><i style="width:' + Math.round(p.seen / p.n * 100) + '%"></i></span></span>' +
      '<span class="small muted">' + p.seen + '/' + p.n + '</span><span class="arr">›</span></button>';
  });
  h += '</div>';
  if (tab !== 'ming') h += '<p class="tiny" style="margin:14px 4px">' + esc('Words, sentences, Burmese translations & audio: Work Chinese (Chin Chin Chinese, Myanmar Edition) by YUNG-TSAI LAI & ChinQing in Taiwan, CC BY-NC-ND 4.0, used unmodified.') + '</p>';
  return h;
};

VIEWS.book = function (p) {
  const b = book(p.id), attempted = b.units.filter(u => S.units[u.key] != null).length;
  const current = b.units.find(u => S.units[u.key] == null);
  let h = pageHead('', bookName(b));
  h += '<div class="journey-summary">' + B('စမ်းသပ်ပြီး ' + MYNUM(attempted) + ' / ' + MYNUM(b.units.length)) + '</div>' + journeyProgress(attempted, b.units.length, bookName(b));
  h += learningMap(b.units.map((u, i) => {
    const best = S.units[u.key], seen = wordProgress(u.ids);
    return { name: unitName(b, u), ico: ICON.book,
      sub: MYNUM(u.ids.length) + ' လုံး · ' + u.ids.slice(0, 3).map(id => WORDS[id].zh).join('・'),
      state: best != null ? 'done' : current && current.key === u.key ? 'current' : 'upcoming',
      badge: best != null ? 'စမ်းသပ်ပြီး · မှန် ' + MYNUM(best) + ' / ' + MYNUM(u.ids.length) : seen.seen ? 'လေ့လာပြီး ' + MYNUM(seen.seen) + ' / ' + MYNUM(seen.n) : 'စကားလုံး → စမ်းသပ်',
      data: { a: 'go', v: 'unit', id: b.id, u: i } };
  }), bookName(b) + ' အဆင့်များ');
  return h;
};

VIEWS.unit = function (p) {
  const b = book(p.id), u = b.units[p.u];
  let h = pageHead('', unitName(b, u));
  h += '<button class="btn pri block" data-a="study" data-b="' + b.id + '" data-u="' + p.u + '">' + B('လေ့လာမယ်（ပြီးရင် စမ်းသပ်）') + '</button>' +
    '<div class="btns' + (b.kind === 'ui' ? ' two' : '') + '" style="margin-top:10px"><button class="btn" data-a="quiz" data-b="' + b.id + '" data-u="' + p.u + '">' + B('၅ စက္ကန့် စမ်းသပ်') + '</button>' +
    (b.kind === 'ui' ? '<button class="btn" data-a="screens">' + B('ဖုန်းမျက်နှာပြင်') + '</button>' : '') + '</div>';
  h += '<div class="list" style="margin-top:14px">';
  u.ids.forEach(id => {
    const w = WORDS[id], st = S.w[id];
    h += '<div class="li"><span class="grow"><span style="font-size:1.35rem">' + zy(w.zh) + '</span>' + (st && st.seen && st.s >= 2 ? ' <span class="pill ok">✓</span>' : '') +
      '<span class="my" lang="my" style="display:block">' + esc(w.my) + '</span></span>' + playBtn(id, true) + starBtn(id) + '</div>';
  });
  return h + '</div>';
};

/* ---- 學習卡 ---- */
function startStudy(ids, opt) {
  stopAll();
  NAV.sheet = Object.assign({ v: 'study', ids: ids.slice(), i: 0, recall: false, show: false, title: 'လေ့လာမယ်', then: null, tag: null, unit: null }, opt || {});
  render(); autoPlayCard();
}
function autoPlayCard() {
  const s = NAV.sheet, i = s && s.i, seq = TTS.seq;
  if (s && s.v === 'study' && S.set.auto) setTimeout(() => {
    if (NAV.sheet === s && s.i === i && TTS.seq === seq) playWord(WORDS[s.ids[i]]);
  }, 150);
}
SHEETS.study = function (s) {
  const id = s.ids[s.i], w = WORDS[id];
  const show = !s.recall || s.show;
  let h = sheetHead(s.title, s.i + 1, s.ids.length);
  h += '<div class="wordcard fade">' +
    '<div class="big' + (w.zh.length > 4 ? ' long' : '') + '">' + zy(w.zh) + '</div>' + playBtn(id);
  if (show) {
    h += '<div class="mean">' + MY(w.my) + '</div>';
    if (w.src === 'u') {
      h += '<div class="ex"><div class="small">' + zy(w.whatZh) + '</div>' + MY(w.what) +
        '<div class="note blue" style="margin-top:12px"><div class="small ui">ဖုန်းမျက်နှာပြင်မှာ ဒီလို မြင်ရမယ်：</div><div class="zh">' + zy(w.ex) + '</div>' + MY(w.exMy) + '</div></div>';
    } else if (w.ex) {
      h += '<div class="ex"><div class="row"><div class="zh grow">' + zy(w.ex) + '</div><button class="play sm" data-a="say" data-t="' + esc(plain(w.ex)) + '">' + ICON.sound + '</button></div>' + MY(w.exMy) +
        (w.ex2 ? '<div class="row" style="margin-top:8px"><div class="zh grow">' + zy(w.ex2.cn) + '</div><button class="play sm" data-a="say" data-t="' + esc(w.ex2.cn) + '">' + ICON.sound + '</button></div>' + MY(w.ex2.my) : '') +
        (w.note ? '<div class="note" style="margin-top:10px">' + MY(w.note) + '</div>' : '') + '</div>';
    } else if (w.note) h += '<div class="ex small">' + zy(w.note) + '</div>';
  } else h += '<p class="muted" style="margin-top:14px">' + B('အဓိပ္ပာယ်ကို အရင် တွေးကြည့်ပါ။') + '</p>';
  h += '<div class="star-pos">' + starBtn(id) + '</div></div>';
  h += '<div style="margin-top:16px">' + (show
    ? '<div class="btns two"><button class="btn" data-a="sknow" data-k="0">' + B('ထပ်ကြည့်မယ်') + '</button><button class="btn pri" data-a="sknow" data-k="1">' + B('မှတ်မိပြီ ✓') + '</button></div>'
    : '<button class="btn pri block" data-a="sshow">' + B('အဖြေကြည့်မယ်') + '</button>') + '</div>';
  return h;
};
function studyNext(known) {
  const s = NAV.sheet, id = s.ids[s.i];
  mark(id, !!known);
  if (!known && !s.requeued) { s.requeue = s.requeue || []; if (s.requeue.indexOf(id) < 0 && s.ids.length < 40) { s.ids.push(id); s.requeue.push(id); } }
  save();
  if (s.i + 1 < s.ids.length) { s.i++; s.show = false; render(); autoPlayCard(); return; }
  const uniq = [...new Set(s.ids)];
  if (s.then === 'quiz') return startQuiz(uniq, { tag: s.tag, unit: s.unit, title: '၅ စက္ကန့် စမ်းသပ်' });
  if (s.then === 'screens') return startScreens(3, 'ui');
  if (s.tag) doneTask(s.tag);
  NAV.sheet = { v: 'done', title: s.title, msg: 'စကားလုံး ' + MYNUM(uniq.length) + ' လုံး ပြီးပြီ' };
  render();
}

/* ---- 5 秒測驗（照 Chin Chin Chinese 的玩法：看字選意思，兩個選項，5 秒） ---- */
function startQuiz(ids, opt) {
  stopAll();
  const pool = ids.length >= 4 ? ids : Object.keys(WORDS).filter(k => WORDS[k].src === WORDS[ids[0]].src);
  const qs = shuffle(ids).map(id => {
    const w = WORDS[id];
    let d, tries = 0;
    do { d = WORDS[pick(pool)]; tries++; } while ((d.id === id || d.my === w.my) && tries < 50);
    const top = Math.random() < .5;
    return { id: id, o: top ? [w.my, d.my] : [d.my, w.my], a: top ? 0 : 1 };
  });
  NAV.sheet = Object.assign({ v: 'quiz', qs: qs, i: 0, res: [], sel: null, title: '၅ စက္ကန့် စမ်းသပ်', sec: 5, tag: null, unit: null }, opt || {});
  render(); quizStart();
}
function quizStart() {
  const s = NAV.sheet; if (!s || s.v !== 'quiz') return;
  s.sel = null; s.t0 = now();
  const q = s.qs[s.i];
  playWord(WORDS[q.id]);
  requestAnimationFrame(() => { const t = $('.timer'); if (!t) return; t.classList.add('run'); const i = t.querySelector('i'); i.style.transitionDuration = s.sec + 's'; i.style.width = '0%'; });
  clearTimeout(s.timer); s.timer = setTimeout(() => quizAnswer(-1), s.sec * 1000 + 80);
}
SHEETS.quiz = function (s) {
  const q = s.qs[s.i], w = WORDS[q.id];
  let h = sheetHead(s.title, s.i + 1, s.qs.length);
  h += '<div class="wordcard" style="padding:30px 18px"><div class="big' + (w.zh.length > 4 ? ' long' : '') + '">' + zy(w.zh) + '</div>' + playBtn(q.id) + '</div><div class="timer kraft" style="margin:16px 0"><i></i></div><div>';
  q.o.forEach((o, k) => {
    let c = '';
    if (s.sel != null) c = k === q.a ? ' ok' : (k === s.sel ? ' bad' : ' dim');
    h += '<button class="opt' + c + '" data-a="qans" data-k="' + k + '"' + (s.sel != null ? ' disabled' : '') + '><span class="k">' + (k + 1) + '</span><span lang="my" style="font-family:var(--my)">' + esc(o) + '</span></button>';
  });
  h += '</div>';
  if (s.sel === -1) h += '<div class="fb bad">' + B('အချိန်ပြည့်ပြီ') + '</div>';
  return h;
};
function quizAnswer(k) {
  const s = NAV.sheet; if (!s || s.v !== 'quiz' || s.sel != null) return;
  clearTimeout(s.timer);
  const q = s.qs[s.i]; const ok = k === q.a;
  s.sel = k; s.res.push({ id: q.id, ok: ok, ms: now() - s.t0, to: k === -1 });
  mark(q.id, ok); save();
  sfx(ok ? 'pass' : 'fail');
  render();
  setTimeout(() => {
    if (NAV.sheet !== s) return;
    if (s.i + 1 < s.qs.length) { s.i++; s.sel = null; render(); quizStart(); }
    else quizFinish();
  }, ok ? 650 : 1300);
}
function quizFinish() {
  const s = NAV.sheet;
  const n = s.res.filter(r => r.ok).length;
  if (s.unit) S.units[s.unit] = Math.max(S.units[s.unit] || 0, n);
  if (s.tag) doneTask(s.tag);
  save();
  NAV.sheet = { v: 'qres', res: s.res, title: s.title, again: s.qs.map(q => q.id), tag: s.tag, unit: s.unit };
  render();
}
SHEETS.qres = function (s) {
  const n = s.res.filter(r => r.ok).length;
  const wrong = s.res.filter(r => !r.ok);
  let h = sheetHead(s.title);
  h += '<div class="card center">' + MASCOT(n === s.res.length ? 'cheer' : n >= s.res.length / 2 ? 'happy' : 'think', 84, 'bob') + '<div class="score">' + n + '<small> / ' + s.res.length + '</small></div><p class="small muted">' + B(n === s.res.length ? 'အကုန်မှန်တယ် 🎉' : 'မှားတဲ့စကားလုံး မကြာခင် ပြန်ပေါ်လာမယ်') + '</p></div>';
  if (wrong.length) {
    h += '<div class="sec"><h2>' + B('မှားခဲ့တဲ့ စကားလုံး') + '</h2></div><div class="list">';
    wrong.forEach(r => { const w = WORDS[r.id]; h += '<div class="li"><span class="grow"><span style="font-size:1.25rem">' + zy(w.zh) + '</span><span class="my" lang="my" style="display:block">' + esc(w.my) + '</span></span>' + playBtn(r.id, true) + starBtn(r.id) + '</div>'; });
    h += '</div><button class="btn block" style="margin-top:12px" data-a="starall">' + B('အားလုံး စာအုပ်ထဲ ထည့်မယ် ☆') + '</button>';
  }
  h += '<div style="margin-top:16px">' + endBtn() + '</div><button class="linkbtn" data-a="qagain">' + esc('ထပ်စမ်းမယ်') + '</button>';
  return h;
};

/* ---- 生字本 ---- */
VIEWS.note = function () {
  const f = NAV.nf || 'all';
  const all = Object.keys(S.w).filter(id => S.w[id].star && WORDS[id]);
  const dueIds = all.filter(due);
  const list = f === 'due' ? dueIds : all;
  let h = pageHead('', 'စကားလုံးစာအုပ်');
  if (!all.length) return h + '<div class="empty">' + MASCOT('think', 96) + B('မသိတဲ့ စကားလုံးတွေ့ရင် ☆ ကိုနှိပ်ပါ။ ဒီစာအုပ်ထဲ ရောက်လာမယ်။') + '</div>';
  h += '<button class="btn pri block" data-a="nstudy">' + B('ပြန်လေ့ကျင့်မယ်' + (dueIds.length ? '（' + MYNUM(dueIds.length) + '）' : '')) + '</button>';
  if (all.length >= 4) h += '<button class="btn block" style="margin-top:10px" data-a="nquiz">' + B('၅ စက္ကန့် စမ်းသပ်') + '</button>';
  h += '<div class="chips" style="margin-top:14px"><button class="chip' + (f === 'all' ? ' on' : '') + '" data-a="nf" data-f="all">' + B('အားလုံး ' + MYNUM(all.length)) + '</button><button class="chip' + (f === 'due' ? ' on' : '') + '" data-a="nf" data-f="due">' + B('ပြန်ကြည့်ရန် ' + MYNUM(dueIds.length)) + '</button></div>';
  h += '<div class="list" style="margin-top:12px">';
  list.sort((a, b) => (S.w[a].d || 0) - (S.w[b].d || 0)).forEach(id => {
    const w = WORDS[id];
    h += '<div class="li"><span class="grow"><span style="font-size:1.3rem">' + zy(w.zh) + '</span><span class="my" lang="my" style="display:block">' + esc(w.my) + '</span></span>' + playBtn(id, true) + starBtn(id) + '</div>';
  });
  return h + '</div>';
};

/* ---- 介面字 ---- */
function uiHome() {
  const sc = UI_SCREENS.length, got = Object.keys(S.scr).filter(k => S.scr[k] > 0).length;
  let h = '<button class="bigcard pri" style="margin-top:12px" data-a="screens"><span class="ico">' + ICON.phone + '</span><span class="grow"><span class="t">ဖုန်းမျက်နှာပြင် ဂိမ်း</span><span class="d">' + esc('ဘယ်ခလုတ်ကို နှိပ်မလဲ ရွေး・' + MYNUM(got) + '/' + MYNUM(sc)) + '</span></span></button>';
  h += '<div class="list" style="margin-top:12px">';
  BOOKS.filter(b => b.kind === 'ui').forEach(b => {
    const p = wordProgress(bookIds(b));
    h += '<button class="li" data-a="go" data-v="unit" data-id="' + b.id + '" data-u="0"><span class="grow">' + B(b.my) + '<span class="small muted" style="display:block">' + esc(b.units[0].ids.slice(0, 3).map(id => WORDS[id].zh).join('・')) + '</span></span><span class="small muted">' + p.seen + '/' + p.n + '</span><span class="arr">›</span></button>';
  });
  h += '</div><div class="sec"><h2>' + B('ရောထွေးလွယ်တဲ့ စကားလုံးတွေ') + '</h2></div><div class="list">';
  UI_GROUPS.forEach(g => { h += '<button class="li" data-a="go" data-v="uigroup" data-id="' + g.id + '"><span class="grow" style="font-size:1.1rem">' + zy(g.name) + '</span><span class="arr">›</span></button>'; });
  return h + '</div>';
}
VIEWS.uigroup = function (p) {
  const g = UI_GROUPS.find(x => x.id === p.id);
  let h = pageHead(g.name, '');
  h += '<div class="note blue"><div class="ui">' + esc(g.my) + '</div></div><div class="cmp" style="margin-top:14px">';
  g.ids.forEach(k => { const w = WORDS['u' + k]; h += '<div class="c"><b>' + zy(w.zh) + '</b><span class="grow"><span class="ui" style="display:block">' + esc(w.my) + '</span><span class="small muted ui" style="display:block">' + esc(w.what) + '</span></span>' + playBtn(w.id, true) + '</div>'; });
  h += '</div><button class="btn pri block" style="margin-top:16px" data-a="studyg" data-id="' + g.id + '">' + B('ဒီအုပ်စု လေ့လာမယ်') + '</button>';
  return h;
};
function startScreens(n, tag) {
  stopAll();
  const order = shuffle(UI_SCREENS.map((_, i) => i)).sort((a, b) => (S.scr[a] || 0) - (S.scr[b] || 0));
  NAV.sheet = { v: 'screen', list: order.slice(0, n || UI_SCREENS.length), i: 0, sel: null, ok: 0, tag: tag || null, title: 'ဖုန်းမျက်နှာပြင်' };
  render();
}
SHEETS.screen = function (s) {
  const k = s.list[s.i], q = UI_SCREENS[k];
  let h = sheetHead(s.title, s.i + 1, s.list.length);
  h += '<p class="ui" style="margin:0 0 6px;font-weight:600;font-size:1.1rem">' + esc(q.askMy) + '</p><p class="small muted" style="margin:0">' + zy(q.ask) + '</p>';
  h += '<div class="phone" style="margin-top:14px"><div class="dialog"><div class="dt">' + zy(q.title) + '</div><div class="db">' + zy(q.body) + '</div><div class="dbs">';
  q.btns.forEach((b, i) => {
    let c = ''; if (s.sel != null) c = i === q.a ? ' ok' : (i === s.sel ? ' bad' : '');
    h += '<button class="' + c + '" data-a="scrans" data-k="' + i + '"' + (s.sel != null ? ' disabled' : '') + '>' + zy(b) + '</button>';
  });
  h += '</div></div></div>';
  if (s.sel != null) {
    const ok = s.sel === q.a;
    h += '<div class="fb ' + (ok ? 'ok' : 'bad') + '"><b>' + B(ok ? 'မှန်တယ် ✓' : 'မှားသွားတယ်') + '</b><div class="why">' + zy(q.why) + MY(q.whyMy) + '</div></div>' +
      '<button class="btn pri block" style="margin-top:14px" data-a="scrnext">' + B(s.i + 1 < s.list.length ? 'နောက်တစ်ခု →' : 'ပြီးပြီ') + '</button>';
  }
  return h;
};
