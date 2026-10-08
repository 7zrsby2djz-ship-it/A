/* ===== 單字：書、單元、學習卡、5 秒測驗、生字本、介面字 ===== */
function wordProgress(ids) { let seen = 0, good = 0; ids.forEach(id => { const s = S.w[id]; if (s && s.seen) { seen++; if (s.s >= 2) good++; } }); return { seen, good, n: ids.length }; }
function bookIds(b) { return b.units.reduce((a, u) => a.concat(u.ids), []); }
function srcPill(w) { return { c: '<span class="pill">情境</span>', m: '<span class="pill blue">明朗</span>', u: '<span class="pill kraft">介面</span>', s: '<span class="pill ok">對話</span>' }[w.src] || ''; }
function starBtn(id) { const on = S.w[id] && S.w[id].star; return '<button class="ib star' + (on ? ' on' : '') + '" data-a="star" data-id="' + id + '" aria-label="生字本">' + ICON.star + '</button>'; }
function playBtn(id, sm) { return '<button class="play' + (sm ? ' sm' : '') + '" data-a="playw" data-id="' + id + '" aria-label="播放">' + ICON.sound + '</button>'; }

VIEWS.words = function () {
  const tab = NAV.wtab || 'scene';
  const seg = [['scene', '情境', 'အခြေအနေ'], ['tocfl', 'TOCFL', ''], ['ming', '明朗', ''], ['ui', '介面字', 'App စကားလုံး']]
    .map(t => '<button class="' + (tab === t[0] ? 'on' : '') + '" data-a="wtab" data-t="' + t[0] + '">' + esc(t[1]) + (t[2] ? '<small class="my">' + esc(t[2]) + '</small>' : '') + '</button>').join('');
  let h = '<div class="seg">' + seg + '</div>';
  if (tab === 'ui') return h + uiHome();
  const intro = { scene: ['15 個生活與工作情境，有真人錄音。', 'နေ့စဉ်နဲ့ အလုပ်ခွင် အခြေအနေ ၁၅ ခု၊ လူသံဖမ်းထားတယ်။'],
    tocfl: ['華語八千詞入門級、基礎級，有真人錄音。', 'TOCFL စကားလုံး၊ လူသံ။'],
    ming: ['明朗中文的 A1～B2 練習詞，每個詞有兩個例句。', 'A1～B2၊ ဥပမာ နှစ်ကြောင်းစီ။'] }[tab];
  h += '<p class="small muted" style="margin:12px 2px">' + zy(intro[0]) + '<small class="my">' + esc(intro[1]) + '</small></p><div class="list">';
  BOOKS.filter(b => b.kind === tab).forEach((b, i) => {
    const p = wordProgress(bookIds(b));
    h += '<button class="li" data-a="go" data-v="book" data-id="' + b.id + '"><span class="no">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="grow"><b style="font-weight:500">' + zy(b.zh) + '</b>' + (b.my ? '<small class="my">' + esc(b.my) + '</small>' : '') +
      '<span class="bar" style="margin-top:6px;width:70%"><i style="width:' + Math.round(p.seen / p.n * 100) + '%"></i></span></span>' +
      '<span class="tiny">' + p.seen + '/' + p.n + '</span><span class="arr">›</span></button>';
  });
  h += '</div>';
  if (tab !== 'ming') h += '<p class="tiny" style="margin:14px 4px">' + esc('單字、例句、緬文翻譯與錄音：Work Chinese（Chin Chin Chinese, Myanmar Edition）YUNG-TSAI LAI、ChinQing in Taiwan，CC BY-NC-ND 4.0，原樣使用、未修改。') + '</p>';
  return h;
};

VIEWS.book = function (p) {
  const b = book(p.id);
  let h = pageHead(b.zh, b.my);
  h += '<div class="list">';
  b.units.forEach((u, i) => {
    const best = S.units[u.key];
    const pr = wordProgress(u.ids);
    const preview = u.ids.slice(0, 4).map(id => WORDS[id].zh).join('・');
    h += '<button class="li" data-a="go" data-v="unit" data-id="' + b.id + '" data-u="' + i + '"><span class="no">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="grow"><b style="font-weight:500">' + (HAN.test(u.title) ? zy(u.title) : esc(u.title)) + '</b><small class="tiny" style="display:block">' + esc(preview) + '</small></span>' +
      '<span class="tiny">' + (best != null ? '<span class="pill' + (best === u.ids.length ? ' ok' : '') + '">' + best + '/' + u.ids.length + '</span>' : pr.seen + '/' + pr.n) + '</span><span class="arr">›</span></button>';
  });
  return h + '</div>';
};

