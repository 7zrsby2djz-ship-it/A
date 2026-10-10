/* ===== 生活對話：對方先說 → 聽懂 → 回答小問題 → 選怎麼接（照日文 App 的流程） ===== */
const SC_ICON = { sbux: 'cup', boba: 'boba', cvs: 'store', bfast: 'egg', mrt: 'train', school: 'school' };
function findVar(vid) { for (const sc of TALK) { const v = sc.vars.find(x => x.id === vid); if (v) return { sc, v }; } return null; }
function varRank(vid) { const t = S.talk[vid]; return t ? t.best : null; }
function sceneDone(sc) { return sc.vars.filter(v => S.talk[v.id]).length; }
function nextVar(sc) {
  // 先一般版本，再換說法；照級數
  for (const lv of [1, 2, 3]) for (const v of sc.vars.filter(x => x.lv === lv)) if (!S.talk[v.id]) return v;
  return sc.vars.slice().sort((a, b) => (S.talk[a.id].last || 0) - (S.talk[b.id].last || 0))[0];
}
function recommendVar() {
  // 首頁推薦：還沒練過的最低級數；都練過就挑最久沒練的
  for (const lv of [1, 2, 3]) for (const sc of TALK) for (const v of sc.vars.filter(x => x.lv === lv && !x.tr)) if (!S.talk[v.id]) return v.id;
  for (const lv of [1, 2, 3]) for (const sc of TALK) for (const v of sc.vars.filter(x => x.lv === lv)) if (!S.talk[v.id]) return v.id;
  let best = null; TALK.forEach(sc => sc.vars.forEach(v => { if (!best || (S.talk[v.id].last || 0) < (S.talk[best].last || 0)) best = v.id; }));
  return best;
}

VIEWS.talk = function () {
  const total = TALK.reduce((n, sc) => n + sc.vars.length, 0);
  const done = TALK.reduce((n, sc) => n + sceneDone(sc), 0);
  const currentScene = TALK.find(sc => sceneDone(sc) < sc.vars.length) || TALK[0];
  let h = '<div class="journey-header"><div class="grow"><span class="map-current-label">' + B('နေ့စဉ် စကားပြော') + '</span><h1>' + B('တစ်ယူနစ်ချင်း ရှေ့ဆက်မယ်') + '</h1></div>' + MASCOT('smile', 64) + '</div>';
  h += '<div class="journey-summary">' + B('ပြီးပြီ ' + MYNUM(done) + ' / ' + MYNUM(total)) + '<span>' + B('ယူနစ် ' + MYNUM(TALK.length) + ' ခု') + '</span></div>' + journeyProgress(done, total, 'စကားပြော ပြီးမြောက်မှု');
  if (S.run && !S.run.end) {
    const f = findVar(S.run.vid);
    if (f) h += '<button class="resume-card" data-a="tresume"><span class="ico">' + ICON.play + '</span><span class="grow">' + B('စကားပြော ဆက်လုပ်မယ်') + '<span class="map-sub">' + B(f.sc.my) + '</span></span><span aria-hidden="true">›</span></button>';
  }
  h += '<div class="unit-list">';
  TALK.forEach((sc, i) => {
    const n = sceneDone(sc), full = n === sc.vars.length, current = sc.id === currentScene.id && !full;
    h += '<button class="unit-card' + (full ? ' done' : current ? ' current' : '') + '" data-a="go" data-v="scene" data-id="' + sc.id + '">' +
      '<span class="unit-number" aria-hidden="true">' + (full ? ICON.check : MYNUM(i + 1)) + '</span><span class="grow"><span class="map-current-label">' + B('ယူနစ် ' + MYNUM(i + 1)) + '</span><span class="map-title">' + B(sc.my) + '</span>' +
      '<span class="map-sub">' + B('ပြီးပြီ ' + MYNUM(n) + ' / ' + MYNUM(sc.vars.length)) + '</span><span class="unit-progress"><i style="width:' + Math.round(n / sc.vars.length * 100) + '%"></i></span>' +
      (current ? '<span class="map-badge">' + B('ဒီယူနစ်ကနေ စမယ်') + '</span>' : '') + '</span><span class="map-arrow" aria-hidden="true">›</span></button>';
  });
  return h + '</div><p class="map-footnote">' + B('ယူနစ်တိုင်း စမ်းလို့ရတယ်။ စာကြည့်ပြီး ပြီးမြောက်တာလည်း မှတ်ထားပေးမယ်။') + '</p>';
};

