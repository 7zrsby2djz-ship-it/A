/* ================= 小店遊戲：你是日本小店的店長 =================
   一天 5 位客人。按日文按鈕問客人，聽客人回答，判斷他要什麼。
   點日文 → 看讀音、聽發音、看中文；按「說這句」才真的說出口。
   玩過的句塊會記成「見過」，對話裡的提示就會變少；聽錯的句塊標成不熟，會優先複習。
   客人臉孔的畫法改寫自《坊市掌櫃》的 portrait（表情系統）。
   ================================================================ */
const G = {view:'shops', shop:null, day:null, cust:null, pop:null, gen:0};
const G_PER_DAY = 5;
function gmSt() { if (!S.gm || typeof S.gm !== 'object') S.gm = {}; const g = S.gm;
  g.star = g.star || 0; g.yen = g.yen || 0; g.days = g.days || {}; g.best = g.best || {}; g.seen = g.seen || {};
  if (g.fast === undefined) g.fast = false; if (g.listen === undefined) g.listen = false; return g; }
const gmLv = id => Math.min(3, 1 + Math.floor((gmSt().days[id] || 0) / 2));
const gmUnlocked = id => gmSt().star >= GSHOP[id].need;
const gmTopic = (shop, id) => shop.topics.find(t => t.id === id);
const gmLine = c => (Array.isArray(c) ? c : [c]);

/* ---------- 聲音 ---------- */
let GAC = null;
function sfx(k) {
  try {
    GAC = GAC || new (window.AudioContext || window.webkitAudioContext)();
    const notes = {ok:[784, 1175], bad:[262, 196], coin:[988, 1568], door:[659, 880], star:[1047, 1319]}[k] || [600, 800];
    notes.forEach((f, i) => { const o = GAC.createOscillator(), g = GAC.createGain(), t = GAC.currentTime + i * .09;
      o.type = k === 'bad' ? 'triangle' : 'sine'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .22);
      o.connect(g).connect(GAC.destination); o.start(t); o.stop(t + .24); });
  } catch (e) {}
}
/* 依序念：先念你說的，再念客人說的 */
function gmSpeak(seq) {
  const gen = ++G.gen;
  const step = i => {
    if (gen !== G.gen || i >= seq.length) return;
    const [c, rate] = seq[i]; let done = false; const next = () => { if (done) return; done = true; setTimeout(() => step(i + 1), 250); };
    const text = lineText(gmLine(c)); speak(text, 'ja-JP', rate, next);
    setTimeout(next, 1200 + text.length * 260 / rate);
  };
  if (!canSpeak) return; step(0);
}

