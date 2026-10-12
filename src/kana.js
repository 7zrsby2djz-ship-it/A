/* ================= 五十音（假名 → 聲音 → 熟悉的單字 → 意思） =================
   資料：kana-rebuild/generated/kana-data.js（globalThis.KANA_REBUILD_DATA），建置時內嵌，不連網。
   進度：S.kana（隨主存檔 persist()，與其他課程分開；不讀 S.settings.read 當拼音預設）。
   題型：hear 聽音選字（只有播放成功、沒看提示才算聽音證據）／wordLink 讀音找目標字／pair 平片配對／view 看字自評。
   特殊字：ん 用字中字尾、を 用句子、ム 用ハム 字中、ヲ 只配對認識；不切整詞第一拍當單音。
   ======================================================================== */
const KD = globalThis.KANA_REBUILD_DATA || {kana:[], words:[], anchors:[], confusables:[]};
const KN = Object.fromEntries(KD.kana.map(k => [k.id, k]));
const KW = Object.fromEntries(KD.words.map(w => [w.id, w]));
const KA = Object.fromEntries(KD.anchors.map(a => [a.key, a]));
const KN_ORDER = KD.kana.slice().sort((a, b) => a.row - b.row || a.column - b.column).map(k => k.id);
const KN_SCRIPT = {hira:'平假名', kata:'片假名'};
const KN_TYPES = ['view', 'hear', 'pair', 'wordLink'];
const KN_TYPE_LABEL = {view:'看字', hear:'聽音', pair:'平片配對', wordLink:'單字找字'};
const K_ROUND = 5;
const KG = {view:'home', key:null, peek:false, tok:0, play:{}, flash:null};

/* ---------- 狀態（巢狀補全，不動其他課程） ---------- */
function knRec() { return {attempts:0, correct:0, assisted:0, due:0, days:[]}; }
function knSt() {
  if (!S.kana || typeof S.kana !== 'object') S.kana = {};
  const k = S.kana;
  if (!k.v) k.v = 1;
  if (!k.prefs || typeof k.prefs !== 'object') k.prefs = {};
  if (!['hira', 'kata', 'mixed'].includes(k.prefs.script)) k.prefs.script = 'mixed';
  if (typeof k.prefs.romaji !== 'boolean') k.prefs.romaji = false;
  if (!k.cards || typeof k.cards !== 'object') k.cards = {};
  if (!k.wordFamiliarity || typeof k.wordFamiliarity !== 'object') k.wordFamiliarity = {};
  if (k.active === undefined) k.active = null;
  return k;
}
function knCard(key, create) {
  const st = knSt(); let c = st.cards[key];
  if (!c && !create) return null;
  if (!c) c = st.cards[key] = {};
  KN_TYPES.forEach(t => { if (!c[t] || typeof c[t] !== 'object') c[t] = knRec(); const r = c[t];
    ['attempts', 'correct', 'assisted', 'due'].forEach(f => { if (typeof r[f] !== 'number') r[f] = 0; }); if (!Array.isArray(r.days)) r.days = []; });
  if (typeof c.view.selfRated !== 'number') c.view.selfRated = 0;
  ['lastSeen', 'lastWrong', 'lastOk', 'due'].forEach(f => { if (typeof c[f] !== 'number') c[f] = 0; });
  if (typeof c.seen !== 'boolean') c.seen = false;
  return c;
}
const knGlyph = key => { const [s, id] = key.split(':'); return s === 'hira' ? KN[id].hiragana : KN[id].katakana; };
const knKeyOf = (s, id) => s + ':' + id;
const knTrainable = key => KA[key] && KA[key].status === 'trainable';
function knKeys(mode) {
  const out = [];
  KN_ORDER.forEach(id => ['hira', 'kata'].forEach(s => { const k = knKeyOf(s, id); if ((mode === 'mixed' || mode === s) && knTrainable(k)) out.push(k); }));
  return out;
}
function knStatus(key) {
  const c = knCard(key);
  if (!c) return 'new';
  const att = KN_TYPES.reduce((a, t) => a + c[t].attempts, 0);
  if (!att) return c.seen ? 'seen' : 'new';
  if (c.lastWrong && c.lastWrong > c.lastOk) return 'review';
  const days = new Set(KN_TYPES.flatMap(t => c[t].days));
  if (days.size >= 2) return 'solid';
  if (KN_TYPES.some(t => c[t].correct > 0)) return c.due && c.due <= Date.now() ? 'due' : 'ok';
  return 'review';
}
const KN_ST = {new:['', '未練'], seen:['·', '看過'], review:['⟳', '需複習'], due:['⟳', '該複習'], ok:['✓', '已練'], solid:['✓✓', '熟']};

/* ---------- 發音（分清成功與失敗，過期的回呼一律忽略） ---------- */
function knJaVoice() { return pickJaVoice(); }
function knSay(text, rate, cb) {
  knStop();
  const tok = ++KG.tok;
  const fin = (ok, why) => { if (tok !== KG.tok || fin.done) return; fin.done = true; cb && cb(ok, why); };
  if (!canSpeak || !text) { fin(false, 'nosupport'); return tok; }
  if (VOICES.length && !knJaVoice()) { fin(false, 'novoice'); return tok; }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = rate; const v = knJaVoice(); if (v) try { u.voice = v; } catch (e) {}
    u.onend = () => fin(true); u.onerror = e => fin(false, (e && e.error) || 'error'); u.onstart = () => fx.duck();
    speechSynthesis.speak(u);
    setTimeout(() => fin(false, 'timeout'), 6000 + Array.from(text).length * 500);
  } catch (e) { fin(false, 'error'); }
  return tok;
}
function knStop() {
  KG.tok++;
  clearTimeout(KG.audioTimer); KG.audioTimer = null;
  if (KG.audio) { const a = KG.audio; KG.audio = null; a.onended = a.onerror = null; try { a.pause(); a.currentTime = 0; } catch (e) {} }
  try { speechSynthesis.cancel(); } catch (e) {}
}
// 基本假名改用 iPhone 內建日文語音（不再內嵌真人錄音）。play 在點擊當下直接呼叫。
function knSayKana(id, slow, cb) {
  const k = KN[id];
  return knSay(k && k.speechText, slow ? .55 : .8, cb);
}
const KN_FAIL = {nosupport:'這台裝置不能播放聲音。', novoice:'找不到日文語音，可以到手機設定加入日文語音。', timeout:'這次沒有播出聲音。', error:'這次沒有播出聲音。', canceled:'播放被中斷了。', interrupted:'播放被中斷了。'};

/* ---------- 代表詞 ---------- */
function knRefs(key) {
  const a = KA[key]; if (!a) return [];
  const fam = knSt().wordFamiliarity;
  return a.wordRefs.slice().sort((x, y) => (fam[x.wordId] === 'unfamiliar') - (fam[y.wordId] === 'unfamiliar'));
}
function knReadingHtml(ref, mask) {
  const ch = Array.from(ref.displayedReading.normalize('NFKC'));
  return ch.map((c, i) => i >= ref.targetSpan.start && i < ref.targetSpan.end
    ? (mask ? '<span class="kmask" aria-label="空格">□</span>' : `<b class="khl" title="目標假名">${esc(c)}</b>`) : esc(c)).join('');
}
const KN_EVID = {present_in_existing_app:'App 裡有', seen_in_duolingo_screenshot:'多鄰國見過', new_supplement:'旅行補充'};
const KN_MATCH = {head:'', head_extension:'第一個字是它；但第一拍有小字（例：りょ），先認字形就好', contains_n:'ん 在字中或字尾，要整個詞一起聽',
  particle_context:'を 是助詞，念 o；用整句學', contains_rare_katakana:'ム 在字的中間，找出它'};