VIEWS.scene = function (p) {
  const sc = TALK.find(x => x.id === p.id), nv = nextVar(sc), completed = sceneDone(sc);
  const vars = sc.vars.slice().sort((a, b) => a.lv - b.lv || Number(!!a.tr) - Number(!!b.tr));
  let h = pageHead('', sc.my);
  h += '<div class="map-unit-header"><span class="map-current-label">' + B('ယူနစ် ' + MYNUM(TALK.indexOf(sc) + 1)) + '</span><p>' + B(sc.goalMy) + '</p><div class="journey-summary">' + B('ပြီးပြီ ' + MYNUM(completed) + ' / ' + MYNUM(vars.length)) + '</div>' + journeyProgress(completed, vars.length, sc.my) + '</div>';
  h += learningMap(vars.map(v => {
    const r = varRank(v.id);
    const labels = { text: 'စာကြည့်ပြီး ပြီးမြောက်', repair: 'အကူအညီတောင်းပြီး ပြီးမြောက်', listen: 'နားထောင်ရုံနဲ့ ပြီးမြောက်' };
    return { name: 'အဆင့် ' + MYNUM(v.lv) + ' · ' + (v.tr ? 'ပြောပုံပြောင်း' : 'ပုံမှန်'),
      sub: sc.axis[v.lv][1], ico: v.tr ? ICON.repeat : ICON.chat,
      state: r ? 'done' : v.id === nv.id ? 'current' : 'upcoming',
      badge: r ? labels[r] + ' · ပြန်လေ့ကျင့်' : null, data: { a: 'tstart', id: v.id } };
  }), sc.my + ' အဆင့်များ');
  h += '<button class="btn block" data-a="scwords" data-id="' + sc.id + '">' + ICON.book + B('ဒီနေရာမှာ သုံးတဲ့ စကားလုံး ' + MYNUM(sc.words.length) + ' လုံး') + '</button>';
  return h;
};