/* ---------- 客人的臉（改寫自《坊市掌櫃》） ---------- */
const G_FACES = ['neutral', 'smile', 'laugh', 'angry', 'shock', 'sad', 'uneasy', 'think', 'sweat'];
function gmLook() {
  return {head:gmPick(['round', 'long', 'square', 'thin']), hair:gmPick(['messy', 'bun', 'bald', 'cap', 'long', 'short', 'short']),
    glasses:Math.random() < .3, beard:Math.random() < .2 ? gmPick(['goatee', 'stubble']) : '', age:Math.random() < .2 ? 'old' : '', blush:Math.random() < .4};
}
function gmFace(L, f = 'neutral', cls = '') {
  if (!G_FACES.includes(f)) f = 'neutral';
  const P = [], A = (d, extra = '') => P.push(`<path d="${d}" ${extra}/>`);
  const head = {round:'M19 34c0-10 6-17 13-17s13 7 13 17-6 18-13 18-13-8-13-18z', long:'M20 33c0-11 5-17 12-17s12 6 12 17c0 11-5 20-12 20s-12-9-12-20z',
    square:'M19 30c0-9 6-14 13-14s13 5 13 14v8c0 9-6 14-13 14s-13-5-13-14z', thin:'M21 33c0-10 5-16 11-16s11 6 11 16-5 19-11 19-11-9-11-19z'}[L.head] || '';
  A('M13 64c2-7 9-11 19-11s17 4 19 11'); A('M27 53l5 5 5-5', 'stroke-width="1.3"');
  A(head, 'fill="var(--surface)"');
  const hair = {messy:'M19 31c0-9 5-14 13-14s13 5 13 14M19 27l3-6 2 4 3-7 3 5 3-6 3 5 3-4 2 5 3-1',
    bun:'M19 32c0-10 6-15 13-15s13 5 13 15c-3-6-8-9-13-9s-10 3-13 9zM38 16a5 5 0 1 0 0.1 0', bald:'M25 21c2-1 4-1 5 0',
    cap:'M18 27c0-7 6-11 14-11s14 4 14 11zM46 27h7', long:'M17 30c0-11 7-16 15-16s15 5 15 16v20M17 30v20M19 27c4-5 9-6 13-6s9 1 13 6',
    short:'M19 30c1-9 6-13 13-13s12 4 13 13c-4-5-9-7-13-7s-9 2-13 7z'}[L.hair];
  if (hair) A(hair, L.hair === 'bun' ? 'fill="none"' : '');
  if (L.age === 'old') A('M24 26h5M35 26h5', 'stroke-width="1" opacity=".6"');
  const BR = {neutral:['M24 31h5', 'M35 31h5'], smile:['M24 30q2.5-1.5 5 0', 'M35 30q2.5-1.5 5 0'], laugh:['M24 29q2.5-2 5 0', 'M35 29q2.5-2 5 0'],
    angry:['M24 29l5 3', 'M40 29l-5 3'], shock:['M24 28q2.5-2.5 5 0', 'M35 28q2.5-2.5 5 0'], sad:['M24 31l5-2', 'M40 31l-5-2'],
    uneasy:['M24 31q1.2-1.6 2.5 0t2.5 0', 'M35 31q1.2-1.6 2.5 0t2.5 0'], think:['M24 30l5 1', 'M35 31l5-1.5'], sweat:['M24 31l5-1', 'M40 31l-5-1']}[f];
  BR.forEach(b => A(b, `stroke-width="${f === 'angry' ? 2.4 : 1.7}"`));
  const dot = (x, y, r = 1.3) => P.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`);
  if (f === 'smile' || f === 'laugh') A('M24.5 36q2.25-2.5 4.5 0M35 36q2.25-2.5 4.5 0');
  else if (f === 'shock') { P.push('<circle cx="26.7" cy="35.5" r="2.4"/><circle cx="37.3" cy="35.5" r="2.4"/>'); dot(26.7, 35.5, .9); dot(37.3, 35.5, .9); }
  else if (f === 'uneasy') { dot(28.2, 35.8); dot(38.8, 35.8); }
  else if (f === 'think') { dot(27.5, 34.6); dot(38, 34.6); }
  else if (f === 'sad') A('M24.5 35.5q2.25 1.5 4.5 0M35 35.5q2.25 1.5 4.5 0');
  else if (f === 'sweat') A('M24.5 35.8l2.2-1 2.3 1M35 35.8l2.2-1 2.3 1');
  else { dot(26.7, 35.6); dot(37.3, 35.6); }
  if (L.glasses) A('M23 35.5a3.6 3.2 0 1 0 7.2 0a3.6 3.2 0 1 0 -7.2 0M33.8 35.5a3.6 3.2 0 1 0 7.2 0a3.6 3.2 0 1 0 -7.2 0M30.2 35.2h3.6', 'stroke-width="1.2"');
  const MO = {neutral:'M29.5 45h5', smile:'M28.5 44q3.5 3 7 0', laugh:'M28 43.5q4 6 8 0z', angry:'M28.5 46.5q3.5-3 7 0',
    shock:'M30.5 46a1.6 2.2 0 1 0 3.2 0a1.6 2.2 0 1 0 -3.2 0', sad:'M29 46.5q3-2 6 0', uneasy:'M28.5 45.5q1.2-1.4 2.4 0t2.3 0t2.3 0', think:'M31 45.5h4', sweat:'M28.5 45q1.8 1.6 3.5 0t3.5 0'}[f];
  A(MO, f === 'laugh' ? 'fill="var(--surface)"' : '');
  if (L.beard === 'goatee') A('M30 49c1 4 3 5 4 0', 'stroke-width="1.3"');
  if (L.beard === 'stubble') A('M27 49.5h.1M30 50.5h.1M33 50.5h.1M36 49.5h.1', 'stroke-width="1.4"');
  if (f === 'angry') A('M45 22l3-1-1 3M48 25l1 3-3-1', 'stroke="var(--bad)" stroke-width="1.5"');
  if (f === 'shock') A('M14 22l3 3M12 30h4M50 22l-3 3M52 30h-4', 'stroke-width="1.3"');
  if (f === 'uneasy' || f === 'sweat') A('M46 24c-2 3-2 5 0 6 2-1 2-3 0-6z', 'stroke="var(--jp)" stroke-width="1.3"');
  if ((f === 'smile' || f === 'laugh') && L.blush) A('M22 40h3M39 40h3', 'stroke="var(--bad)" stroke-width="1" opacity=".7"');
  return `<svg class="gface ${cls}" viewBox="8 8 48 56" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${P.join('')}</svg>`;
}

/* ---------- 一天、一位客人 ---------- */
function gmOpen(shopId) {
  closeSheet();
  let el = $('#gm');
  if (!el) { el = document.createElement('div'); el.id = 'gm'; el.className = 'overlay jpmode'; document.body.append(el); }
  el.hidden = false; document.body.style.overflow = 'hidden';
  G.view = 'shops'; G.pop = null;
  if (shopId && GSHOP[shopId] && gmUnlocked(shopId)) gmStartDay(shopId); else gmRender();
}
function gmClose() {
  G.gen++; try { speechSynthesis.cancel(); } catch (e) {}
  const el = $('#gm'); if (el) el.hidden = true; document.body.style.overflow = ''; G.pop = null; render();
}
function gmStartDay(id) {
  const shop = GSHOP[id], lv = gmLv(id);
  G.shop = id; G.view = 'play'; G.pop = null;
  G.day = {n:(gmSt().days[id] || 0) + 1, lv, i:0, yen:0, star:0, list:[], used:{}, wrong:{}, tip:0};
  gmNextCust();
}
function gmNextCust() {
  const shop = GSHOP[G.shop], lv = G.day.lv, base = GGEN[G.shop](lv);
  const c = Object.assign(base, {look:gmLook(), face:'neutral', pat:4, mood:0, done:{}, pending:null, said:[], ans:{}, miss:0, greeted:null, acts:0,
    hard:lv >= 3 ? .5 : lv === 2 ? .25 : 0, shown:!base.hideItems, peek:{}});
  G.cust = c; G.day.i++;
  c.said.push({who:'c', c:shop.entry}); gmSeen(shop.entry);
  sfx('door');
  // 第 2 級起，客人有時會先說自己要什麼
  if (lv >= 2 && Math.random() < .4) {
    const vt = shop.topics.filter(t => t.vol && c.need[t.id] !== undefined && t.vol[c.need[t.id]] && !(t.after || []).some(a => c.need[a] !== undefined));
    if (vt.length) { const t = gmPick(vt), line = gmPick(t.vol[c.need[t.id]]); c.said.push({who:'c', c:line}); c.ans[t.id] = line; c.pending = t.id; gmSeen(line); }
  }
  gmRender();
  gmSpeak(c.said.map(x => [x.c, 0.95]));
}
function gmSeen(c) { gmLine(c).forEach(id => { if (!CK[id]) return; ckSt(id, true); G.day && (G.day.used[id] = (G.day.used[id] || 0) + 1); }); }
function gmRequired(shop, c) {
  return shop.topics.filter(t => c.need[t.id] !== undefined && !t.optional && (t.kind !== 'yn' || t.always || c.need[t.id] === 'yes'));
}
function gmHurt(n, face) {
  const c = G.cust; c.pat = Math.max(0, c.pat - n); c.miss += n; c.face = face || (c.pat <= 1 ? 'angry' : 'uneasy'); sfx('bad');
  if (c.pat <= 0) { c.said.push({who:'c', c:'g_mou_ii'}); gmSeen('g_mou_ii'); gmSpeak([['g_mou_ii', .95]]); gmLeave(true); return true; }
  return false;
}
/* 你說了一句（按鈕） */
function gmSay(key) {
  const shop = GSHOP[G.shop], c = G.cust; if (!c || c.left) return;
  G.pop = null;
  if (key === 'greet') {
    const line = shop.greet; c.said.push({who:'me', c:line}); gmSeen(line);
    if (c.greeted === null && c.acts === 0) { c.greeted = true; c.face = 'smile'; sfx('ok'); } else c.greeted = c.greeted || false;
    c.acts++; gmRender(); gmSpeak([[line, 1]]); return;
  }
  if (c.pending) { toast('先判斷客人剛剛說了什麼'); return; }
  if (key === 'close') return gmCloseCust();
  const t = gmTopic(shop, key); c.acts++;
  c.said.push({who:'me', c:t.ask}); gmSeen(t.ask);
  const reply = line => { c.said.push({who:'c', c:line}); gmSeen(line); gmRender(); gmSpeak([[t.ask, 1], [line, LVR[Math.min(5, 1 + G.day.lv)]]]); };
  const has = c.need[t.id] !== undefined;
  if (c.done[t.id]) { reply('g_sakki'); if (!gmHurt(1)) gmRender(); return; }
  if (!has) { reply('g_e'); toast('這位客人不需要這個'); if (!gmHurt(1)) gmRender(); return; }
  const blocked = (t.after || []).filter(a => c.need[a] !== undefined && !c.done[a]);
  if (blocked.length) { reply('g_mada'); toast('順序不對：先處理「' + plainJp(CK[gmTopic(shop, blocked[0]).ask[0]].jp) + '」'); if (!gmHurt(1)) gmRender(); return; }
  if (t.kind === 'act') {
    const pool = t.react; const line = gmPick(c.hard && pool.h && Math.random() < c.hard ? pool.h : pool.e);
    c.done[t.id] = true; c.face = 'smile'; if (t.bonus) { G.day.tip += 50; sfx('coin'); } else sfx('ok');
    if (t.reveal) c.shown = true;
    reply(line); return;
  }
  const v = c.need[t.id], pool = t.ans[v], line = gmPick(c.hard && pool.h && Math.random() < c.hard ? pool.h : pool.e);
  c.ans[t.id] = line; c.pending = t.id; c.face = 'think';
  reply(line);
}
/* 你判斷客人的回答 */
function gmJudge(val) {
  const shop = GSHOP[G.shop], c = G.cust; if (!c || !c.pending) return;
  const t = gmTopic(shop, c.pending), right = c.need[t.id], line = c.ans[t.id];
  const heard = G.day.listen && !c.peek[c.said.length - 1];
  gmLine(line).forEach(id => { const r = ckSt(id, true); grade(heard ? r.l : r.t, val === right); if (val !== right) r.weak = true; });
  if (val === right) {
    c.done[t.id] = true; c.pending = null; c.face = 'smile'; sfx('ok');
    c.last = {ok:true, t:t.id, line, val};
  } else {
    G.day.wrong[gmLine(line).join(',')] = line;
    c.last = {ok:false, t:t.id, line, val};
    c.said.push({who:'c', c:line}); gmSpeak([[line, .85]]);
    if (gmHurt(1, 'shock')) return;
  }
  persist(); gmRender();
}
function gmCloseCust() {
  const shop = GSHOP[G.shop], c = G.cust;
  const miss = gmRequired(shop, c).filter(t => !c.done[t.id]);
  c.said.push({who:'me', c:'g_arigatou'}); gmSeen('g_arigatou');
  if (miss.length) {
    const t = miss[0];
    if (t.remind) { c.said.push({who:'c', c:t.remind}); gmSeen(t.remind); gmSpeak([['g_arigatou', 1], [t.remind, .95]]); }
    toast(t.warn || '還有事沒問：客人在等你問「' + plainJp(lineText(t.ask)) + '」');
    if (!gmHurt(1, 'sweat')) gmRender(); return;
  }
  gmSpeak([['g_arigatou', 1]]);
  gmLeave(false);
}
function gmLeave(angry) {
  const c = G.cust, d = G.day; c.left = true;
  const star = angry ? 0 : c.pat >= 4 ? 3 : c.pat >= 3 ? 2 : 1;
  const yen = angry ? 0 : c.yen + (c.greeted ? 30 : 0) + (gmSt().fast && !c.usedCard && star === 3 ? 50 : 0) + d.tip;
  d.tip = 0; d.yen += yen; d.star += star; d.list.push({star, yen, look:c.look, angry});
  if (!angry) { c.face = star === 3 ? 'laugh' : 'smile'; sfx(star === 3 ? 'star' : 'coin'); }
  c.result = {star, yen};
  gmRender();
}
function gmAfterCust() {
  if (G.day.i >= G_PER_DAY) return gmEndDay();
  gmNextCust();
}
function gmEndDay() {
  const g = gmSt(), d = G.day, id = G.shop;
  g.days[id] = (g.days[id] || 0) + 1; g.star += d.star; g.yen += d.yen; g.best[id] = Math.max(g.best[id] || 0, d.star);
  Object.keys(d.used).forEach(k => { g.seen[k] = (g.seen[k] || 0) + d.used[k]; });
  touchStreak(); addXp(10 + d.star * 2); L().jp += d.i; L().jpOk += d.list.filter(x => x.star === 3).length;
  persist(); G.view = 'end'; G.pop = null; gmRender();
}

/* ---------- 畫面 ---------- */
function gmJp(c, tap) { // 一句話：每個句塊可以點
  return `<span class="gl">${gmLine(c).map(id => tap ? `<button class="gck" data-g="peek" data-v="${id}">${rubyHtml(CK[id].jp)}</button>` : `<span>${rubyHtml(CK[id].jp)}</span>`).join('')}</span>`;
}
function gmDots(p) { return `<span class="gpat" aria-label="耐心 ${p}/4">${[0, 1, 2, 3].map(i => `<i class="${i < p ? 'on' : ''}"></i>`).join('')}</span>`; }
function gmRender() {
  const el = $('#gm'); if (!el || el.hidden) return;
  let h = '';
  if (G.view === 'shops') h = gmShopsHtml();
  else if (G.view === 'end') h = gmEndHtml();
  else h = gmPlayHtml();
  el.innerHTML = h + gmPopHtml();
}
function gmShopsHtml() {
  const g = gmSt();
  return `<div class="ov-head"><button class="icon-btn" data-g="close" aria-label="關閉">${IC.x}</button><div style="flex:1"><div style="font-weight:800">小店遊戲</div><div class="small muted">你是日本小店的店長</div></div><span class="gstar">★ <b class="tnum">${g.star}</b></span></div>
    <div class="ov-body"><div class="in">
      <p class="muted">客人用日文跟你說話，你按日文按鈕回應。看不懂就點一下，會念給你聽、告訴你中文。按「說這句」才真的說出口。</p>
      <div class="list">${GSHOP_ORDER.map(id => { const s = GSHOP[id], ok = gmUnlocked(id);
        return `<button class="li" data-g="${ok ? 'shop' : 'locked'}" data-v="${id}" ${ok ? '' : 'aria-disabled="true"'}><div class="grow">
          <div style="font-weight:800"><span class="jpf">${rubyHtml(CK[s.nm].jp)}</span>　${esc(s.zh)}</div>
          <div class="zh">${ok ? `第 ${gmLv(id)} 級・開店 ${g.days[id] || 0} 天・最佳 ${g.best[id] || 0}★` : `累積 ${s.need}★ 解鎖（還差 ${s.need - g.star}★）`}</div></div>${ok ? IC.chev : '<span class="pill st-new">未解鎖</span>'}</button>`; }).join('')}</div>
      <section class="card flat stack" style="gap:10px"><p class="sec-title" style="margin:0">玩法設定</p>
        <button class="set-row gset" data-g="fast"><div class="grow"><b>熟練模式</b><p class="small muted">點日文按鈕就直接說，不先跳出說明。全對的客人多給 50 円。</p></div><span class="switch" role="switch" aria-checked="${g.fast}"></span></button>
        <button class="set-row gset" data-g="listen"><div class="grow"><b>只聽模式</b><p class="small muted">客人說的話先不顯示文字，聽完再判斷（算聽力）。</p></div><span class="switch" role="switch" aria-checked="${g.listen}"></span></button>
      </section>
      <p class="small muted">等級：每開店 2 天升一級。第 2 級起客人會主動先說要什麼；第 3 級起說法變多、變口語。</p>
      <p class="small muted">金額、商品、各店流程是遊戲用的模擬。</p>
    </div></div>`;
}
function gmPlayHtml() {
  const shop = GSHOP[G.shop], c = G.cust, d = G.day, g = gmSt();
  const head = `<div class="ov-head"><button class="icon-btn" data-g="close" aria-label="關閉（這一天不會存）">${IC.x}</button>
    <div style="flex:1;min-width:0"><div style="font-weight:800"><span class="jpf">${rubyHtml(CK[shop.nm].jp)}</span>・第 ${d.n} 天</div><div class="small muted">客人 ${d.i}/${G_PER_DAY}・第 ${d.lv} 級${g.fast ? '・熟練' : ''}${g.listen ? '・只聽' : ''}</div></div>
    <span class="gstar"><b class="tnum">${d.yen}</b> 円　★ <b class="tnum">${d.star}</b></span></div>`;
  let b = '';
  if (d.n === 1 && d.i === 1 && !c.acts) b += `<div class="point"><span class="bk">玩法</span>${esc(shop.intro)}</div>`;
  b += `<section class="gcust"><div class="gwho">${gmFace(c.look, c.face, 'big')}<div>${gmDots(c.pat)}<p class="small muted">${c.left ? (c.result.star ? '客人滿意地離開' : '客人生氣走了') : c.pat >= 4 ? '心情很好' : c.pat >= 3 ? '還可以' : c.pat >= 2 ? '有點不耐煩' : '快生氣了'}</p></div></div>`;
  if (c.items.length) b += `<div class="gitems">${c.shown ? c.items.map(x => `<button class="chip jpf" data-g="peek" data-v="${shop.items[x].c}"><span>${rubyHtml(CK[shop.items[x].c].jp)}</span></button>`).join('') : '<span class="small muted">（客人還沒給你餐券）</span>'}</div>`;
  // 對話紀錄：只顯示最近 4 句，最後一句客人說的話最大
  const recent = c.said.slice(-4);
  b += `<div class="glog">${recent.map((x, k) => { const idx = c.said.length - recent.length + k, isLastC = x.who === 'c' && k === recent.length - 1;
    const hide = x.who === 'c' && g.listen && !c.peek[idx] && !c.left && idx === c.said.length - 1 && c.pending;
    return `<div class="gln ${x.who === 'me' ? 'me' : ''} ${isLastC ? 'last' : ''}"><span class="gsp">${x.who === 'me' ? '你' : '客人'}</span>${hide ? `<span class="muted">（只用聽的）</span> <button class="btn ghost sm" data-g="peekLine" data-v="${idx}">看字</button>` : gmJp(x.c, true)}</div>`; }).join('')}</div>
    <div class="row" style="gap:8px"><button class="btn sm jp-b" style="flex:1" data-g="replay">${IC.speak}再聽客人說</button><button class="btn sm" data-g="slow">慢一點</button></div></section>`;
  let f = '';
  if (c.left) {
    b += `<div class="fb ${c.result.star ? 'ok' : 'no'}"><h3>${c.result.star ? '★'.repeat(c.result.star) + '☆'.repeat(3 - c.result.star) : '客人走了'}</h3><p>${c.result.star ? `收入 ${c.result.yen} 円${c.greeted ? '（有先說いらっしゃいませ，+30）' : ''}` : '耐心用完了。聽不懂時可以按「再聽」「慢一點」，或點客人的話看中文。'}</p></div>`;
    f = `<button class="btn primary block" data-g="nextCust">${d.i >= G_PER_DAY ? '打烊，看今天的成績' : '下一位客人'}</button>`;
  } else if (c.pending) {
    const t = gmTopic(shop, c.pending), last = c.last && !c.last.ok && c.last.t === t.id ? c.last : null;
    b += `<section class="card stack gjudge" style="gap:10px"><p class="small muted">客人回答了「${gmJp(t.ask, false)}」</p><p class="q" style="font-size:18px">他的意思是？</p>
      ${last ? `<div class="qfb no">不對喔，再聽一次客人說的話。點客人的話可以看中文。</div>` : ''}
      <div class="opts gopts">${t.kind === 'yn' ? `<button class="opt" data-g="judge" data-v="yes">要（はい）</button><button class="opt" data-g="judge" data-v="no">不要</button>`
        : Object.entries(t.opts).map(([v, cid]) => `<button class="opt jpf" data-g="judge" data-v="${v}">${rubyHtml(CK[cid].jp)}</button>`).join('')}</div></section>`;
    f = `<p class="small muted" style="text-align:center">先判斷，再繼續問</p>`;
  } else {
    if (c.last && c.last.ok) { const t = gmTopic(shop, c.last.t), v = c.last.val;
      b += `<div class="qfb ok">對了：「${gmJp(c.last.line, false)}」＝${esc(t.kind === 'yn' ? (v === 'yes' ? '要' : '不要') : CK[t.opts[v]].zh)}</div>`; c.last = null; }
    const btn = (key, line, done, extra = '') => `<button class="gbtn ${done ? 'done' : ''}" data-g="${g.fast ? 'say' : 'card'}" data-v="${key}" ${extra}>${gmJp(line, false)}${done ? '<span class="gok">✓</span>' : ''}</button>`;
    b += `<p class="sec-title">你可以說</p><div class="gbtns">
      ${btn('greet', shop.greet, c.greeted)}
      ${shop.topics.map(t => btn(t.id, t.ask, c.done[t.id])).join('')}
      ${btn('close', 'g_arigatou', false, 'style="grid-column:1/-1"')}</div>
      <p class="small muted">${g.fast ? '熟練模式：點了就直接說。點客人的話仍可看意思。' : '點按鈕先看意思，再按「說這句」。'}</p>`;
  }
  return head + `<div class="ov-body" id="gmBody"><div class="in">${b}</div></div><div class="ov-foot"><div class="in">${f || `<button class="btn block" data-g="peekHelp">這一位該問什麼？（提示）</button>`}</div></div>`;
}
function gmPopHtml() {
  const p = G.pop; if (!p) return '';
  const shop = GSHOP[G.shop], line = p.key ? (p.key === 'greet' ? shop.greet : p.key === 'close' ? 'g_arigatou' : gmTopic(shop, p.key).ask) : [p.id];
  const ids = gmLine(line), zh = ids.map(id => CK[id].zh).join('；'), note = ids.map(id => CK[id].note).filter(Boolean).join(' ');
  return `<div class="scrim" data-g="popClose" style="z-index:45"></div><div class="sheet gpop" style="z-index:46"><div class="in"><div class="grab"></div>
    <div class="row"><div style="flex:1;min-width:0">${lineHtml(ids, {big:true})}</div>${spkBtn(lineText(ids), 'ja-JP')}</div>
    <p class="small muted">${esc(ids.map(id => CK[id].ro).join(' '))}</p>
    <p style="font-size:20px;font-weight:800">${esc(zh)}</p>${note ? `<p class="rule j">${esc(note)}</p>` : ''}
    ${p.key ? `<button class="btn primary block" data-g="say" data-v="${p.key}">說這句</button>` : ''}<button class="btn block" data-g="popClose">${p.key ? '先不要' : '知道了'}</button></div></div>`;
}
function gmEndHtml() {
  const d = G.day, shop = GSHOP[G.shop], g = gmSt(), t = TASK[shop.task];
  const lv = (lvList(shop.task).find(l => !lvPassed(shop.task, l))) || 1;
  const used = Object.keys(d.used).filter(id => CK[id] && !['filler'].includes(CK[id].cat)).sort((a, b) => d.used[b] - d.used[a]).slice(0, 14);
  const wrong = Object.values(d.wrong);
  const next = GSHOP_ORDER.find(id => !gmUnlocked(id));
  return `<div class="ov-head"><button class="icon-btn" data-g="close" aria-label="關閉">${IC.x}</button><div style="flex:1"></div></div>
    <div class="ov-body"><div class="in">
      <div class="done-hero"><h2 style="font-size:26px">打烊了</h2><p style="font-size:22px;font-weight:800"><span class="tnum">${d.yen}</span> 円　★ <span class="tnum">${d.star}</span> / ${G_PER_DAY * 3}</p>
        <div class="gfaces">${d.list.map(x => gmFace(x.look, x.angry ? 'angry' : x.star === 3 ? 'laugh' : 'smile', 'mini')).join('')}</div>
        <p class="small muted">累積 ★ ${g.star}${next ? `・再 ${GSHOP[next].need - g.star}★ 開「${esc(GSHOP[next].zh)}」` : ''}</p></div>
      ${wrong.length ? `<section class="stack" style="gap:8px"><p class="sec-title" style="margin:0">今天聽錯的（已排進句塊複習）</p><div class="list">${wrong.map(l => `<button class="li" data-g="peek" data-v="${gmLine(l)[0]}"><div class="grow"><div class="jpf" style="font-weight:700">${gmJp(l, false)}</div><div class="zh">${esc(gmLine(l).map(id => CK[id].zh).join('；'))}</div></div></button>`).join('')}</div></section>` : ''}
      <section class="stack" style="gap:8px"><p class="sec-title" style="margin:0">今天店裡出現的日文（點了看意思）</p><div class="chips">${used.map(id => `<button class="chip jpf" data-g="peek" data-v="${id}"><span>${rubyHtml(CK[id].jp)}</span></button>`).join('')}</div></section>
      <section class="card hero-jp stack" style="gap:8px"><p class="small muted">這些句子，對話裡都有</p><p style="font-size:18px;font-weight:800">${esc(t.name)}・第 ${lv} 級</p>
        <p class="small muted">剛玩過，對話裡的提示會變少。換你當客人，聽店員說。</p>
        <button class="btn onhero block" data-g="goDlg" data-v="${shop.task}:${lv}">去練這段對話</button></section>
    </div></div>
    <div class="ov-foot"><div class="in"><button class="btn primary block" data-g="again">再開一天</button><button class="btn block" data-g="toShops">換一家店</button></div></div>`;
}

/* ---------- 事件 ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-g]'); if (!t || !$('#gm') || $('#gm').hidden) return;
  e.stopPropagation();
  const a = t.dataset.g, v = t.dataset.v, c = G.cust;
  switch (a) {
    case 'close': gmClose(); break;
    case 'shop': gmStartDay(v); break;
    case 'locked': toast('多賺一些 ★ 就會解鎖'); break;
    case 'fast': { const g = gmSt(); g.fast = !g.fast; persist(); gmRender(); } break;
    case 'listen': { const g = gmSt(); g.listen = !g.listen; persist(); gmRender(); } break;
    case 'card': if (c) c.usedCard = true; G.pop = {key:v}; gmRender(); speak(lineText(gmLine(v === 'greet' ? GSHOP[G.shop].greet : v === 'close' ? 'g_arigatou' : gmTopic(GSHOP[G.shop], v).ask)), 'ja-JP', .9); break;
    case 'say': gmSay(v); break;
    case 'peek': G.pop = {id:v}; gmRender(); speak(plainJp(CK[v].jp), 'ja-JP', .9); break;
    case 'popClose': G.pop = null; gmRender(); break;
    case 'peekLine': if (c) { c.peek[+v] = true; gmRender(); } break;
    case 'replay': if (c) { const last = [...c.said].reverse().find(x => x.who === 'c'); if (last) gmSpeak([[last.c, .95]]); } break;
    case 'slow': if (c) { const last = [...c.said].reverse().find(x => x.who === 'c'); if (last) gmSpeak([[last.c, .7]]); } break;
    case 'judge': gmJudge(v); break;
    case 'nextCust': gmAfterCust(); break;
    case 'peekHelp': if (c && !c.left) { const shop = GSHOP[G.shop], miss = gmRequired(shop, c).filter(x => !c.done[x.id]);
      const tt = miss.find(x => !(x.after || []).some(y => c.need[y] !== undefined && !c.done[y]));
      toast(tt ? '試試問：「' + plainJp(lineText(tt.ask)) + '」' : '都問完了，可以說「ありがとうございました」'); } break;
    case 'again': gmStartDay(G.shop); break;
    case 'toShops': G.view = 'shops'; gmRender(); break;
    case 'goDlg': { const [tid, lv] = v.split(':'); G.gen++; const el = $('#gm'); if (el) el.hidden = true; document.body.style.overflow = ''; startRun(tid, +lv); } break;
  }
}, true);
function gmCardHtml() {
  const g = gmSt(), open = GSHOP_ORDER.filter(gmUnlocked).length;
  return `<section class="card stack ggame" style="gap:8px"><div class="row"><div style="flex:1"><p class="small muted">邊玩邊學</p><p style="font-size:19px;font-weight:800">小店遊戲：你是店長</p>
    <p class="small muted">${g.star ? `累積 ★ ${g.star}・開了 ${open} 家店` : '客人用日文跟你說話，一天 5 位，約 3 分鐘'}</p></div>${gmFace({head:'round', hair:'short', blush:true}, 'smile', 'mid')}</div>
    <button class="btn jp-b block" data-a="gmOpen">開店</button></section>`;
}