VIEWS.unit = function (p) {
  const b = book(p.id), u = b.units[p.u];
  let h = pageHead(HAN.test(u.title) ? u.title : b.zh + ' ' + u.title, b.my);
  h += '<div class="btns two"><button class="btn pri" data-a="study" data-b="' + b.id + '" data-u="' + p.u + '">' + T('學習', 'လေ့လာ') + '</button>' +
    '<button class="btn" data-a="quiz" data-b="' + b.id + '" data-u="' + p.u + '">' + T('5 秒測驗', '၅ စက္ကန့် စမ်းသပ်') + '</button></div>';
  if (b.kind === 'ui') h += '<button class="btn block ghost" style="margin-top:10px" data-a="screens">' + T('手機畫面題', 'ဖုန်းမျက်နှာပြင် မေးခွန်း') + '</button>';
  h += '<div class="list" style="margin-top:14px">';
  u.ids.forEach(id => {
    const w = WORDS[id], st = S.w[id];
    h += '<div class="li"><span class="grow"><span style="font-size:1.15rem">' + zy(w.zh) + '</span>' + (st && st.seen ? ' <span class="tiny">' + (st.s >= 2 ? '✓' : '·') + '</span>' : '') +
      '<small class="my">' + esc(w.my) + '</small></span>' + playBtn(id, true) + starBtn(id) + '</div>';
  });
  return h + '</div>';
};

/* ---- 學習卡 ---- */
function startStudy(ids, opt) {
  stopAll();
  NAV.sheet = Object.assign({ v: 'study', ids: ids.slice(), i: 0, recall: false, show: false, title: '學習', then: null, tag: null, unit: null }, opt || {});
  render(); autoPlayCard();
}
function autoPlayCard() { const s = NAV.sheet; if (s && s.v === 'study' && S.set.auto) setTimeout(() => playWord(WORDS[s.ids[s.i]]), 150); }
SHEETS.study = function (s) {
  const id = s.ids[s.i], w = WORDS[id];
  const show = !s.recall || s.show;
  let h = sheetHead(s.title, s.i + 1, s.ids.length);
  h += '<div class="wordcard fade"><span class="no">No.' + String(s.i + 1).padStart(2, '0') + '</span><span class="src">' + srcPill(w) + '</span>' +
    '<div class="big' + (w.zh.length > 4 ? ' long' : '') + '">' + zy(w.zh) + '</div>' + playBtn(id);
  if (show) {
    h += '<div class="mean">' + MY(w.my) + '</div>';
    if (w.src === 'u') {
      h += '<div class="ex"><div class="small">' + zy(w.whatZh) + '</div>' + MY(w.what) +
        '<div class="note blue" style="margin-top:12px"><div class="tiny">' + T('畫面上會看到', 'မျက်နှာပြင်မှာ မြင်ရမယ်') + '</div><div class="zh">' + zy(w.ex) + '</div>' + MY(w.exMy) + '</div></div>';
    } else if (w.ex) {
      h += '<div class="ex"><div class="row"><div class="zh grow">' + zy(w.ex) + '</div><button class="play sm" data-a="say" data-t="' + esc(plain(w.ex)) + '">' + ICON.sound + '</button></div>' + MY(w.exMy) +
        (w.ex2 ? '<div class="row" style="margin-top:8px"><div class="zh grow">' + zy(w.ex2.cn) + '</div><button class="play sm" data-a="say" data-t="' + esc(w.ex2.cn) + '">' + ICON.sound + '</button></div>' + MY(w.ex2.my) : '') +
        (w.note ? '<div class="note" style="margin-top:10px">' + MY(w.note) + '</div>' : '') + '</div>';
    } else if (w.note) h += '<div class="ex small">' + zy(w.note) + '</div>';
  } else h += '<p class="small muted" style="margin-top:14px">' + T('先想一想意思，再看答案。', 'အဓိပ္ပာယ်ကို အရင်တွေးကြည့်ပါ။') + '</p>';
  h += '<div class="star-pos">' + starBtn(id) + '</div></div>';
  h += '<div style="margin-top:16px">' + (show
    ? '<div class="btns two"><button class="btn" data-a="sknow" data-k="0">' + T('再看一次', 'နောက်တစ်ခါ ထပ်ကြည့်') + '</button><button class="btn pri" data-a="sknow" data-k="1">' + T('記住了', 'မှတ်မိပြီ') + '</button></div>'
    : '<button class="btn pri block" data-a="sshow">' + T('看答案', 'အဖြေကြည့်') + '</button>') + '</div>';
  return h;
};
function studyNext(known) {
  const s = NAV.sheet, id = s.ids[s.i];
  mark(id, !!known);
  if (!known && !s.requeued) { s.requeue = s.requeue || []; if (s.requeue.indexOf(id) < 0 && s.ids.length < 40) { s.ids.push(id); s.requeue.push(id); } }
  save();
  if (s.i + 1 < s.ids.length) { s.i++; s.show = false; render(); autoPlayCard(); return; }
  const uniq = [...new Set(s.ids)];
  if (s.then === 'quiz') return startQuiz(uniq, { tag: s.tag, unit: s.unit, title: '5 秒測驗' });
  if (s.then === 'screens') return startScreens(3, 'ui');
  if (s.tag) doneTask(s.tag);
  NAV.sheet = { v: 'done', title: s.title, msg: ['學完了 ' + uniq.length + ' 個字', 'စကားလုံး ' + uniq.length + ' လုံး ပြီးပြီ'] };
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
  NAV.sheet = Object.assign({ v: 'quiz', qs: qs, i: 0, res: [], sel: null, title: '5 秒測驗', sec: 5, tag: null, unit: null }, opt || {});
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
  if (s.sel === -1) h += '<div class="fb bad">' + T('時間到', 'အချိန်ပြည့်ပြီ') + '</div>';
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
  h += '<div class="card center"><div class="score">' + n + '<small> / ' + s.res.length + '</small></div><p class="small muted">' + T(n === s.res.length ? '全部答對！' : '答錯的字會很快再出現。', n === s.res.length ? 'အကုန်မှန်တယ်' : 'မှားတဲ့စကားလုံး မကြာခင် ပြန်ပေါ်မယ်') + '</p></div>';
  if (wrong.length) {
    h += '<div class="sec"><h2>' + T('答錯的字', 'မှားခဲ့တဲ့ စကားလုံး') + '</h2></div><div class="list">';
    wrong.forEach(r => { const w = WORDS[r.id]; h += '<div class="li"><span class="grow">' + zy(w.zh) + '<small class="my">' + esc(w.my) + '</small></span>' + playBtn(r.id, true) + starBtn(r.id) + '</div>'; });
    h += '</div><button class="btn block" style="margin-top:12px" data-a="starall">' + T('全部加入生字本', 'အားလုံး စကားလုံးစာအုပ်ထဲ ထည့်') + '</button>';
  }
  h += '<div class="btns two" style="margin-top:16px"><button class="btn" data-a="qagain">' + T('再測一次', 'ထပ်စမ်း') + '</button><button class="btn pri" data-a="close">' + T('完成', 'ပြီးပြီ') + '</button></div>';
  return h;
};

