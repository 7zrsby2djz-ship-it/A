
/* ================= 日文單字卡（從對話裡勾「不熟」的字） ================= */
function allDlgWords() {
  const m = new Map();
  for (const sid in DLG_W) DLG_W[sid].forEach(list => (list || []).forEach(([jp, ro, zh]) => { if (!m.has(jp)) m.set(jp, {jp, ro, zh}); }));
  return m;
}
function wordInfo(jp) { return S.jpw[jp] || allDlgWords().get(jp); }
function wordRow([jp, ro, zh]) {
  const on = !!S.jpw[jp];
  return `<div class="li" style="gap:10px"><div class="grow"><div class="jpf" style="font-weight:700;font-size:19px">${esc(jp)}</div><div class="small muted">${S.settings.romaji ? esc(ro) + '・' : ''}${esc(zh)}</div></div>
    ${spkBtn(jp.replace(/^〜/, ''), 'ja-JP')}<button class="chip" data-a="wMark" data-v="${esc(jp)}" aria-pressed="${on}" style="flex:none">${on ? '已加入' : '不熟'}</button></div>`;
}
function toggleWord(jp) {
  if (S.jpw[jp]) { delete S.jpw[jp]; toast('已從單字卡移除'); }
  else { const w = allDlgWords().get(jp); if (!w) return; S.jpw[jp] = Object.assign({jp:w.jp, ro:w.ro, zh:w.zh}, mkRec(), {due:Date.now()}); toast('已加入單字卡：' + jp); }
  persist();
}
function wordDue() { const t = Date.now(); return Object.keys(S.jpw).filter(k => S.jpw[k].s < 7 && S.jpw[k].due <= t); }
function wordWhere(jp) {
  const key = jp.replace(/^〜/, '').replace(/る$|ます$/, '');
  for (const d of DLG) for (let l = 1; l <= 5; l++) { const s = d.lv[l]; for (const r of [s.r1, s.r2]) if (r.jp.includes(key)) return r; }
  return null;
}
function startWords() {
  let ids = shuffle(wordDue()).slice(0, 12);
  if (!ids.length) ids = Object.keys(S.jpw).sort((a, b) => S.jpw[a].s - S.jpw[b].s).slice(0, 8);
  if (!ids.length) { toast('單字卡還是空的。練對話時把不熟的字按「不熟」'); return; }
  startSession('jp', ids.map(makeWq), '單字卡', {words:true});
}
function makeWq(jp) {
  const w = S.jpw[jp], pool = [...allDlgWords().values()].filter(x => x.jp !== jp && x.zh !== w.zh);
  const opts = shuffle([w.zh, ...shuffle(pool).slice(0, 3).map(x => x.zh)]);
  return {t:'wq', jp, mode:w.s >= 2 && Math.random() < 0.5 ? 'listen' : 'read', opts};
}
function sesWq(c) {
  const w = S.jpw[c.jp] || wordInfo(c.jp), res = SES.res, where = res ? wordWhere(c.jp) : null;
  const showText = c.mode === 'read' || res;
  let b = `<p class="small muted">${c.mode === 'listen' ? '只用聽的' : '看字'}・意思是？</p>
    <div class="card stack" style="align-items:center;gap:10px;padding:22px">
      ${showText ? jline(w.jp, w.ro, true) : '<p class="muted">先聽，不看字</p>'}
      ${canSpeak ? `<button class="btn jp-b" data-a="speak" data-v="${esc(w.jp.replace(/^〜/, ''))}" data-l="ja-JP">${IC.speak}再聽一次</button>` : ''}
    </div>
    <div class="opts">${c.opts.map((o, i) => `<button class="opt ${res ? (o === w.zh ? 'correct' : i === res.chosen ? 'wrong' : '') : ''}" data-a="wq" data-v="${i}" ${res ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>`;
  if (res) b += `<div class="${res.ok ? 'fb ok' : 'fb no'}"><h3>${res.ok ? '對了' : '是「' + esc(w.zh) + '」'}</h3><p><b class="jpf">${esc(w.jp)}</b>（${esc(w.ro)}）＝${esc(w.zh)}</p>
      ${where ? `<p class="small">在對話裡是這樣出現的：</p>${jline(where.jp, where.ro)}<p class="small muted">${esc(where.zh)}</p>` : ''}</div>`;
  return [b, res ? `<button class="btn primary block" data-a="next">下一個</button>` : `<p class="small muted" style="text-align:center">選一個意思</p>`];
}
function answerWq(i) {
  const c = curCard(); if (!c || SES.res) return;
  const w = S.jpw[c.jp]; if (!w) { nextCard(); return; }
  const ok = c.opts[i] === w.zh; SES.res = {chosen:i, ok};
  if (!SES.graded.has(c.jp)) { SES.graded.add(c.jp); grade(w, ok); }
  if (!ok && !SES.requeued.has(c.jp)) { SES.requeued.add(c.jp); SES.cards.splice(Math.min(SES.i + 3, SES.cards.length), 0, makeWq(c.jp)); }
  SES.stats.n++; if (ok) SES.stats.ok++;
  const lg = L(); lg.jp++; if (ok) lg.jpOk++;
  touchStreak(); addXp(ok ? 5 : 1); persist(); renderSes();
  speak(w.jp.replace(/^〜/, ''), 'ja-JP', 0.85);
}
function wordListHtml() {
  const ids = Object.keys(S.jpw), due = wordDue().length;
  if (!ids.length) return `<div class="card flat empty">單字卡還是空的。<br>練對話時，在「先認識這幾個字」裡把不熟的按「不熟」，就會出現在這裡。</div>`;
  return `<button class="btn jp-b block" data-a="startWords">${due ? `練習單字卡（${due} 個要複習）` : '練習單字卡'}</button>
    <div class="list">${ids.map(k => { const w = S.jpw[k];
      return `<div class="li" style="gap:10px"><div class="grow"><div class="jpf" style="font-weight:700;font-size:18px">${esc(w.jp)}</div><div class="small muted">${S.settings.romaji ? esc(w.ro) + '・' : ''}${esc(w.zh)}</div></div>${pill(status(w))}${spkBtn(w.jp.replace(/^〜/, ''), 'ja-JP')}<button class="chip" data-a="wMark" data-v="${esc(w.jp)}" style="flex:none">移除</button></div>`; }).join('')}</div>
    <p class="small muted">答錯的字 10 分鐘後再出現，答對的越隔越久。熟了之後會改成「只用聽的」考你。</p>`;
}
