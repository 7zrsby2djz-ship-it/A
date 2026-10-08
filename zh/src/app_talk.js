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
  let h = '<p class="small muted" style="margin:4px 2px 12px">' + zy('課本沒教、但每天會聽到的話。先聽懂對方，再選怎麼回答。') + '<small class="my">စာအုပ်ထဲမပါပေမယ့် နေ့တိုင်းကြားရတဲ့ စကား။ တစ်ဖက်လူကို အရင်နားလည်၊ ပြီးမှ ဘယ်လိုဖြေမလဲ ရွေး။</small></p>';
  if (S.run && !S.run.end) {
    const f = findVar(S.run.vid);
    if (f) h += '<button class="card resume row" style="width:100%;text-align:left;margin-bottom:12px" data-a="tresume"><span class="grow">' + T('接著練：' + f.sc.name, 'ဆက်လေ့ကျင့်') + '</span><span class="arr">›</span></button>';
  }
  h += '<div class="list">';
  TALK.forEach(sc => {
    h += '<button class="scene" data-a="go" data-v="scene" data-id="' + sc.id + '"><span class="mk">' + (ICON[SC_ICON[sc.id]] || ICON.chat) + '</span><span class="grow"><b style="font-weight:500">' + zy(sc.name) + '</b><small class="my">' + esc(sc.my) + '</small>' +
      '<span class="dots" style="margin-top:6px">' + sc.vars.map(v => { const r = varRank(v.id); return '<i class="' + (r === 'text' ? 't' : r ? 'l' : '') + '"></i>'; }).join('') + '</span></span><span class="arr">›</span></button>';
  });
  h += '</div><p class="tiny" style="margin:12px 4px">' + esc('● 淺棕＝看文字完成　● 藍＝只用聽完成') + '</p>';
  return h;
};