/* ---- 生字本 ---- */
VIEWS.note = function () {
  const f = NAV.nf || 'all';
  const all = Object.keys(S.w).filter(id => S.w[id].star && WORDS[id]);
  const dueIds = all.filter(due);
  const list = f === 'due' ? dueIds : all;
  let h = pageHead('生字本', 'စကားလုံးစာအုပ်');
  h += '<div class="chips"><button class="chip' + (f === 'all' ? ' on' : '') + '" data-a="nf" data-f="all">' + esc('全部 ' + all.length) + '</button><button class="chip' + (f === 'due' ? ' on' : '') + '" data-a="nf" data-f="due">' + esc('該複習 ' + dueIds.length) + '</button></div>';
  if (!all.length) return h + '<div class="empty">' + T('還沒有字。看到不熟的字，按 ☆ 就會放進來。', 'မသိတဲ့စကားလုံးတွေ့ရင် ☆ ကိုနှိပ်ပါ။') + '</div>';
  h += '<div class="btns two" style="margin:12px 0"><button class="btn" data-a="nstudy"' + (list.length ? '' : ' disabled') + '>' + T('複習', 'ပြန်လေ့လာ') + '</button><button class="btn pri" data-a="nquiz"' + (all.length >= 4 ? '' : ' disabled') + '>' + T('5 秒測驗', '၅ စက္ကန့်') + '</button></div>';
  if (all.length < 4) h += '<p class="tiny">' + esc('生字本有 4 個字以上就可以測驗。') + '</p>';
  h += '<div class="list">';
  list.sort((a, b) => (S.w[a].d || 0) - (S.w[b].d || 0)).forEach(id => {
    const w = WORDS[id];
    h += '<div class="li"><span class="grow">' + zy(w.zh) + ' ' + srcPill(w) + '<small class="my">' + esc(w.my) + '</small></span>' + playBtn(id, true) + starBtn(id) + '</div>';
  });
  return h + '</div>';
};