function knRomajiOf(key) { return KN[key.split(':')[1]].romaji; }

/* ---------- 選項：同一套字、不同聲音；優先易混字與本輪的字 ---------- */
function knDistractors(key, n, pool) {
  const [s, id] = key.split(':'), grp = KN[id].audioAnswerGroup, out = [];
  const ok = k => { const [s2, id2] = k.split(':'); return s2 === s && id2 !== id && KN[id2].audioAnswerGroup !== grp && knTrainable(k) && !out.includes(k); };
  const conf = KD.confusables.filter(c => c.script === s && c.keys.includes(id)).flatMap(c => c.keys).map(i => knKeyOf(s, i));
  const tried = Object.keys(knSt().cards);
  [shuffle(conf), shuffle(pool || []), shuffle(tried), shuffle(knKeys(s))].forEach(list => list.forEach(k => { if (out.length < n && ok(k)) out.push(k); }));
  return out;
}

/* ---------- 一輪：最多 5 個目標、每個 2 題 ---------- */
function knPickTargets(mode) {
  const now = Date.now(), keys = knKeys(mode);
  const due = keys.filter(k => { const st = knStatus(k); return st === 'review' || st === 'due'; })
    .sort((a, b) => (knCard(b).lastWrong - knCard(a).lastWrong) || (knCard(a).due - knCard(b).due));
  const fresh = keys.filter(k => ['new', 'seen'].includes(knStatus(k)));
  const t = due.slice(0, K_ROUND);
  for (const k of fresh) { if (t.length >= K_ROUND || t.filter(x => fresh.includes(x)).length >= 3) break; t.push(k); }
  if (t.length < K_ROUND) keys.filter(k => !t.includes(k) && ['ok', 'solid'].includes(knStatus(k))).sort((a, b) => knCard(a).due - knCard(b).due).forEach(k => { if (t.length < K_ROUND) t.push(k); });
  for (const k of fresh) { if (t.length >= K_ROUND) break; if (!t.includes(k)) t.push(k); }
  return t;
}
function knQuestion(type, key, pool) {
  const [s, id] = key.split(':');
  if (type === 'hear') return {type, key, opts:shuffle([key, ...knDistractors(key, 2, pool)])};
  if (type === 'pair') { const other = s === 'hira' ? 'kata' : 'hira'; return {type, key, from:knKeyOf(other, id), opts:shuffle([key, ...knDistractors(key, 2, pool)])}; }
  if (type === 'wordLink') { const refs = knRefs(key).filter(r => r.eligibleForWordHeadQuestion || r.matchType !== 'head');
    const preferred = refs.filter(r => knSt().wordFamiliarity[r.wordId] !== 'unfamiliar');
    const candidates = preferred.length ? preferred : refs;
    const turn = knCard(key)?.wordLink.attempts || 0;
    const ref = candidates[turn % candidates.length] || knRefs(key)[0];
    return {type, key, word:ref.wordId, opts:shuffle([key, ...knDistractors(key, 2, pool)])}; }
  return {type, key};
}
function knPlanFor(key) {
  const k = KN[key.split(':')[1]], canHear = k.kind === 'basic' && !!k.speechText;
  const mode = knSt().prefs.script;
  // The first mixed round keeps the original pair task; later rounds alternate
  // with word links so the expanded vocabulary also appears during short rounds.
  if (canHear) return ['hear', mode === 'mixed' && (knCard(key)?.hear.attempts || 0) % 2 === 0 ? 'pair' : 'wordLink'];
  return ['wordLink', 'pair'];
}
function knStartRound() {
  const st = knSt(), mode = st.prefs.script, targets = knPickTargets(mode);
  if (!targets.length) { toast('沒有可以練的假名'); return; }
  fx.start('kn');
  const qs = [];
  targets.forEach((key, i) => {
    const intro = ['new', 'seen'].includes(knStatus(key)) ? {type:'learn', key} : {type:'view', key};
    const [q1, q2] = knPlanFor(key).map(t => knQuestion(t, key, targets));
    qs.push({i, step:0, item:intro}, {i, step:1, item:q1}, {i, step:2, item:q2});
  });
  // 交錯：學 A、考 A1、學 B、考 B1、考 A2…
  const order = []; const byT = targets.map((_, i) => qs.filter(q => q.i === i).map(q => q.item));
  byT.forEach((list, i) => { order.push(list[0], list[1]); if (i > 0) order.push(byT[i - 1][2]); });
  order.push(byT[byT.length - 1][2]);
  st.active = {mode, targets, items:order, i:0, ans:{}, requeued:{}, created:Date.now()};
  persist(); KG.view = 'round'; KG.peek = false; KG.play = {}; knRender();
}
function knCur() { const a = knSt().active; return a && a.items[a.i]; }
function knRecord(key, type, ok, assisted) {
  const c = knCard(key, true), r = c[type], now = Date.now();
  r.attempts++;
  if (assisted) r.assisted++;
  if (ok && !assisted) { r.correct++; const d = dayKey(); if (!r.days.includes(d)) { r.days.push(d); if (r.days.length > 6) r.days.shift(); } c.lastOk = now; }
  if (!ok) c.lastWrong = now;
  const days = new Set(KN_TYPES.flatMap(t => c[t].days)).size;
  c.due = !ok ? now : assisted ? now + 12 * HOUR : now + (days >= 2 ? 4 : 1) * DAY;
  r.due = c.due; c.seen = true; c.lastSeen = now;
  touchStreak(); const lg = L(); lg.jp++; if (ok) lg.jpOk++; addXp(ok && !assisted ? 4 : 1);
}
function knAnswer(choice) {
  const a = knSt().active, it = knCur(); if (!a || !it || a.ans[a.i]) return;
  if (it.type === 'hear' && !KG.play.ok && !KG.play.fallback) { toast('先播放題目'); return; }
  const ok = choice === it.key, assisted = KG.peek || knSt().prefs.romaji || (it.type === 'hear' && !!KG.play.fallback);
  a.ans[a.i] = {choice, ok, assisted};
  knRecord(it.key, it.type, ok, assisted);
  // 答錯：同一題型至少隔兩題再出現，一輪最多兩次
  const rk = it.key + '|' + it.type;
  if (!ok && (a.requeued[rk] || 0) < 1) { a.requeued[rk] = (a.requeued[rk] || 0) + 1;
    const retry = knQuestion(it.type, it.key, a.targets);
    if (it.word) retry.word = it.word;
    a.items.splice(Math.min(a.i + 3, a.items.length), 0, retry); }
  persist(); knRender();
  const k = KN[it.key.split(':')[1]];
  fx.answer('#kn', ok, k.speechText && k.kind === 'basic' ? () => knSayKana(k.id, false) : null);
}
function knSelfRate(good) {
  const a = knSt().active, it = knCur(); if (!a || !it || a.ans[a.i]) return;
  const c = knCard(it.key, true); c.view.selfRated++;
  a.ans[a.i] = {self:good};
  knRecord(it.key, 'view', good, true); // 自評：記錄練習，但不算客觀通過
  persist(); knNext();
}
function knNext() {
  const a = knSt().active; if (!a) return;
  const it = knCur(); if (it && it.type === 'learn') { const c = knCard(it.key, true); c.seen = true; c.lastSeen = Date.now(); }
  knStop(); KG.peek = false; KG.play = {}; KG.reveal = false;
  a.i++;
  if (a.i >= a.items.length) { KG.roundDone = true; KG.summary = {targets:a.targets, ans:a.items.map((x, i) => ({it:x, r:a.ans[i]}))}; knSt().active = null; persist(); KG.view = 'done'; }
  else persist();
  knRender(); const b = $('#knBody'); if (b) b.scrollTop = 0;
}

