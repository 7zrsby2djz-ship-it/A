
/* ================= 句塊複習（看字、聽音分開追蹤）＋舊單字卡 ================= */
function ckDue() {
  const t = Date.now(), out = [];
  for (const id in S.ck) { const s = S.ck[id], k = CK[id]; if (!k || ['ask', 'polite', 'topic'].includes(k.cat)) continue;
    const lDue = canSpeak && (s.l.due <= t && s.l.s < 7), tDue = s.t.due <= t && s.t.s < 7;
    if (s.weak || lDue || tDue) out.push(id); }
  return out.sort((a, b) => (CRIT.has(CK[b].cat) - CRIT.has(CK[a].cat)) || ((S.ck[b].weak ? 1 : 0) - (S.ck[a].weak ? 1 : 0)) || (S.ck[a].l.s - S.ck[b].l.s));
}
function makeCkQ(id) {
  const k = CK[id], s = S.ck[id];
  const mode = canSpeak && (s.t.s >= 1 || s.l.s >= 1) ? 'l' : 't';
  const same = Object.values(CK).filter(x => x.id !== id && x.zh !== k.zh && x.cat === k.cat && S.ck[x.id]);
  const other = Object.values(CK).filter(x => x.id !== id && x.zh !== k.zh && x.cat === k.cat);
  const pool = shuffle(same).concat(shuffle(other)).concat(shuffle(Object.values(CK).filter(x => x.zh !== k.zh && CRIT.has(x.cat))));
  const opts = [k.zh]; for (const x of pool) { if (opts.length >= 4) break; if (!opts.includes(x.zh)) opts.push(x.zh); }
  return {t:'ck', id, mode, opts:shuffle(opts)};
}
function startCkReview() {
  let ids = ckDue().slice(0, 8);
  if (!ids.length) ids = shuffle(Object.keys(S.ck).filter(id => CK[id] && CRIT.has(CK[id].cat))).slice(0, 6);
  if (!ids.length) { toast('還沒有學過的句塊。先練一段對話'); return; }
  startSession('jp', shuffle(ids).map(makeCkQ), '句塊複習', {ck:true});
}
function sesCk(c) {
  const k = CK[c.id], res = SES.res, ex = res ? exampleOf(c.id) : null, show = c.mode === 't' || res;
  let b = `<p class="small muted">${c.mode === 'l' ? '只用聽的' : '看字'}・${esc(CAT[k.cat])}・意思是？</p>
    <div class="card stack" style="align-items:center;gap:10px;padding:22px">
      ${show ? lineHtml([c.id], {big:true}) : '<p class="muted">先聽，不看字</p>'}
      ${canSpeak ? `<button class="btn jp-b" data-a="speak" data-v="${esc(plainJp(k.jp))}" data-l="ja-JP">${IC.speak}再聽一次</button>` : ''}
    </div>
    <div class="opts">${c.opts.map((o, i) => `<button class="opt ${res ? (o === k.zh ? 'correct' : i === res.chosen ? 'wrong' : '') : ''}" data-a="ckq" data-v="${i}" ${res ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>`;
  if (res) b += `<div class="${res.ok ? 'fb ok' : 'fb no'}"><h3>${res.ok ? '對了' : '是「' + esc(k.zh) + '」'}</h3>${k.note ? `<p class="small">${esc(k.note)}</p>` : ''}
    ${ex ? `<p class="small">在對話裡：</p>${lineHtml(ex.c)}<p class="small muted">${esc(ex.zh)}</p>` : ''}</div>`;
  return [b, res ? `<button class="btn primary block" data-a="next">下一個</button>` : `<p class="small muted" style="text-align:center">選一個意思</p>`];
}
function answerCk(i) {
  const c = curCard(); if (!c || SES.res) return;
  const k = CK[c.id], s = ckSt(c.id, true), ok = c.opts[i] === k.zh;
  SES.res = {chosen:i, ok};
  if (!SES.graded.has(c.id)) { SES.graded.add(c.id); grade(c.mode === 'l' ? s.l : s.t, ok); if (ok) s.weak = false; }
  if (!ok && !SES.requeued.has(c.id)) { SES.requeued.add(c.id); SES.cards.splice(Math.min(SES.i + 3, SES.cards.length), 0, makeCkQ(c.id)); }
  SES.stats.n++; if (ok) SES.stats.ok++;
  const lg = L(); lg.jp++; if (ok) lg.jpOk++;
  touchStreak(); addXp(ok ? 4 : 1); persist(); renderSes();
  speak(plainJp(k.jp), 'ja-JP', 0.9);
}
function ckListHtml() {
  const ids = Object.keys(S.ck).filter(id => CK[id] && !['ask', 'polite', 'topic'].includes(CK[id].cat));
  const due = ckDue().length;
  const dot = rec => `<span class="sdots" aria-label="${rec.s} 級">${[0, 1, 2, 3].map(i => `<i class="${rec.s > i ? 'on' : ''}"></i>`).join('')}</span>`;
  let h = `<p class="muted small">聽懂回答用的「句塊」：完整的意義單位，像「向こう側から」「次のバス」「〜には止まりません」。看字認得和聽得出來分開記。</p>`;
  if (!ids.length) h += `<div class="card flat empty">還沒有句塊。練一段對話後，遇過的句塊會出現在這裡。</div>`;
  else {
    h += `<button class="btn jp-b block" data-a="startCk">${due ? `句塊複習（${due} 個，約 2 分鐘）` : '句塊複習'}</button>`;
    const groups = {}; ids.forEach(id => { const c = CK[id].cat; (groups[c] = groups[c] || []).push(id); });
    Object.keys(CAT).filter(c => groups[c]).sort((a, b) => CRIT.has(b) - CRIT.has(a)).forEach(c => {
      h += `<p class="sec-title">${CAT[c]}${CRIT.has(c) ? '・會影響行動' : ''}</p><div class="list">${groups[c].map(id => { const s = S.ck[id];
        return `<button class="li" data-a="ckInfo" data-v="${id}"><div class="grow"><div class="jpf" style="font-weight:700;font-size:17px">${rubyHtml(CK[id].jp)}</div><div class="zh">${esc(CK[id].zh)}</div></div>
          <div class="small muted" style="text-align:right;line-height:1.6">看 ${dot(s.t)}<br>聽 ${dot(s.l)}</div></button>`; }).join('')}</div>`;
    });
  }
  const old = Object.keys(S.jpw || {});
  if (old.length) h += `<p class="sec-title">舊版單字卡（${old.length}）</p><button class="btn block" data-a="startWords">練習舊單字卡</button>
    <div class="list">${old.map(k => `<div class="li"><div class="grow"><div class="jpf" style="font-weight:700">${esc(S.jpw[k].jp)}</div><div class="zh">${esc(S.jpw[k].zh)}</div></div>${spkBtn(S.jpw[k].jp.replace(/^〜/, ''), 'ja-JP')}<button class="chip" data-a="wDel" data-v="${esc(k)}" style="flex:none">移除</button></div>`).join('')}</div>`;
  return h;
}

/* 舊版單字卡（保留使用者原本加的字） */
function wordDue() { const t = Date.now(); return Object.keys(S.jpw || {}).filter(k => S.jpw[k].s < 7 && S.jpw[k].due <= t); }
function startWords() {
  let ids = shuffle(wordDue()).slice(0, 10);
  if (!ids.length) ids = Object.keys(S.jpw || {}).slice(0, 8);
  if (!ids.length) { toast('沒有舊單字卡'); return; }
  startSession('jp', ids.map(makeWq), '舊單字卡', {words:true});
}
function makeWq(jp) {
  const w = S.jpw[jp], pool = Object.values(S.jpw).map(x => x.zh).concat(Object.values(CK).filter(x => CRIT.has(x.cat)).map(x => x.zh)).filter(z => z !== w.zh);
  const opts = [w.zh]; for (const z of shuffle(pool)) { if (opts.length >= 4) break; if (!opts.includes(z)) opts.push(z); }
  return {t:'wq', jp, opts:shuffle(opts)};
}
function sesWq(c) {
  const w = S.jpw[c.jp], res = SES.res;
  let b = `<p class="small muted">舊單字卡・意思是？</p><div class="card stack" style="align-items:center;gap:10px;padding:22px"><p class="jpf" style="font-size:28px;font-weight:700">${esc(w.jp)}</p><p class="small muted xro">${esc(w.ro)}</p>
    ${canSpeak ? `<button class="btn jp-b" data-a="speak" data-v="${esc(w.jp.replace(/^〜/, ''))}" data-l="ja-JP">${IC.speak}再聽一次</button>` : ''}</div>
    <div class="opts">${c.opts.map((o, i) => `<button class="opt ${res ? (o === w.zh ? 'correct' : i === res.chosen ? 'wrong' : '') : ''}" data-a="wq" data-v="${i}" ${res ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>`;
  if (res) b += `<div class="${res.ok ? 'fb ok' : 'fb no'}"><h3>${res.ok ? '對了' : '是「' + esc(w.zh) + '」'}</h3></div>`;
  return [b, res ? `<button class="btn primary block" data-a="next">下一個</button>` : ''];
}
function answerWq(i) {
  const c = curCard(); if (!c || SES.res) return;
  const w = S.jpw[c.jp]; if (!w) { nextCard(); return; }
  const ok = c.opts[i] === w.zh; SES.res = {chosen:i, ok};
  if (!SES.graded.has(c.jp)) { SES.graded.add(c.jp); grade(w, ok); }
  SES.stats.n++; if (ok) SES.stats.ok++;
  touchStreak(); addXp(ok ? 4 : 1); persist(); renderSes();
  speak(w.jp.replace(/^〜/, ''), 'ja-JP', 0.85);
}

/* ================= 日文頁與首頁的推薦 ================= */
function lvBadges(tid) {
  return lvList(tid).map(lv => { const s = lvPeek(tid, lv);
    const st = !s ? '' : (s.transfer ? 'tr' : (s.listen || s.repair) ? 'pass' : 'tried');
    return `<i class="${st}" title="第 ${lv} 級"></i>`; }).join('');
}
function jpNextHtml(onHero) {
  if (S.run && VAR[S.run.vid]) return `<p class="small muted">接續上次</p><p style="font-size:19px;font-weight:800">${esc(TASK[S.run.tid].name)}・第 ${S.run.lv} 級</p>
    <p class="small ${onHero ? '' : 'muted'}">前情：${esc(recapText(S.run))}</p>
    <div class="row"><button class="btn onhero" style="flex:1" data-a="runResume">繼續</button><button class="btn ghost" style="color:#fff;border-color:rgba(255,255,255,.5)" data-a="runDrop">放棄這段</button></div>`;
  const due = ckDue().length;
  if (due >= 4) return `<p class="small muted">推薦下一步</p><p style="font-size:19px;font-weight:800">句塊複習 ${due} 個</p><p class="small muted">約 2 分鐘。方向、否定、號碼、時間優先。</p>
    <div class="row"><button class="btn onhero" style="flex:1" data-a="startCk">開始複習</button><button class="btn ghost" style="color:#fff;border-color:rgba(255,255,255,.5)" data-a="runRec">改練對話</button></div>`;
  const rec = recommend(), t = TASK[rec.tid];
  return `<p class="small muted">推薦下一步・${esc(rec.why)}</p><p style="font-size:19px;font-weight:800">${esc(t.name)}・第 ${rec.lv} 級</p><p class="small muted">${esc(t.axis[rec.lv])}・約 2–4 分鐘</p>
    <div class="row"><button class="btn onhero" style="flex:1" data-a="runRec">開始</button><button class="btn ghost" style="color:#fff;border-color:rgba(255,255,255,.5)" data-a="lsOpen">${IC.speak}耳機</button></div>`;
}
function dlgTasksHtml() {
  return `<p class="muted small">你先開口（或店員、廣播先說），日本人用自然的日文回答。聽不懂可以請對方重說、說慢、說簡單一點，或用「〜ですね」確認。每一級都可以直接試。</p>
    <div class="legend2 small muted"><span><i class="tried"></i>練過</span><span><i class="pass"></i>不看字完成</span><span><i class="tr"></i>換說法也聽懂</span></div>
    ${[...new Set(TASKS.map(t => t.group))].map(g => `<p class="sec-title">${esc(g)}</p><div class="list">${TASKS.filter(t => t.group === g).map(t => `<button class="li" data-a="taskSheet" data-v="${t.id}"><div class="grow"><div style="font-weight:800">${esc(t.name)}</div><div class="zh">${esc(t.place)}</div><div class="lvdots">${lvBadges(t.id)}</div></div>${IC.chev}</button>`).join('')}</div>`).join('')}
    <button class="btn block" data-a="lsOpen">${IC.speak}耳機模式</button>
    <p class="small muted">生活情境多半是店員或廣播先開口。關鍵字＋問的語氣（例如「洗濯機？」「全部普通で」「初めてです」）常常就夠了。</p>`;
}
function taskSheet(tid) {
  const t = TASK[tid], rec = recommend();
  return `<h2 style="font-size:22px">${esc(t.name)}</h2><p class="muted">${esc(t.place)}・${esc(t.setup)}</p>
    <div class="list">${lvList(tid).map(lv => { const s = lvPeek(tid, lv), isRec = rec.tid === tid && rec.lv === lv;
      const stat = s ? `看字 ${s.text}・純聽 ${s.listen}・求助 ${s.repair}・換說法 ${s.transfer}${s.later ? '・隔天仍完成 ' + s.later : ''}` : '還沒練過';
      return `<button class="li" data-a="taskGo" data-v="${tid}:${lv}"><div class="grow"><div style="font-weight:800">第 ${lv} 級・${esc(t.axis[lv])}${isRec ? ' <span class="pill st-fam">推薦</span>' : ''}</div><div class="zh">${stat}</div></div>${IC.chev}</button>`; }).join('')}</div>
    <p class="small muted">每一級都可以直接試，不用先通過前一級。不看字完成或求助後完成，就會推薦下一級。</p>
    <button class="btn block" data-a="lsOpen" data-v="${tid}">${IC.speak}用耳機模式聽這個情境</button>
    <p class="small muted">${esc(t.sim)}</p>`;
}
function readSegHtml() {
  const cur = S.settings.read || 'furi';
  return `<div class="seg" role="group" aria-label="讀音顯示">${[['furi', '振假名'], ['ro', '拼音'], ['both', '兩者'], ['none', '關']].map(([v, l]) => `<button data-a="read" data-v="${v}" aria-pressed="${cur === v}">${l}</button>`).join('')}</div>`;
}
function applyRead() {
  const r = S.settings.read || 'furi';
  ['furi', 'ro', 'both', 'none'].forEach(x => document.body.classList.toggle('rd-' + x, r === x));
  S.settings.romaji = r !== 'none';
}
function weekDays() { let n = 0; for (let i = 0; i < 7; i++) { const d = S.log[dayKey(Date.now() - i * DAY)]; if (d && (d.en || d.jp || d.look)) n++; } return n; }

function jpProgressHtml() {
  const sum = {done:0, text:0, listen:0, repair:0, transfer:0, later:0};
  TASKS.forEach(t => { for (let lv = 1; lv <= t.levels; lv++) { const s = lvPeek(t.id, lv); if (s) for (const k in sum) sum[k] += s[k] || 0; } });
  const ckN = Object.keys(S.ck).length, ckL = Object.values(S.ck).filter(x => x.l.s >= 3).length;
  if (!sum.done && !ckN) return '';
  return `<p class="sec-title">日文對話進度</p><div class="kpis">
    <div class="kpi"><span class="small muted">不看字完成</span><b class="tnum">${sum.listen}</b><span class="small muted">求助後完成 ${sum.repair}・看字 ${sum.text}</span></div>
    <div class="kpi"><span class="small muted">換說法也聽懂</span><b class="tnum">${sum.transfer}</b><span class="small muted">隔天仍完成 ${sum.later}</span></div>
    <div class="kpi"><span class="small muted">句塊</span><b class="tnum">${ckN}</b><span class="small muted">聽得出來 ${ckL} 個</span></div>
    <div class="kpi"><span class="small muted">練過的對話</span><b class="tnum">${sum.done}</b><span class="small muted">次</span></div></div>`;
}

function lvList(tid) { return Array.from({length:TASK[tid].levels}, (_, i) => i + 1); }