VIEWS.scene = function (p) {
  const sc = TALK.find(x => x.id === p.id);
  let h = pageHead(sc.name, sc.my);
  h += '<div class="card paper"><div class="small"><span class="muted">' + zy('目標') + '</span>　' + zy(sc.goal) + '</div>' + MY(sc.goalMy) +
    '<div class="small" style="margin-top:6px"><span class="muted">' + zy('地點') + '</span>　' + zy(sc.place) + '</div><div class="tiny" style="margin-top:6px">' + zy(sc.sim) + '</div></div>';
  h += '<div class="sec"><h2>' + T('先學這些字', 'ဒီစကားလုံးတွေ အရင်လေ့လာ') + '</h2><button class="btn sm" data-a="scwords" data-id="' + sc.id + '">' + T('全部學一次', 'အကုန်လေ့လာ') + '</button></div><div class="list">';
  sc.words.forEach((w, i) => {
    const id = 's' + sc.id + i;
    h += '<div class="li"><span class="grow"><span style="font-size:1.08rem">' + zy(w[0]) + '</span><small class="my">' + esc(w[1]) + '</small>' + (w[2] ? '<small class="tiny" style="display:block">' + zy(w[2]) + '</small>' : '') + '</span><button class="play sm" data-a="say" data-t="' + esc(w[0]) + '">' + ICON.sound + '</button>' + starBtn(id) + '</div>';
  });
  h += '</div>';
  [1, 2, 3].forEach(lv => {
    h += '<div class="sec"><h2>' + esc('Lv.' + lv) + '</h2></div><div class="card"><div class="small">' + zy(sc.axis[lv][0]) + '</div>' + MY(sc.axis[lv][1]) + '<div class="btns two" style="margin-top:12px">';
    sc.vars.filter(v => v.lv === lv).forEach(v => {
      const r = varRank(v.id);
      const lab = r ? { text: '看字完成', listen: '純聽完成', repair: '求助後完成' }[r] : '';
      h += '<button class="btn' + (r ? '' : ' pri') + '" data-a="tstart" data-id="' + v.id + '">' + T(v.tr ? '換說法' : '一般', v.tr ? 'ပြောပုံပြောင်း' : 'ပုံမှန်') + (lab ? '<small class="tiny" style="display:block">' + esc(lab) + '</small>' : '') + '</button>';
    });
    h += '</div></div>';
  });
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
function talkAuto() { const n = S.run && curNode(); if (n && n.t === 'hear' && S.set.auto) setTimeout(() => hearPlay(1), 250); }
function hearText(n) { return S.run.ns.easy && n.easy ? n.easy : n.zh; }
function hearPlay(rate) {
  const n = curNode(); const b = $('.bub.cur'); if (b) b.classList.add('playing');
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
  h += '<div class="board"><div class="g"><b>' + zy('目標') + '</b>　' + zy(f.sc.goal) + '</div>' +
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
  let h = '<div class="bub them cur' + (n.bc ? ' bc' : '') + '"><span class="who">' + esc(who) + (ns.easy ? '　· ' + esc('簡單說法') : '') + '</span>';
  h += ns.show ? '<div>' + zy(hearText(n)) + '</div>' : '<button class="hidden-text" data-a="tshow">' + esc('・・・・・') + ' <span class="pill blue" style="letter-spacing:0">' + esc('顯示文字') + '</span></button>';
  if (ns.qdone || ns.my) h += '<span class="my" lang="my" style="display:block">' + esc(ns.easy && n.easyMy ? n.easyMy : n.my) + '</span>';
  h += '</div>';
  // 求助：按鈕就是你可以說的話
  h += '<div class="repair">';
  if (n.bc) {
    h += '<button data-a="trep" data-k="again">↺ ' + zy('重播') + '</button><button data-a="trep" data-k="slow">' + zy('放慢') + '</button>';
  } else {
    h += '<button data-a="trep" data-k="again">' + zy(REPAIR.again[0]) + '</button><button data-a="trep" data-k="slow">' + zy(REPAIR.slow[0]) + '</button>' +
      '<button data-a="trep" data-k="easy"' + (n.easy && !ns.easy ? '' : ' disabled') + '>' + zy(REPAIR.easy[0]) + '</button>';
  }
  h += '</div>';
  if (n.bc) h += '<p class="tiny" style="margin:4px 2px">' + esc('廣播只能重播或放慢，不能請它說簡單一點。') + '</p>';
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
      h += '<div class="fb bad"><div>' + zy('答案是：' + q.o[q.a][0]) + '</div><div class="why small">' + (key ? zy('可以先確認這一句：「' + key + '」') : zy('可以按「顯示文字」再看一次，或請對方說慢一點。')) + '</div></div>' +
        '<button class="btn block" style="margin-top:10px" data-a="tqnext">' + T('知道了', 'နားလည်ပြီ') + '</button>';
    }
    h += '</div>';
  } else {
    if (n.learn) h += '<div class="note blue small" style="margin-top:12px">✓ ' + zy(n.learn[0]) + MY(n.learn[1]) + '</div>';
    h += '<button class="btn pri block" style="margin-top:12px" data-a="tnext">' + T('繼續', 'ဆက်') + '</button>';
  }
  return h;
};
NODE.say = function (n) {
  const ns = S.run.ns;
  let h = '<div class="card"><div class="tiny">' + T('換你先說', 'မင်းအရင်ပြော') + '</div><div style="font-weight:500;margin-top:4px">' + zy(n.intent) + '</div>' + MY(n.intentMy);
  h += '<div class="blocks">' + n.skel.map((b, i) => (i ? '<span class="plus">＋</span>' : '') + '<span class="b">' + zy(b[0]) + '<small class="my">' + esc(b[1]) + '</small></span>').join('') + '</div>';
  if (!ns.rev) h += '<p class="small muted">' + T('先自己大聲說出來，再看參考答案。', 'ကိုယ်တိုင် အသံထွက်ပြောပြီးမှ အဖြေကြည့်။') + '</p><button class="btn pri block" data-a="trev">' + T('看參考答案', 'နမူနာအဖြေ ကြည့်') + '</button>';
  else {
    h += '<hr class="thin"><div class="row"><div class="grow" style="font-size:1.1rem;line-height:2.1">' + zy(n.ans) + '</div><button class="play sm" data-a="say" data-t="' + esc(n.ans) + '">' + ICON.sound + '</button></div>' + MY(n.ansMy);
    if (n.alt) n.alt.forEach(a => { h += '<div class="row small" style="margin-top:6px"><span class="tiny">' + zy('也可以') + '</span><span class="grow">' + zy(a) + '</span><button class="play sm" data-a="say" data-t="' + esc(a) + '">' + ICON.sound + '</button></div>'; });
    h += '<button class="btn pri block" style="margin-top:14px" data-a="tsaid">' + T('我說了，繼續', 'ပြောပြီးပြီ၊ ဆက်') + '</button>';
  }
  return h + '</div>';
};
NODE.act = function (n) {
  const ns = S.run.ns;
  let h = '<div class="card"><div style="font-weight:500">' + zy(n.q) + '</div>' + MY(n.qMy) + '<div style="margin-top:12px">';
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
    if (o.r === 'ok' || o.go) h += '<button class="btn pri block" style="margin-top:12px" data-a="tactnext">' + T('繼續', 'ဆက်') + '</button>';
    else h += '<p class="tiny" style="margin-top:8px">' + esc('再選一次。') + '</p>';
  }
  return h + '</div>';
};
NODE.end = function (n, f) {
  const r = S.run, t = S.talk[r.vid];
  const lab = { text: ['看文字完成', 'စာကြည့်ပြီး ပြီးမြောက်'], listen: ['只用聽就完成', 'နားထောင်ရုံနဲ့ ပြီးမြောက်'], repair: ['求助後完成', 'အကူအညီတောင်းပြီး ပြီးမြောက်'] }[t.kind];
  const other = f.sc.vars.find(v => v.lv === f.v.lv && v.id !== f.v.id);
  const up = f.sc.vars.find(v => v.lv === f.v.lv + 1 && !v.tr);
  let h = '<div class="card endcard' + (n.res === 'late' ? ' late' : '') + '"><div class="mark">' + ICON.check + '</div><div style="font-size:1.05rem;line-height:2">' + zy(n.text) + '</div>' + MY(n.textMy) +
    '<div class="row" style="justify-content:center;margin-top:12px;gap:6px"><span class="pill blue">' + esc(lab[0]) + '</span>' + (r.help ? '<span class="pill">' + esc('求助 ' + r.help + ' 次') + '</span>' : '') + '</div>';
  if (t.kind === 'text') h += '<p class="tiny" style="margin-top:10px">' + esc('下次這段會先不顯示文字，試試只用聽。') + '</p>';
  h += '</div><div class="btns" style="margin-top:14px">';
  if (other) h += '<button class="btn pri" data-a="tstart" data-id="' + other.id + '">' + T(other.tr ? '試試換說法' : '練一般版本', other.tr ? 'ပြောပုံပြောင်း စမ်း' : 'ပုံမှန် စမ်း') + '</button>';
  else if (up) h += '<button class="btn pri" data-a="tstart" data-id="' + up.id + '">' + T('下一級', 'နောက်အဆင့်') + '</button>';
  h += '<button class="btn" data-a="tstart" data-id="' + r.vid + '">' + T('再練一次', 'ထပ်လေ့ကျင့်') + '</button><button class="btn ghost" data-a="close">' + T('回去', 'ပြန်') + '</button></div>';
  return h;
};
function talkAct(a, k) {
  const r = S.run, ns = r.ns, n = curNode(), f = findVar(r.vid);
  if (a === 'tshow') { ns.show = true; r.text = true; }
  else if (a === 'tmode') { r.mode = r.mode === 'full' ? 'listen' : 'full'; if (r.mode === 'full') { ns.show = true; r.text = true; } }
  else if (a === 'trep') {
    r.help++;
    if (k === 'easy') { ns.easy = true; speak(REPAIR.easy[0], 1.05, () => setTimeout(() => hearPlay(.9), 250)); }
    else if (n.bc) { hearPlay(k === 'slow' ? .7 : 1); }
    else speak(REPAIR[k][0], 1.05, () => setTimeout(() => hearPlay(k === 'slow' ? .7 : 1), 250));
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