/* ---------- 播放（題目／卡片） ---------- */
function knPlayItem(slow) {
  const it = knCur(); if (!it) return;
  const k = KN[it.key.split(':')[1]];
  const myI = knSt().active.i;
  KG.play = {playing:true};
  knRender();
  knSayKana(k.id, slow, (ok, why) => {
    const a = knSt().active; if (!a || a.i !== myI) return;
    KG.play = ok ? {ok:true, slow:!!slow} : {fail:why || 'error'};
    knRender();
  });
}

/* ---------- 畫面 ---------- */
function knOpen(v) {
  closeSheet(); knSt();
  let el = $('#kn');
  if (!el) { el = document.createElement('div'); el.id = 'kn'; el.className = 'overlay jpmode'; document.body.append(el); }
  el.hidden = false; document.body.style.overflow = 'hidden';
  KG.view = v === 'go' ? 'round' : 'home'; KG.peek = false; KG.play = {};
  KG.fromTable = v !== 'go'; // 從「假名表」進來的才回假名表；從「練五個字」或今天 5 分鐘進來的，離開就回原本頁面
  if (v === 'go') { if (knSt().active) { KG.view = 'round'; knRender(); } else knStartRound(); return; }
  knRender();
}
function knClose() { const t5f = !!KG.roundDone; KG.roundDone = false; knStop(); const el = $('#kn'); if (el) el.hidden = true; document.body.style.overflow = ''; render(); homeTop(); t5After('kana', t5f); }
function knRender() {
  const el = $('#kn'); if (!el || el.hidden) return;
  const v = KG.view;
  el.innerHTML = v === 'card' ? knCardView() : v === 'round' ? knRoundView() : v === 'done' ? knDoneView() : v === 'words' ? knWordsView() : v === 'origin' ? knOriginView() : knHomeView();
  if (v === 'round' && knSt().active) fx.after(el, 'kn', knSt().active.i);
  if (v === 'done' && fx.once(KG.summary)) fx.celebrate(el, {perfect:KG.summary.ans.every(x => !x.r || x.r.ok !== false)});
}
function knHead(title, sub, back) {
  return `<div class="ov-head"><button class="icon-btn" data-k="${back || 'close'}" aria-label="${back ? '返回' : '關閉五十音，回日文頁'}">${back ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>' : IC.x}</button>
    <div style="flex:1;min-width:0"><div style="font-weight:800">${esc(title)}</div>${sub ? `<div class="small muted">${esc(sub)}</div>` : ''}</div></div>`;
}
function knModeSeg() {
  const m = knSt().prefs.script;
  return `<div class="seg" role="group" aria-label="假名模式">${[['hira', '平假名'], ['kata', '片假名'], ['mixed', '混合']].map(([v, l]) => `<button data-k="mode" data-v="${v}" aria-pressed="${m === v}">${l}</button>`).join('')}</div>`;
}
function knCount(s) { const keys = knKeys(s); return {done:keys.filter(k => ['ok', 'solid', 'due'].includes(knStatus(k))).length, total:keys.length, rev:keys.filter(k => knStatus(k) === 'review').length}; }
function knHomeView() {
  const st = knSt(), m = st.prefs.script, a = st.active, h = knCount('hira'), k = knCount('kata');
  const rows = [];
  for (let r = 0; r <= 10; r++) {
    const cells = [];
    for (let c = 0; c < 5; c++) {
      const kn = KD.kana.find(x => x.row === r && x.column === c);
      if (!kn) { cells.push('<span class="kcell empty" aria-hidden="true"></span>'); continue; }
      const hk = knKeyOf('hira', kn.id), kk = knKeyOf('kata', kn.id);
      const one = (key, small) => { const s = knStatus(key), [sym, lab] = KN_ST[s]; return `<span class="kg ${small ? 'sm' : ''}">${esc(knGlyph(key))}</span>${sym ? `<span class="kst st-${s}" aria-label="${lab}">${sym}</span>` : ''}`; };
      const main = m === 'kata' ? kk : hk;
      const inner = m === 'mixed' ? `<span class="kpair">${one(hk)}</span><span class="kpair">${knTrainable(kk) ? one(kk, true) : `<span class="kg sm ref">${esc(kn.katakana)}</span>`}</span>` : (knTrainable(main) || main === 'kata:wo' ? one(main) : '');
      cells.push(`<button class="kcell" data-k="open" data-v="${main}" aria-label="${esc(kn.hiragana + ' ' + kn.katakana)}">${inner}</button>`);
    }
    rows.push(cells.join(''));
  }
  return knHead('五十音', '假名 → 聲音 → 熟悉的單字 → 意思') + `<div class="ov-body" id="knBody"><div class="in">
    ${knModeSeg()}
    <section class="card stack" style="gap:10px">
      ${a ? `<p class="small muted">上一輪還沒做完：${knChars(a).length} 個字，做到第 ${knCharPos(a)} 個字</p><button class="btn jp-b block" data-k="resume">繼續這一輪</button><button class="btn ghost sm" data-k="drop">放棄，重新選五個字</button>`
        : `<button class="btn jp-b block" data-k="start">練五個字（約 3 分鐘）</button>`}
      <div class="kprog small"><span>平假名 已練 <b class="tnum">${h.done}</b>/${h.total}${h.rev ? `・需複習 ${h.rev}` : ''}</span><span>片假名 已練 <b class="tnum">${k.done}</b>/${k.total}${k.rev ? `・需複習 ${k.rev}` : ''}</span></div>
    </section>
    <div class="ktable" role="grid" aria-label="假名表">${rows.join('')}</div>
    <p class="small muted">點任何一格看代表詞和發音。符號：✓ 已練（沒看提示答對過）、✓✓ 熟（兩天以上答對）、⟳ 需複習、· 看過。</p>
    <button class="set-row gset" data-k="romaji"><div class="grow"><b>一直顯示羅馬拼音</b><p class="small muted">預設關。卡片和題目可以按「看拼音」暫時看一下（那一題會記成有看提示）。</p></div><span class="switch" role="switch" aria-checked="${st.prefs.romaji}"></span></button>
    <button class="btn jp-b block" data-k="origin">平假名 ↔ 片假名：從哪個漢字來</button>
    <button class="btn block" data-k="words">全部代表詞（${KD.words.length} 個）</button>
    <details class="card flat"><summary style="cursor:pointer;font-weight:700">說明與來源</summary><div class="stack small" style="gap:6px;margin-top:8px">
      <p>代表詞先用 App 裡已有的詞，其次是多鄰國截圖確認看過的詞，再補旅行日常詞。來源標籤只代表「接觸過」，不代表已經會。</p>
      <p>這一版練基本 46 組。濁音（が、で…）、拗音（きゃ…）、促音、長音會在代表詞裡自然出現，獨立練習留到下一版。</p>
      <p>每格先看兩個詞，其餘可展開；單字找字練習會輪流使用不同代表詞。ヌ 等少見字首不硬湊陌生詞。</p>
      <p>假名和單字都用手機內建的日文語音。ん／を 保留整詞或句子示範。</p>
      <p>單字難度：<a href="https://github.com/evanclan/OpenJLPT" target="_blank" rel="noopener">OpenJLPT</a>（<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>）；繁中詞義為本 App 編輯。</p></div></details>
  </div></div>`;
}
function knCardHtml(key, opt = {}) {
  const st = knSt(), [s, id] = key.split(':'), k = KN[id], a = KA[key];
  const other = knKeyOf(s === 'hira' ? 'kata' : 'hira', id), showRo = st.prefs.romaji || opt.peek;
  let h = `<section class="card stack kcard" style="gap:12px"><div class="row" style="align-items:center;gap:14px">
    <div class="kbig" lang="ja">${esc(knGlyph(key))}</div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
      <p class="small muted">${KN_SCRIPT[s]}${showRo ? `・<b>${esc(k.romaji)}</b>` : ''}</p>
      ${k.speechText && k.kind === 'basic' ? `<button class="btn sm jp-b" data-k="sayKana" data-v="${key}">${IC.speak}發音</button>` : `<p class="small muted">${k.id === 'n' ? 'ん 要在詞裡聽' : 'を 念 o，用句子聽'}</p>`}
      ${st.prefs.script === 'mixed' || opt.showOther ? (opt.inRound ? `<p class="small">${KN_SCRIPT[other.split(':')[0]]}：<span lang="ja" class="jpf" style="font-size:20px">${esc(knGlyph(other))}</span></p>` : `<button class="btn ghost sm" data-k="open" data-v="${other}">${KN_SCRIPT[other.split(':')[0]]}：<span lang="ja" class="jpf" style="font-size:20px">${esc(knGlyph(other))}</span></button>`) : ''}
      ${!showRo && !opt.noPeek ? `<button class="btn ghost sm" data-k="peek">看拼音</button>` : ''}
    </div></div>`;
  if (KN_ORIGIN[id]) h += `<details class="kod" ${opt.noPeek ? '' : 'open'}><summary>字源：從哪個漢字來、取哪一塊</summary>${knOriginHtml(id, {more:!opt.inRound})}</details>`;
  if (a && a.status === 'reference_only') {
    h += `<p>ヲ 先認得就好：它和「を」同音（o），一般單字幾乎不用。</p><button class="btn block" data-k="open" data-v="${a.linkedSpecial}">看 を 的例子</button>`;
  } else {
    const refs = knRefs(key);
    const wordHtml = r => { const w = KW[r.wordId], fam = st.wordFamiliarity[w.id] === 'unfamiliar';
      return `<div class="kword"><div class="row" style="align-items:flex-start"><div style="flex:1;min-width:0">
        ${w.word === r.displayedReading ? `<p class="kw kr jpf" lang="ja">${knReadingHtml(r)}</p>` : `<p class="kw jpf" lang="ja">${esc(w.word)}</p><p class="kr jpf" lang="ja">${knReadingHtml(r)}</p>`}${showRo ? `<p class="small muted">${esc(w.romaji)}</p>` : ''}
        <p class="kz">${esc(w.meaningZh)}</p>
        <p class="small muted">${esc(KN_EVID[w.familiarityEvidence] || '')}${w.jlptApprox ? '・約 ' + esc(w.jlptApprox) : ''}${fam ? '・你標了不熟' : ''}</p>
        ${KN_MATCH[r.matchType] ? `<p class="small kmatch">${esc(r.note || KN_MATCH[r.matchType])}</p>` : ''}${w.note ? `<p class="small muted">${esc(w.note)}</p>` : ''}</div>
        <button class="icon-btn speak" data-k="sayWord" data-v="${w.id}" aria-label="聽單字">${IC.speak}</button></div>
        <button class="btn ghost sm" data-k="unfam" data-v="${w.id}">${fam ? '取消「不熟」' : '這個詞我不熟（換到後面）'}</button></div>`; };
    h += refs.slice(0, 2).map(wordHtml).join('');
    if (refs.length > 2) h += `<details class="kextras"><summary class="small" style="cursor:pointer;font-weight:700;padding:10px 0">再看 ${refs.length - 2} 個代表詞</summary><div class="stack" style="gap:12px;margin-top:8px">${refs.slice(2).map(wordHtml).join('')}</div></details>`;
    if (k.note) h += `<details><summary class="small" style="cursor:pointer">說明</summary><p class="small" style="margin-top:6px">${esc(k.note)}</p></details>`;
  }
  return h + '</section>';
}
function knCardView() {
  const key = KG.key, kn = KN[key.split(':')[1]];
  const ids = KN_ORDER, i = ids.indexOf(kn.id), s = key.split(':')[0];
  const nav = d => { for (let j = i + d; j >= 0 && j < ids.length; j += d) { const k = knKeyOf(s, ids[j]); if (knTrainable(k)) return k; } return null; };
  const p = nav(-1), n = nav(1);
  return knHead(`${kn.hiragana}・${kn.katakana}`, '代表詞與發音', 'home') + `<div class="ov-body" id="knBody"><div class="in">${knCardHtml(key, {peek:KG.peek})}</div></div>
    <div class="ov-foot"><div class="in"><div class="row"><button class="btn" style="flex:1" data-k="open" data-v="${p || ''}" ${p ? '' : 'disabled'}>上一個</button><button class="btn" style="flex:1" data-k="open" data-v="${n || ''}" ${n ? '' : 'disabled'}>下一個</button></div></div></div>`;
}
function knOptsHtml(it, r) {
  return `<div class="kopts">${it.opts.map(o => { const cls = r ? (o === it.key ? 'correct' : o === r.choice ? 'wrong' : '') : '';
    const dis = r || (it.type === 'hear' && !KG.play.ok && !KG.play.fallback);
    return `<button class="opt kopt ${cls}" data-k="ans" data-v="${o}" ${dis ? 'disabled' : ''} lang="ja">${esc(knGlyph(o))}${knSt().prefs.romaji || r ? `<span class="sub">${esc(knRomajiOf(o))}</span>` : ''}</button>`; }).join('')}</div>`;
}
// 一輪是「5 個字」，每個字約 3 小步；文字只顯示「字 x/5」，細的進度交給進度條（QA#4：不再出現第三種「步」）
function knChars(a) { const out = []; (a.items || []).forEach(x => { if (!out.includes(x.key)) out.push(x.key); }); return out; }
function knCharPos(a) { const seen = []; for (let j = 0; j <= a.i && j < a.items.length; j++) if (!seen.includes(a.items[j].key)) seen.push(a.items[j].key); return Math.max(1, seen.indexOf(a.items[Math.min(a.i, a.items.length - 1)].key) + 1); }
function knRoundView() {
  const st = knSt(), a = st.active; if (!a) { KG.view = 'home'; return knHomeView(); }
  const it = a.items[a.i], r = a.ans[a.i], [s, id] = it.key.split(':'), k = KN[id];
  const head = `<div class="ov-head"><button class="icon-btn" data-k="leave" aria-label="先離開，之後接續">${IC.x}</button><div class="prog" aria-hidden="true"><i style="width:${a.i / a.items.length * 100}%"></i></div><span class="small muted tnum" data-kprog>字 ${knCharPos(a)}/${knChars(a).length}</span></div>`;
  let b = '', f = '';
  if (it.type === 'learn') {
    b = `<p class="small muted">新的字：先看、先聽，不用急著記。</p>${knCardHtml(it.key, {peek:KG.peek, inRound:true})}`;
    f = `<button class="btn primary block" data-k="next">看懂了，下一步</button>`;
  } else if (it.type === 'view') {
    b = `<p class="small muted">看字・想一下怎麼念，再揭曉</p><section class="card stack" style="align-items:center;gap:12px;padding:24px"><div class="kbig" lang="ja">${esc(knGlyph(it.key))}</div>
      ${KG.reveal ? `<p style="font-size:20px;font-weight:800">${esc(k.romaji)}</p>` : ''}</section>${KG.reveal ? knCardHtml(it.key, {noPeek:true, peek:true, inRound:true}) : ''}`;
    f = KG.reveal ? `<p class="small muted" style="text-align:center">你剛剛想得出來嗎？（自評，不算考試）</p><div class="row"><button class="btn" style="flex:1" data-k="self" data-v="0">需要提示</button><button class="btn primary" style="flex:1" data-k="self" data-v="1">會</button></div>`
      : `<button class="btn primary block" data-k="reveal">揭曉</button>`;
  } else {
    const sLabel = KN_SCRIPT[s];
    if (it.type === 'hear') {
      const p = KG.play;
      b = `<p class="q">聽聲音，選出${sLabel}</p>
        <div class="row" style="gap:8px"><button class="btn jp-b" style="flex:1" data-k="play" ${p.playing ? 'disabled' : ''}>${IC.speak}${p.playing ? '播放中…' : p.ok ? '再聽一次' : '播放題目'}</button><button class="btn" data-k="playSlow" ${p.playing ? 'disabled' : ''}>慢一點</button></div>
        ${p.fail && !r ? `<div class="qfb no">${esc(KN_FAIL[p.fail] || KN_FAIL.error)}可以再試一次，或改成看字練習（這題不算聽音）。<div class="row" style="margin-top:8px"><button class="btn sm" data-k="play">再試一次</button><button class="btn sm" data-k="noaudio">改看字</button></div></div>` : ''}
        ${!p.ok && !p.fallback && !p.fail && !r ? '<p class="small muted">先播放題目，再選答案。</p>' : ''}
        ${p.fallback && !r ? `<div class="qfb no">改看字：這題的聲音是「<b lang="ja" class="jpf">${esc(knGlyph(knKeyOf(s === 'hira' ? 'kata' : 'hira', id)))}</b>」的同音字（另一套）。記成看字練習，不算聽音。</div>` : ''}
        ${knOptsHtml(it, r)}
        ${!r && !p.fail ? '<button class="btn ghost sm" style="align-self:center" data-k="noaudio">沒有聲音／聽不到</button>' : ''}`;
    } else if (it.type === 'pair') {
      b = `<p class="q">選出和這個字同音的${sLabel}</p><section class="card" style="text-align:center;padding:20px"><div class="kbig" lang="ja" style="margin:auto">${esc(knGlyph(it.from))}</div>
        ${KG.peek || st.prefs.romaji ? `<p style="font-weight:800">${esc(knRomajiOf(it.from))}</p>` : ''}</section>${knOptsHtml(it, r)}
        ${!r && !KG.peek && !st.prefs.romaji ? '<button class="btn ghost sm" style="align-self:center" data-k="peek">看拼音（記成有提示）</button>' : ''}`;
    } else {
      const w = KW[it.word], ref = KA[it.key].wordRefs.find(x => x.wordId === it.word);
      const ask = {head:'讀音的第一個假名是哪一個？', head_extension:'讀音的第一個字是哪一個？（第一拍有小字）', contains_n:'□ 是哪一個字？（在字中或字尾）', particle_context:'句子裡的 □ 是哪一個字？', contains_rare_katakana:'□ 是哪一個字？（在字中間）'}[ref.matchType];
      b = `<p class="q">${esc(ask)}</p><section class="card stack" style="gap:6px">
        ${w.word !== ref.displayedReading ? `<p class="kw jpf" lang="ja">${esc(w.word)}</p>` : ''}<p class="kr jpf" lang="ja" style="font-size:28px">${knReadingHtml(ref, !r)}</p><p class="kz">${esc(w.meaningZh)}</p>
        ${KG.peek || st.prefs.romaji ? `<p class="small">${esc(w.romaji)}</p>` : ''}
        <div class="row" style="gap:8px"><button class="btn sm" data-k="sayWord" data-v="${w.id}">${IC.speak}聽單字</button>${!r && !KG.peek && !st.prefs.romaji ? '<button class="btn ghost sm" data-k="peek">看拼音（記成有提示）</button>' : ''}</div></section>
        ${knOptsHtml(it, r)}`;
    }
    if (r) {
      const refs = knRefs(it.key), ref = (it.word && refs.find(x => x.wordId === it.word)) || refs[0], w = ref && KW[ref.wordId];
      b += `<div class="fb ${r.ok ? 'ok' : 'no'}"><h3>${r.ok ? (r.assisted ? '對了（有看提示）' : '對了') : '答案是這個'}</h3>
        <div class="row" style="align-items:center;gap:12px"><span class="kmid jpf" lang="ja">${esc(knGlyph(it.key))}</span><div style="flex:1;min-width:0">
        <p><b>${esc(k.romaji)}</b>${w ? `　<span lang="ja" class="jpf">${w.word === ref.displayedReading ? knReadingHtml(ref) : esc(w.word) + '（' + knReadingHtml(ref) + '）'}</span> ${esc(w.meaningZh)}` : ''}</p>
        ${r.ok ? '' : '<p class="small">等一下會再出現一次，不用急。</p>'}</div>
        ${k.speechText && k.kind === 'basic' ? `<button class="icon-btn speak" data-k="sayKana" data-v="${it.key}" aria-label="聽假名">${IC.speak}</button>` : ''}</div>
        ${KN_ORIGIN[id] ? `<details class="kowhy"${it.type === 'pair' && !r.ok ? ' open' : ''}><summary>為什麼長這樣？<span class="kol">${knOriginLine(id)}</span></summary>${knOriginHtml(id)}</details>` : ''}</div>`;
      f = `<button class="btn primary block" data-k="next">${a.i + 1 >= a.items.length ? '完成這一輪' : '下一題'}</button>`;
    } else f = `<p class="small muted" style="text-align:center">選一個答案</p>`;
  }
  return head + `<div class="ov-body" id="knBody"><div class="in">${b}</div></div><div class="ov-foot"><div class="in">${f}</div></div>`;
}
function knDoneView() {
  const s = KG.summary || {targets:[], ans:[]};
  const rows = s.targets.map(key => { const rs = s.ans.filter(x => x.it.key === key && x.r && x.r.ok !== undefined);
    const ok = rs.filter(x => x.r.ok && !x.r.assisted).length, bad = rs.filter(x => !x.r.ok).length;
    return `<button class="li" data-k="open" data-v="${key}"><span class="kmid jpf" lang="ja">${esc(knGlyph(key))}</span><div class="grow"><div style="font-weight:700">${KN_TYPES.filter(t => rs.some(x => x.it.type === t)).map(t => KN_TYPE_LABEL[t]).join('・')}</div>
      <div class="zh">${bad ? `錯 ${bad} 次・會再出現` : ok ? '都答對了' : '有看提示'}</div></div><span class="kst st-${knStatus(key)}">${KN_ST[knStatus(key)][0]}</span></button>`; }).join('');
  return knHead('這一輪完成', '') + `<div class="ov-body" id="knBody"><div class="in">
    <div class="done-hero"><h2 style="font-size:24px">完成 ${s.targets.length} 個字</h2><p class="muted">看提示也算學習；答錯的字之後會優先出現。</p></div>
    <div class="list">${rows}</div></div></div>
    <div class="ov-foot"><div class="in"><button class="btn primary block" data-k="start">再練五個字</button><button class="btn block" data-k="home">回假名表</button></div></div>`;
}
function knWordsView() {
  const groups = {}, voiced = [];
  KD.words.forEach(w => { const fk = w.firstKana; if (!fk) return; const base = KD.kana.find(k => k.hiragana === fk);
    if (base) (groups[base.id] = groups[base.id] || []).push(w); else voiced.push(w); });
  const line = w => `<div class="li"><div class="grow"><div class="jpf" style="font-weight:700;font-size:17px" lang="ja">${esc(w.word)}　<span class="muted" style="font-weight:400">${esc(w.reading)}</span></div><div class="zh" style="white-space:normal">${esc(w.meaningZh)}・${esc(KN_EVID[w.familiarityEvidence] || '')}</div></div><button class="icon-btn speak" data-k="sayWord" data-v="${w.id}" aria-label="聽單字">${IC.speak}</button></div>`;
  return knHead('全部代表詞', '依讀音的第一個假名分類', 'home') + `<div class="ov-body" id="knBody"><div class="in">
    <p class="small muted">分類看「讀音」，不看漢字：駅 → えき → え。來源標籤只代表接觸過。</p>
    ${KN_ORDER.filter(id => groups[id]).map(id => `<p lang="ja" class="sec-title jpf">${esc(KN[id].hiragana)}・${esc(KN[id].katakana)}</p><div class="list">${groups[id].map(line).join('')}</div>`).join('')}
    ${voiced.length ? `<p class="sec-title">濁音・其他（下一版練習）</p><p class="small muted">例如 電池／でんち 是「で」，不是「て」；グレー 是「グ」，不是「ク」。</p><div class="list">${voiced.map(line).join('')}</div>` : ''}
  </div></div>`;
}
function kanaCardHtml() {
  const a = knSt().active, h = knCount('hira'), k = knCount('kata');
  return `<section class="card stack" style="gap:8px"><div class="row"><div style="flex:1"><p class="small muted">字形・聲音・熟悉的單字</p><p style="font-size:19px;font-weight:800">五十音</p>
    <p class="small muted">平假名 ${h.done}/${h.total}・片假名 ${k.done}/${k.total}${a ? '・有一輪沒做完' : ''}</p></div><span lang="ja" class="kbig sm jpf" aria-hidden="true">あ<span>ア</span></span></div>
    <div class="row"><button class="btn jp-b" style="flex:1" data-a="knOpen" data-v="go">${a ? '繼續' : '練五個字'}</button><button class="btn" data-a="knOpen">假名表</button></div></section>`;
}