/* ---- 執行 ---- */
function startTalk(vid, tag) {
  stopAll();
  const f = findVar(vid);
  const mode = S.talk[vid] && TTS.ok ? 'listen' : 'full';
  S.run = { vid: vid, i: 0, hist: [], board: [], help: 0, text: mode === 'full', qWrong: 0, mode: mode, tag: tag || null, t0: now(), end: false };
  NAV.sheet = { v: 'talk' };
  enterNode(); save(); render(); talkAuto();
}
function curNode() { const f = findVar(S.run.vid); return f.v.nodes[S.run.i]; }
function enterNode() {
  const n = curNode();
  S.run.ns = { qi: 0, sel: null, show: S.run.mode === 'full' || !TTS.ok, easy: false, my: false, rev: false, tried: [], ord: null, fb: null, qdone: false };
  if (n.t === 'act') S.run.ns.ord = shuffle(n.o.map((_, i) => i));
  if (n.t === 'hear' && n.q) S.run.ns.qord = n.q.map(q => shuffle(q.o.map((_, i) => i)));
  if (n.t === 'end') finishTalk();
}
function talkAuto() {
  const run = S.run, ns = run && run.ns, n = run && curNode(), seq = TTS.seq;
  if (n && n.t === 'hear' && S.set.auto) setTimeout(() => {
    if (S.run === run && run.ns === ns && NAV.sheet && NAV.sheet.v === 'talk' && TTS.seq === seq) hearPlay(1);
  }, 250);
}
function hearText(n) { return S.run.ns.easy && n.easy ? n.easy : n.zh; }
function hearPlay(rate) {
  if (!S.run || !NAV.sheet || NAV.sheet.v !== 'talk') return;
  const n = curNode(); if (n.t !== 'hear') return; const b = $('.bub.cur'); if (b) b.classList.add('playing');
  speak(hearText(n), rate, () => { const b2 = $('.bub.cur'); if (b2) b2.classList.remove('playing'); });
}
function talkGo(go) {
  const f = findVar(S.run.vid);
  if (go) { const j = f.v.nodes.findIndex(x => x.id === go); S.run.i = j >= 0 ? j : S.run.i + 1; } else S.run.i++;
  enterNode(); save(); render(); talkAuto();
  setTimeout(() => { const c = $('.cur-node'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
}
function finishTalk() {
  const r = S.run; if (r.end) return;
  r.end = true;
  const f = findVar(r.vid);
  const kind = r.text ? 'text' : (r.help ? 'repair' : 'listen');
  const rank = { text: 1, repair: 2, listen: 3 };
  const old = S.talk[r.vid];
  S.talk[r.vid] = { n: (old ? old.n : 0) + 1, best: old && rank[old.best] > rank[kind] ? old.best : kind, last: now(), kind: kind };
  if (r.tag) doneTask(r.tag);
  logToday('t');
}
SHEETS.talk = function () {
  const r = S.run, f = findVar(r.vid), n = curNode();
  let h = '<div class="shead"><button class="ib" data-a="close" aria-label="關閉">' + ICON.x + '</button><span class="grow">' + zy(f.sc.name) + ' <span class="pill">' + esc('Lv.' + f.v.lv + (f.v.tr ? ' 換說法' : '')) + '</span></span>' +
    '<button class="ib' + (r.mode === 'full' ? ' on' : '') + '" data-a="tmode" aria-label="文字">' + ICON.text + '</button></div>';
  h += '<div class="board"><div class="g ui">' + esc('ရည်မှန်းချက်：' + f.sc.goalMy) + '</div>' +
    (r.board.length ? '<div class="got">' + r.board.map(b => '<span>' + esc(b[0]) + '</span>').join('') + '</div>' : '') + '</div>';
  if (r.i === 0 && !r.hist.length) h += '<div class="note" style="margin-bottom:12px"><div class="small">' + zy(f.v.setup) + '</div>' + MY(f.v.setupMy) + '</div>';
  h += '<div class="chat">';
  r.hist.forEach(x => {
    if (x.k === 'them') h += '<div class="bub them past' + (x.bc ? ' bc' : '') + '"><span class="who">' + esc(x.who) + '</span>' + zy(x.zh) + (x.my ? '<span class="my" style="display:block">' + esc(x.my) + '</span>' : '') + '</div>';
    else h += '<div class="bub me past">' + zy(x.zh) + '</div>';
  });
  h += '</div><div class="cur-node fade" style="margin-top:12px">' + NODE[n.t](n, f) + '</div>';
  return h;
};
const NODE = {};
NODE.hear = function (n, f) {
  const ns = S.run.ns, who = n.bc ? '📢 ' + (n.who || '廣播') : (n.who || f.v.who || '');
  const qs = n.q || [];
  let h = '<div class="bub them cur' + (n.bc ? ' bc' : '') + '"><span class="who">' + esc(who) + (ns.easy ? '　· ' + esc('လွယ်တဲ့ပြောပုံ') : '') + '</span>';
  h += ns.show ? '<div>' + zy(hearText(n)) + '</div>' : '<button class="hidden-text" data-a="tshow">' + esc('・・・・・') + ' <span class="pill blue" style="letter-spacing:0">' + esc('顯示文字') + '</span></button>';
  if (ns.qdone || ns.my) h += '<span class="my" lang="my" style="display:block">' + esc(ns.easy && n.easyMy ? n.easyMy : n.my) + '</span>';
  h += '</div>';
  // 求助：按鈕就是你可以說的話
  h += '<div class="repair">';
  if (n.bc) {
    h += '<button data-a="trep" data-k="again" class="ui">↺ ' + esc('ထပ်နားထောင်') + '</button><button data-a="trep" data-k="slow" class="ui">' + esc('ဖြည်းဖြည်း') + '</button>';
  } else {
    h += '<button data-a="trep" data-k="again">' + zy(REPAIR.again[0]) + '</button><button data-a="trep" data-k="slow">' + zy(REPAIR.slow[0]) + '</button>' +
      '<button data-a="trep" data-k="easy"' + (n.easy && !ns.easy ? '' : ' disabled') + '>' + zy(REPAIR.easy[0]) + '</button>';
  }
  h += '</div>';
  if (n.bc) h += '<p class="small muted ui" style="margin:4px 2px">' + esc('ကြေညာချက်ကို ထပ်နားထောင် ဒါမှမဟုတ် ဖြည်းဖြည်းနားထောင်လို့ပဲ ရတယ်။') + '</p>';
  if (!ns.qdone && qs.length) {
    const q = qs[ns.qi], ord = ns.qord[ns.qi];
    h += '<div class="qbox card" style="margin-top:12px"><div class="q">' + zy(q.q) + MY(q.qMy) + '</div>';
    ord.forEach(k => {
      let c = '';
      if (ns.sel != null) c = k === q.a ? ' ok' : (k === ns.sel ? ' bad' : ' dim');
      h += '<button class="opt' + c + '" data-a="tq" data-k="' + k + '"' + (ns.sel != null ? ' disabled' : '') + '><span class="grow">' + zy(q.o[k][0]) + '<small class="my">' + esc(q.o[k][1]) + '</small></span></button>';
    });
    if (ns.sel != null && ns.sel !== q.a) {
      const key = n.zh.indexOf(q.o[q.a][0]) >= 0 ? q.o[q.a][0] : null;
      h += '<div class="fb bad"><div><span class="ui">' + esc('အဖြေ：') + '</span>' + zy(q.o[q.a][0]) + '</div><div class="why small">' + (key ? '<span class="ui">' + esc('ဒီစာကြောင်းကို ပြန်နားထောင်：') + '</span>' + zy('「' + key + '」') : '<span class="ui">' + esc('「စာ ကြည့်မယ်」ကိုနှိပ်ပြီး ပြန်ကြည့်ပါ။') + '</span>') + '</div></div>' +
        '<button class="btn block" style="margin-top:10px" data-a="tqnext">' + B('နားလည်ပြီ') + '</button>';
    }
    h += '</div>';
  } else {
    if (n.learn) h += '<div class="note blue small" style="margin-top:12px">✓ ' + zy(n.learn[0]) + MY(n.learn[1]) + '</div>';
    h += '<button class="btn pri block" style="margin-top:12px" data-a="tnext">' + B('ဆက်သွားမယ် →') + '</button>';
  }
  return h;
};
NODE.say = function (n) {
  const ns = S.run.ns;
  let h = '<div class="card"><div class="tiny">' + B('မင်း အရင်ပြော') + '</div><div style="font-weight:500;margin-top:4px">' + zy(n.intent) + '</div>' + MY(n.intentMy);
  h += '<div class="blocks">' + n.skel.map((b, i) => (i ? '<span class="plus">＋</span>' : '') + '<span class="b">' + zy(b[0]) + '<small class="my">' + esc(b[1]) + '</small></span>').join('') + '</div>';
  if (!ns.rev) h += '<p class="small muted">' + B('အသံထွက်ပြီး ကိုယ်တိုင် အရင်ပြောကြည့်ပါ။ ပြီးမှ အဖြေကြည့်။') + '</p><button class="btn pri block" data-a="trev">' + B('နမူနာအဖြေ ကြည့်မယ်') + '</button>';
  else {
    h += '<hr class="thin"><div class="row"><div class="grow" style="font-size:1.1rem;line-height:2.1">' + zy(n.ans) + '</div><button class="play sm" data-a="say" data-t="' + esc(n.ans) + '">' + ICON.sound + '</button></div>' + MY(n.ansMy);
    if (n.alt) n.alt.forEach(a => { h += '<div class="row small" style="margin-top:6px"><span class="small muted ui">' + esc('ဒါလည်းရ') + '</span><span class="grow">' + zy(a) + '</span><button class="play sm" data-a="say" data-t="' + esc(a) + '">' + ICON.sound + '</button></div>'; });
    h += '<button class="btn pri block" style="margin-top:14px" data-a="tsaid">' + B('ပြောပြီးပြီ →') + '</button>';
  }
  return h + '</div>';
};
NODE.act = function (n) {
  const ns = S.run.ns;
  let h = '<div class="card"><div class="ui" style="font-weight:600;font-size:1.08rem">' + esc(n.qMy) + '</div><div class="small muted">' + zy(n.q) + '</div>' + '<div style="margin-top:12px">';
  ns.ord.forEach(k => {
    const o = n.o[k];
    let c = '';
    if (ns.sel === k) c = o.r === 'ok' ? ' ok' : ' bad';
    else if (ns.tried.indexOf(k) >= 0) c = ' dim';
    h += '<button class="opt' + c + '" data-a="tact" data-k="' + k + '"' + (ns.fb && ns.fb.done ? ' disabled' : '') + '><span class="grow">' + zy(o.zh) + '<small class="my">' + esc(o.my) + '</small></span></button>';
  });
  h += '</div>';
  if (ns.sel != null) {
    const o = n.o[ns.sel];
    const lab = { ok: ['可以', 'ရတယ်'], part: ['差一點', 'နည်းနည်းလိုသေး'], bad: ['會出問題', 'ပြဿနာဖြစ်မယ်'] }[o.r];
    h += '<div class="fb ' + o.r + '"><b>' + T(lab[0], lab[1]) + '</b>' + (o.why ? '<div class="why">' + zy(o.why) + MY(o.whyMy) + '</div>' : '') + '</div>';
    if (o.r === 'ok' || o.go) h += '<button class="btn pri block" style="margin-top:12px" data-a="tactnext">' + B('ဆက်သွားမယ် →') + '</button>';
    else h += '<p class="small ui" style="margin-top:8px">' + esc('နောက်တစ်ခု ပြန်ရွေးပါ။') + '</p>';
  }
  return h + '</div>';
};
NODE.end = function (n, f) {
  const r = S.run, t = S.talk[r.vid];
  const lab = { text: ['看文字完成', 'စာကြည့်ပြီး ပြီးမြောက်'], listen: ['只用聽就完成', 'နားထောင်ရုံနဲ့ ပြီးမြောက်'], repair: ['求助後完成', 'အကူအညီတောင်းပြီး ပြီးမြောက်'] }[t.kind];
  const other = f.sc.vars.find(v => v.lv === f.v.lv && v.id !== f.v.id);
  const up = f.sc.vars.find(v => v.lv === f.v.lv + 1 && !v.tr);
  let h = '<div class="card endcard' + (n.res === 'late' ? ' late' : '') + '">' + MASCOT(n.res === 'late' ? 'happy' : 'cheer', 96, 'bob') + '<div style="font-size:1.05rem;line-height:2;margin-top:6px">' + zy(n.text) + '</div>' + MY(n.textMy) +
    '<div class="row" style="justify-content:center;margin-top:12px;gap:6px"><span class="pill blue">' + esc(lab[0]) + '</span>' + (r.help ? '<span class="pill">' + esc('求助 ' + r.help + ' 次') + '</span>' : '') + '</div>';
  if (t.kind === 'text') h += '<p class="small muted ui" style="margin-top:10px">' + esc('နောက်တစ်ခါ စာမပြဘဲ နားထောင်ရုံနဲ့ စမ်းကြည့်မယ်။') + '</p>';
  h += '</div><div class="btns" style="margin-top:14px">';
  if (NAV.flow) return h + endBtn() + '<button class="linkbtn" data-a="tstart" data-id="' + r.vid + '">' + esc('ထပ်လေ့ကျင့်မယ်') + '</button></div>';
  if (other) h += '<button class="btn pri" data-a="tstart" data-id="' + other.id + '">' + B(other.tr ? 'ပြောပုံပြောင်းပြီး စမ်းမယ်' : 'ပုံမှန် စမ်းမယ်') + '</button>';
  else if (up) h += '<button class="btn pri" data-a="tstart" data-id="' + up.id + '">' + B('နောက်အဆင့်') + '</button>';
  h += '<button class="btn" data-a="tstart" data-id="' + r.vid + '">' + B('ထပ်လေ့ကျင့်မယ်') + '</button><button class="btn ghost" data-a="close">' + B('ပြန်သွားမယ်') + '</button></div>';
  return h;
};
function talkAct(a, k) {
  const r = S.run, ns = r.ns, n = curNode(), f = findVar(r.vid);
  if (a === 'tshow') { ns.show = true; r.text = true; }
  else if (a === 'tmode') { r.mode = r.mode === 'full' ? 'listen' : 'full'; if (r.mode === 'full') { ns.show = true; r.text = true; } }
  else if (a === 'trep') {
    r.help++;
    const replay = rate => { const seq = TTS.seq; setTimeout(() => {
      if (S.run === r && r.ns === ns && NAV.sheet && NAV.sheet.v === 'talk' && TTS.seq === seq) hearPlay(rate);
    }, 320); };
    if (k === 'easy') { ns.easy = true; speak(REPAIR.easy[0], 1, ok => { if (ok) replay(.9); }); }
    else if (n.bc) { hearPlay(k === 'slow' ? .7 : 1); }
    else speak(REPAIR[k][0], 1, ok => { if (ok) replay(k === 'slow' ? .7 : 1); });
  }
  else if (a === 'tq') {
    const q = n.q[ns.qi]; ns.sel = +k;
    if (ns.sel === q.a) { sfx('pass'); setTimeout(() => { if (S.run !== r || r.ns !== ns) return; ns.qi++; ns.sel = null; if (ns.qi >= n.q.length) ns.qdone = true; save(); render(); }, 550); }
    else { r.qWrong++; sfx('fail'); }
  }
  else if (a === 'tqnext') { ns.qi++; ns.sel = null; if (ns.qi >= n.q.length) ns.qdone = true; }
  else if (a === 'tnext') {
    r.hist.push({ k: 'them', who: n.bc ? '📢 ' + (n.who || '廣播') : (n.who || f.v.who), zh: hearText(n), my: ns.easy && n.easyMy ? n.easyMy : n.my, bc: !!n.bc });
    if (n.learn) r.board.push(n.learn);
    return talkGo();
  }
  else if (a === 'trev') { ns.rev = true; speak(n.ans, 1); }
  else if (a === 'tsaid') { r.hist.push({ k: 'me', zh: n.ans }); return talkGo(); }
  else if (a === 'tact') {
    const o = n.o[+k]; ns.sel = +k; if (ns.tried.indexOf(+k) < 0) ns.tried.push(+k);
    speak(o.zh, 1);
    if (o.r === 'ok') sfx('pass');
  }
  else if (a === 'tactnext') { const o = n.o[ns.sel]; if (spoken(o.zh)) r.hist.push({ k: 'me', zh: o.zh }); return talkGo(o.go); }
  save(); render();
}