/* ---- 介面字 ---- */
function uiHome() {
  let h = '<p class="small muted" style="margin:12px 2px">' + zy('手機、網頁、學校系統上常看到的字。按下去會發生什麼事，比字面意思更重要。') + '<small class="my">ဖုန်း၊ ဝဘ်၊ ကျောင်းစနစ်မှာ မြင်ရတဲ့စကားလုံး။ နှိပ်ရင် ဘာဖြစ်လဲ သိဖို့ အရေးကြီးတယ်။</small></p>';
  const sc = UI_SCREENS.length, got = Object.keys(S.scr).filter(k => S.scr[k] > 0).length;
  h += '<button class="card row" style="width:100%;text-align:left" data-a="screens"><span class="mk" style="width:46px;height:46px;border-radius:12px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--blue)">' + ICON.phone + '</span><span class="grow"><b style="font-weight:500">' + zy('手機畫面題') + '</b><small class="my">ဖုန်းမျက်နှာပြင်ကြည့်ပြီး ဘာနှိပ်မလဲ ရွေး</small></span><span class="tiny">' + got + '/' + sc + '</span></button>';
  h += '<div class="sec"><h2>' + T('分類', 'အမျိုးအစား') + '</h2></div><div class="list">';
  BOOKS.filter(b => b.kind === 'ui').forEach((b, i) => {
    const p = wordProgress(bookIds(b));
    h += '<button class="li" data-a="go" data-v="unit" data-id="' + b.id + '" data-u="0"><span class="no">' + String(i + 1).padStart(2, '0') + '</span><span class="grow">' + zy(b.zh) + '<small class="my">' + esc(b.my) + '</small></span><span class="tiny">' + p.seen + '/' + p.n + '</span><span class="arr">›</span></button>';
  });
  h += '</div><div class="sec"><h2>' + T('容易搞混', 'ရောထွေးလွယ်') + '</h2></div><div class="list">';
  UI_GROUPS.forEach(g => { h += '<button class="li" data-a="go" data-v="uigroup" data-id="' + g.id + '"><span class="grow">' + zy(g.name) + '</span><span class="arr">›</span></button>'; });
  return h + '</div>';
}
VIEWS.uigroup = function (p) {
  const g = UI_GROUPS.find(x => x.id === p.id);
  let h = pageHead(g.name, '');
  h += '<div class="note blue"><div>' + zy(g.zh) + '</div>' + MY(g.my) + '</div><div class="cmp" style="margin-top:14px">';
  g.ids.forEach(k => { const w = WORDS['u' + k]; h += '<div class="c"><b>' + zy(w.zh) + '</b><span class="grow small"><span class="my" lang="my">' + esc(w.my) + '</span><span style="display:block">' + zy(w.whatZh) + '</span></span>' + playBtn(w.id, true) + '</div>'; });
  h += '</div><button class="btn pri block" style="margin-top:16px" data-a="studyg" data-id="' + g.id + '">' + T('學這一組', 'ဒီအုပ်စု လေ့လာ') + '</button>';
  return h;
};
function startScreens(n, tag) {
  stopAll();
  const order = shuffle(UI_SCREENS.map((_, i) => i)).sort((a, b) => (S.scr[a] || 0) - (S.scr[b] || 0));
  NAV.sheet = { v: 'screen', list: order.slice(0, n || UI_SCREENS.length), i: 0, sel: null, ok: 0, tag: tag || null, title: '手機畫面題' };
  render();
}
SHEETS.screen = function (s) {
  const k = s.list[s.i], q = UI_SCREENS[k];
  let h = sheetHead(s.title, s.i + 1, s.list.length);
  h += '<p style="margin:0 0 12px;font-weight:500">' + zy(q.ask) + '</p>' + MY(q.askMy);
  h += '<div class="phone" style="margin-top:14px"><div class="dialog"><div class="dt">' + zy(q.title) + '</div><div class="db">' + zy(q.body) + '</div><div class="dbs">';
  q.btns.forEach((b, i) => {
    let c = ''; if (s.sel != null) c = i === q.a ? ' ok' : (i === s.sel ? ' bad' : '');
    h += '<button class="' + c + '" data-a="scrans" data-k="' + i + '"' + (s.sel != null ? ' disabled' : '') + '>' + zy(b) + '</button>';
  });
  h += '</div></div></div>';
  if (s.sel != null) {
    const ok = s.sel === q.a;
    h += '<div class="fb ' + (ok ? 'ok' : 'bad') + '"><b>' + T(ok ? '對！' : '再想想', ok ? 'မှန်တယ်' : 'ပြန်စဉ်းစား') + '</b><div class="why">' + zy(q.why) + MY(q.whyMy) + '</div></div>' +
      '<button class="btn pri block" style="margin-top:14px" data-a="scrnext">' + T(s.i + 1 < s.list.length ? '下一題' : '完成', s.i + 1 < s.list.length ? 'နောက်တစ်ခု' : 'ပြီးပြီ') + '</button>';
  }
  return h;
};