/* ---------- 字源：平假名 ↔ 片假名 從哪個漢字來、取哪一塊、兩者的因果 ----------
   h＝平假名的字源漢字（整個字寫草書）；k＝片假名的字源漢字；kp＋kt＝把漢字拆開、取第 kt 塊；kw＝取的是哪裡。
   why＝事實上的因果；fun＝邪門記憶（幫助記，不是史實）；tip＝易混字提醒；un＝有爭議的說法。 */
const KN_ORIGIN = {
  a:{h:'安',k:'阿',kp:['阝','可'],kt:0,kw:'左邊的「阝」',why:'兩個字古時都念 a。あ 是「安」整個字快寫；ア 只切「阿」左邊的耳朵旁。',fun:'あ＝安：上面一橫一豎是屋頂 宀，下面那一圈是屋裡的「女」。ア＝阿姨的耳朵 阝。'},
  i:{h:'以',k:'伊',kp:['亻','尹'],kt:0,kw:'左邊的「亻」',why:'い 是「以」快寫，只剩左右兩筆；イ 只取「伊」的單人旁。',fun:'い 和 イ 左邊那一筆都是「一個人站著」。'},
  u:{h:'宇',k:'宇',kp:['宀','于'],kt:0,kw:'上面的「宀」',why:'同一個字「宇」。ウ 只切屋頂 宀；う 是整個字快寫：上面那一點還是屋頂，下面的彎鉤是「于」。',fun:'ウ＝屋頂；う＝屋頂下面掛一個鉤。'},
  e:{h:'衣',k:'江',kp:['氵','工'],kt:1,kw:'右邊的「工」',why:'え 是「衣」快寫，最上面那一點是衣領；エ 是「江」拿掉三點水，剩下的「工」。',fun:'エ＝工：長江的江，水流光了只剩工。'},
  o:{h:'於',k:'於',kp:['方','仒'],kt:0,kw:'左邊的「方」（寫成像 扌）',why:'同一個字「於」。オ 取左邊的 方，筆畫變得像「扌」；お 是整個 於 快寫，右上那一點就是 於 右邊的點。',fun:'お＝オ 的骨架＋右上一點，下面再繞一圈。'},
  ka:{h:'加',k:'加',kp:['力','口'],kt:0,kw:'左邊的「力」',why:'同一個字「加」。カ 就是左邊的「力」；か 是整個 加 快寫：力 還在，右邊的「口」縮成右上一點。',fun:'か＝カ＋一點，那一點就是被壓扁的「口」。'},
  ki:{h:'幾',k:'幾',kw:'草書再簡化，只留兩橫一豎',why:'同一個字「幾」。キ 是 幾 草書剩下的骨架；き 是同一副骨架，下面再接一個彎（幾 下半部快寫）。',fun:'き＝キ＋下面一條尾巴。'},
  ku:{h:'久',k:'久',kw:'前兩筆',why:'同一個字「久」。ク 取 久 的前兩筆；く 是整個 久 一筆寫完，只剩一個尖角。',fun:'く 和 ク 都是「<」，ク 多戴一頂帽子。'},
  ke:{h:'計',k:'介',kw:'整個字簡化（上面 人 的兩撇＋一豎）',why:'け 是「計」快寫：左邊那一豎是 言 字旁，右邊就是「十」；ケ 是「介」：上面兩撇是 人，下面一豎。',fun:'け＝左豎＋十＝計算的計。ケ＝戴斗笠的人（介 的頭是 人）。',tip:'ケ 和 ク 很像：ケ 的橫線穿出去，中間還多一條往下的豎。'},
  ko:{h:'己',k:'己',kw:'上面兩筆（方框）',why:'同一個字「己」。コ 是 己 上半的框；こ 是 己 快寫成上下兩橫。',fun:'コ 是缺一邊的框，こ 是把框拆成兩條。',tip:'コ 和 ユ：ユ 最下面那一橫伸出去，コ 沒有。'},
  sa:{h:'左',k:'散',kp:['龷','月','攵'],kt:0,kw:'左上角（長得像草字頭）',why:'さ 是「左」快寫：上面一橫一撇是 ナ，下面的彎是「工」；サ 是「散」左上那一塊。',fun:'サ 就是草字頭：散步時踩到的草。'},
  shi:{h:'之',k:'之',kw:'草書的筆勢（點點＋挑）',why:'同一個字「之」，兩個都是 之 的草書：し 留下最後那一大筆；シ 留下前面的點和最後的挑。',tip:'シ 和 ツ：シ 的兩點橫著排，最後一筆由下往上挑（像笑臉往上看）；ツ 的點直著排，最後一筆由上往下。'},
  su:{h:'寸',k:'須',kw:'最後幾筆（右下）',un:'ス 一般說來自「須」，也有其他說法。',why:'す 是「寸」快寫：一橫、一豎，豎上打的結就是 寸 的那一點；ス 取自「須」最後的筆畫。',fun:'す＝寸：一把尺上打一個結。',tip:'ス 和 ヌ：ヌ 中間多一點（那是「又」的一筆）。'},
  se:{h:'世',k:'世',kw:'整個字簡化',why:'同一個字「世」。兩個都是 世 簡化；せ 比 セ 多一豎，最下面收成彎。'},
  so:{h:'曽',k:'曽',kp:['丷','曰','日'],kt:0,kw:'最上面兩點「丷」',why:'同一個字「曽」。ソ 只取最上面兩點；そ 是整個 曽 快寫成一條 Z 字線。',tip:'ソ 和 ン：ソ 兩筆都由上往下（兩滴雨直直落）；ン 第二筆由下往上挑。'},
  ta:{h:'太',k:'多',kp:['夕','夕'],kt:0,kw:'上面的「夕」',why:'た 是「太」快寫：左邊 ナ 是 大 的前兩筆，右下的 こ 是 大 的捺加那一點；タ 是「多」上面的一個「夕」。',fun:'多＝兩個夕陽疊起來，タ 只拿走一個。'},
  chi:{h:'知',k:'千',kw:'整個字',why:'ち 是「知」快寫；チ 就是「千」整個字。',fun:'チ＝千：一千塊。',tip:'チ 和 テ：チ 頭上是斜的一撇（千 的頭）；テ 頭上是平的一橫（天 的頭）。'},
  tsu:{h:'川',k:'川',kw:'整個字（三筆變短）',why:'同一個字「川」。ツ 是川的三筆變短；つ 是川一筆快寫，三條線連成一個彎。',tip:'ツ 的點直著排、最後一筆由上往下——就像川的水往下流。シ 則是往上挑。'},
  te:{h:'天',k:'天',kw:'兩橫＋一撇',why:'同一個字「天」。テ 留下 天 的兩橫和一撇；て 是 天 一筆寫完，只剩一橫帶一個大彎。'},
  to:{h:'止',k:'止',kw:'上面那一豎＋一短橫',why:'同一個字「止」。ト 取 止 上面的一豎一短橫；と 是 止 快寫，像 ト 底下再拉一個彎。'},
  na:{h:'奈',k:'奈',kp:['大','示'],kt:0,kw:'最上面「大」的一橫一撇',why:'同一個字「奈」。ナ 就是 奈 最上面 大 的前兩筆；な＝ナ＋右上一點（大 的捺）＋下面一圈（示 快寫）。',fun:'な＝ナ＋點＋圈。'},
  ni:{h:'仁',k:'二',kw:'整個字',why:'差一點就同一個字：に 是「仁」＝亻＋二，快寫後左邊一豎是 亻、右邊還是 二；ニ 就是那個「二」。',fun:'に＝一豎＋ニ。'},
  nu:{h:'奴',k:'奴',kp:['女','又'],kt:1,kw:'右邊的「又」',why:'同一個字「奴」。ヌ 是右邊的「又」；ぬ 是整個 奴 快寫，左邊的 女 和右邊的 又 連成一筆，最後打一個圈。',tip:'ぬ 和 め：ぬ 尾巴多打一個圈，め 沒有。'},
  ne:{h:'祢',k:'祢',kp:['礻','尔'],kt:0,kw:'左邊的「礻」',why:'同一個字「祢」。ネ 就是左邊的示字旁 礻；ね 是整個 祢 快寫：左邊一豎是 礻，右邊的 尔 寫成打圈的尾巴。',tip:'ね、れ、わ 左邊都是一豎：ね 尾巴打圈、れ 尾巴往外甩、わ 收成大彎。'},
  no:{h:'乃',k:'乃',kw:'第一筆的撇',why:'同一個字「乃」。ノ 只取第一撇；の 是 乃 一筆繞完。'},
  ha:{h:'波',k:'八',kw:'整個字',why:'は 是「波」快寫：左邊一豎是三點水 氵，右邊是「皮」；ハ 就是「八」。',fun:'ハ＝八：嘴巴笑成八字形，ha ha。'},
  hi:{h:'比',k:'比',kp:['匕','匕'],kt:1,kw:'右邊的「匕」',why:'同一個字「比」。ヒ 是右邊的 匕；ひ 是整個 比 一筆寫，兩個 匕 連成一個大彎。'},
  fu:{h:'不',k:'不',kw:'一橫一撇',why:'同一個字「不」。フ 是 不 的前兩筆；ふ 是 不 快寫，四筆各縮成點和鉤。'},
  he:{h:'部',k:'部',kp:['咅','阝'],kt:1,kw:'右邊的「阝」',why:'同一個字「部」，而且兩邊取的都是右邊的 阝，所以 へ 和 ヘ 幾乎一模一樣（平假名稍微圓一點）。'},
  ho:{h:'保',k:'保',kp:['亻','口','木'],kt:2,kw:'右下的「木」',why:'同一個字「保」。ホ 是右下角的「木」；ほ 是整個 保 快寫：左邊一豎是 亻，右邊兩橫加打結是 呆（口＋木）。',fun:'ほ＝一豎＋ま。'},
  ma:{h:'末',k:'末',kw:'上面一橫加一撇',un:'マ 也有一說來自「万」。',why:'同一個字「末」。マ 取上半；ま 是 末 快寫：兩橫一豎，最下面打結。',tip:'マ 和 ア：ア 多一條往下的撇（阝 的那一豎）。'},
  mi:{h:'美',k:'三',kw:'整個字',why:'み 是「美」快寫；ミ 就是「三」，三橫斜著寫。三 本來就有 mi 的念法：三つ＝みっつ。',fun:'ミ＝三條線＝みっつ（三個）。'},
  mu:{h:'武',k:'牟',kp:['厶','牛'],kt:0,kw:'上面的「厶」',why:'む 是「武」快寫；ム 是「牟」上面的 厶。',fun:'牟 是牛叫聲：moo～ → ム。'},
  me:{h:'女',k:'女',kw:'交叉的那兩筆',why:'同一個字「女」。メ 是 女 交叉的那兩筆；め＝メ 再繞一圈。',fun:'め＝メ＋一圈。'},
  mo:{h:'毛',k:'毛',kw:'兩橫加一彎（去掉頭上那撇）',why:'同一個字「毛」。モ 是 毛 的兩橫加彎；も 是 毛 快寫：一條彎鉤穿過兩橫。'},
  ya:{h:'也',k:'也',kw:'整個字簡化',why:'同一個字「也」，兩個都是 也 簡化；や 比 ヤ 多右上一點。'},
  yu:{h:'由',k:'由',kw:'下半的框',why:'同一個字「由」。ユ 取 由 的框；ゆ 是整個 由 快寫，中間那一豎穿出來。'},
  yo:{h:'与',k:'与',kw:'方框的部分',why:'同一個字「与」（與）。ヨ 是 与 的方框（像倒過來的 E）；よ 是 与 快寫，一豎打一個結。'},
  ra:{h:'良',k:'良',kw:'最上面一點＋橫折',why:'同一個字「良」。ラ 取 良 上面的點和橫折；ら 是整個 良 快寫：上面一點、下面一個鉤。'},
  ri:{h:'利',k:'利',kp:['禾','刂'],kt:1,kw:'右邊的「刂」',why:'同一個字「利」，而且兩個都長得像 刂：リ 就是 刂；り 是整字快寫，左右兩筆連起來。所以 り ≈ リ。'},
  ru:{h:'留',k:'流',kw:'右下的部分（像 儿）',why:'る 是「留」快寫，最後打一個圈；ル 是「流」右下角像 儿 的兩筆。',fun:'ル＝流下來的兩條水；る＝「留」住，所以尾巴打結留下來。',tip:'る 和 ろ：る 尾巴打圈（留住），ろ 沒有。'},
  re:{h:'礼',k:'礼',kp:['礻','乚'],kt:1,kw:'右邊的「乚」',why:'同一個字「礼」。レ 是右邊的 乚；れ＝左邊一豎（礻）＋右邊的彎，尾巴就是 レ。'},
  ro:{h:'呂',k:'呂',kp:['口','口'],kt:0,kw:'上面的「口」',why:'同一個字「呂」。ロ 是上面那個 口；ろ 是 呂 快寫成像 3 的彎。'},
  wa:{h:'和',k:'和',kp:['禾','口'],kt:1,kw:'右邊的「口」',why:'同一個字「和」。ワ 取右邊的 口；わ＝左邊一豎（禾）＋右邊一個大彎（口）。',tip:'ワ 和 ウ：ウ 頭上多一點（宇 的屋頂）。'},
  wo:{h:'遠',k:'乎',kw:'整個字變形',why:'を 是「遠」快寫；ヲ 是「乎」變形。現在兩個都只當助詞，念 o。'},
  n:{h:'无',k:'尓',kw:'來源沒有定論',un:'ン 一說是「尓（爾）」的變形，也有一說原本只是一個記號。',why:'ん 是「无」（無 的古字）快寫；ン 的來源沒有定論。',tip:'ン 和 ソ：ン 第二筆由下往上挑；ソ 兩筆都往下。'}
};
const knOSame = id => { const o = KN_ORIGIN[id]; return !!o && o.h === o.k; };
const knOKanji = o => `<span class="kokj" lang="ja">${esc(o.k)}</span>`;
function knOParts(o) {
  if (!o.kp) return '';
  return `<span lang="ja" class="kopt-p">${esc(o.k)} ＝ ${o.kp.map((p, i) => i === o.kt ? `<mark>${esc(p)}</mark>` : esc(p)).join(' ＋ ')}</span>`;
}
// 一個字的字源框：平假名那行、片假名那行、同不同字、因果、邪門記憶、易混提醒
function knOriginHtml(id, opt = {}) {
  const o = KN_ORIGIN[id], k = KN[id]; if (!o || !k) return '';
  const same = knOSame(id);
  return `<div class="korg">
    <div class="korow"><span class="kog" lang="ja">${esc(k.hiragana)}</span><span class="koar" aria-hidden="true">←</span><span class="kokj" lang="ja">${esc(o.h)}</span>
      <div class="kotx"><b>平假名</b>：整個「${esc(o.h)}」寫快（草書）</div></div>
    <div class="korow"><span class="kog" lang="ja">${esc(k.katakana)}</span><span class="koar" aria-hidden="true">←</span>${knOKanji(o)}
      <div class="kotx"><b>片假名</b>：取「${esc(o.k)}」${esc(o.kw)}${o.kp ? `<br>${knOParts(o)}` : ''}</div></div>
    <p><span class="pill ${same ? 'kosame' : 'kodiff'}">${same ? '同一個漢字' : '不同漢字'}</span></p>
    <p class="kowhy-t">${esc(o.why)}</p>
    ${o.fun ? `<p class="kofun"><b>邪門記憶</b>　${esc(o.fun)}</p>` : ''}
    ${o.tip ? `<p class="kotip"><b>別搞混</b>　${esc(o.tip)}</p>` : ''}
    ${o.un ? `<p class="small muted">註：${esc(o.un)}</p>` : ''}
    ${opt.more ? '<button class="btn ghost sm" data-k="origin">看全部 46 組字源對照</button>' : ''}
  </div>`;
}
// 一行摘要（放在答題回饋裡，不展開也看得到因果）
function knOriginLine(id) {
  const o = KN_ORIGIN[id], k = KN[id]; if (!o || !k) return '';
  return `<span lang="ja" class="jpf">${esc(k.hiragana)}</span> ← ${esc(o.h)}｜<span lang="ja" class="jpf">${esc(k.katakana)}</span> ← ${esc(o.k)}（${knOSame(id) ? '同一個字' : '不同字'}）`;
}
function knOriginView() {
  const f = KG.ofilter || 'all';
  const ids = KN_ORDER.filter(id => KN_ORIGIN[id] && (f === 'all' || (f === 'same') === knOSame(id)));
  const nSame = KN_ORDER.filter(knOSame).length, nAll = KN_ORDER.filter(id => KN_ORIGIN[id]).length;
  const row = id => { const k = KN[id], o = KN_ORIGIN[id];
    return `<details class="kolist"><summary><span class="kopair" lang="ja">${esc(k.hiragana)}<span>${esc(k.katakana)}</span></span>
      <span class="grow"><span class="kosum" lang="ja">${esc(o.h)}${knOSame(id) ? '' : '｜' + esc(o.k)}</span><span class="small muted">${knOSame(id) ? '同一個字' : '不同字'}・片假名取${esc(o.kw)}</span></span></summary>${knOriginHtml(id)}</details>`; };
  return knHead('平假名 ↔ 片假名', '從哪個漢字來・取哪一塊', 'home') + `<div class="ov-body" id="knBody"><div class="in">
    <section class="card stack" style="gap:8px">
      <p style="font-weight:800">先記一條規則，後面都是它的結果</p>
      <p><b>平假名</b>＝把<b>整個漢字</b>寫快（草書）。所以圓、一筆連到底。</p>
      <p><b>片假名</b>＝只<b>切漢字的一小塊</b>。最早是和尚在佛經的字縫裡註讀音，地方小、要快，只抄一塊，所以筆畫直、有角。</p>
      <p><b>結果</b>：同一個漢字變來的一對（${nSame} 組），片假名常常就藏在平假名裡（か＝カ＋一點）。不同漢字變來的（${nAll - nSame} 組），就用下面的因果和記憶法分開記。</p>
      <p class="small muted">選哪個漢字，是看它當時的念法（安 古音 an → あ a）。</p>
    </section>
    <div class="seg" role="group" aria-label="篩選">${[['all', '全部'], ['same', '同一個字'], ['diff', '不同字']].map(([v, l]) => `<button data-k="ofilter" data-v="${v}" aria-pressed="${f === v}">${l}</button>`).join('')}</div>
    <div class="stack" style="gap:8px">${ids.map(row).join('')}</div>
    <p class="small muted">字源用學界主流說法，有爭議的會標「註」。「邪門記憶」只是幫你記，不是歷史。</p>
  </div></div>`;
}

/* ---------- 事件 ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-k]'); if (!t || !$('#kn') || $('#kn').hidden) return;
  e.stopPropagation();
  const a = t.dataset.k, v = t.dataset.v, st = knSt();
  switch (a) {
    case 'close': knClose(); break;
    case 'leave': if (KG.fromTable) { knStop(); KG.view = 'home'; KG.peek = false; KG.play = {}; knRender(); } else { knClose(); toast('已保存，之後可以從這裡接續'); } break;
    case 'home': knStop(); KG.view = 'home'; KG.peek = false; KG.play = {}; knRender(); break;
    case 'mode': st.prefs.script = v; persist(); knRender(); break;
    case 'romaji': st.prefs.romaji = !st.prefs.romaji; persist(); knRender(); break;
    case 'start': st.active = null; knStartRound(); break;
    case 'resume': KG.view = 'round'; KG.peek = false; KG.play = {}; knRender(); break;
    case 'drop': st.active = null; persist(); knRender(); break;
    case 'words': KG.view = 'words'; knRender(); break;
    case 'origin': knStop(); KG.view = 'origin'; knRender(); { const b = $('#knBody'); if (b) b.scrollTop = 0; } break;
    case 'ofilter': KG.ofilter = v; knRender(); break;
    case 'open': if (!v) break; knStop(); KG.key = v; KG.view = 'card'; KG.peek = false; { const c = knCard(v, true); c.seen = true; c.lastSeen = Date.now(); persist(); } knRender(); { const b = $('#knBody'); if (b) b.scrollTop = 0; } break;
    case 'peek': KG.peek = true; knRender(); break;
    case 'sayKana': { const k = KN[v.split(':')[1]]; knSayKana(k.id, false, ok => { if (!ok) toast('沒有播出聲音'); }); } break;
    case 'sayWord': { const w = KW[v]; knSay(w.speechText || w.reading, .9, ok => { if (!ok) toast('沒有播出聲音'); }); } break;
    case 'unfam': st.wordFamiliarity[v] = st.wordFamiliarity[v] === 'unfamiliar' ? undefined : 'unfamiliar'; if (!st.wordFamiliarity[v]) delete st.wordFamiliarity[v]; persist(); knRender(); break;
    case 'play': knPlayItem(false); break;
    case 'playSlow': knPlayItem(true); break;
    case 'noaudio': knStop(); KG.play = {fallback:true}; knRender(); break;
    case 'ans': knAnswer(v); break;
    case 'next': knNext(); break;
    case 'reveal': KG.reveal = true; knRender(); { const it = knCur(), k = KN[it.key.split(':')[1]]; if (k.speechText && k.kind === 'basic') knSayKana(k.id, false); } break;
    case 'self': knSelfRate(v === '1'); break;
  }
}, true);
