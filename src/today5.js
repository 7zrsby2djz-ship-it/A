
/* ================= 今天 5 分鐘：一個按鈕，依序走完 到期複習 → 一段對話 → 五個假名 =================
   - 只負責「排順序」，每一步都直接用現有模組：startCkReview()（句塊複習）、startRun()/resumeRun()（對話）、knOpen('go')（五十音一輪）。
   - 學習紀錄照舊寫在 bnk-state-v1（S）。本流程自己的步驟只存在另一個 key：bnk-today5-v1 = {d:日期, step, on, log}，
     隔天自動重來；這個 key 壞掉或被清掉，只會讓流程從第 1 步開始，不影響任何進度。
   - 某一步「做完」才自動接下一步；中途按 ✕ 離開就暫停，首頁按鈕會顯示「繼續」。 */
const T5K = 'bnk-today5-v1';
const T5_STEPS = [{id:'review', name:'到期複習'}, {id:'dlg', name:'一段對話'}, {id:'kana', name:'五個假名'}];
let T5 = null;
function t5St() {
  if (T5 && T5.d === dayKey()) return T5;
  T5 = null;
  let raw = null; try { raw = localStorage.getItem(T5K); } catch (e) {}
  try { const o = JSON.parse(raw || 'null'); if (o && o.d === dayKey() && typeof o.step === 'number') T5 = o; } catch (e) { bnkBackupRaw(T5K, raw); }
  if (!T5) T5 = {d:dayKey(), step:0, on:false, log:{}};
  return T5;
}
function t5Save() { try { localStorage.setItem(T5K, JSON.stringify(T5)); } catch (e) {} }
function t5ReviewN() { return ckDue().length; }
// 開始（或接續）目前這一步；沒有東西可做的步驟記成「跳過」並往下走。
function t5Go(restart) {
  const st = t5St();
  if (restart || st.step >= T5_STEPS.length) { st.step = 0; st.log = {}; }
  st.on = true;
  while (st.step < T5_STEPS.length) {
    const id = T5_STEPS[st.step].id;
    if (id === 'review') { if (t5ReviewN()) { t5Save(); startCkReview(); return; } st.log.review = 'skip'; st.step++; continue; }
    if (id === 'dlg') { t5Save(); if (S.run && VAR[S.run.vid]) resumeRun(); else { const r = recommend(); RUN_END = null; startRun(r.tid, r.lv); } return; }
    if (id === 'kana') { t5Save(); knOpen('go'); return; }
  }
  t5Finish();
}
// 各模組關閉時呼叫：stepId＝哪一種畫面關了，finished＝是否真的做完（不是中途離開）。
function t5After(stepId, finished) {
  const st = t5St();
  if (!st.on || !T5_STEPS[st.step] || T5_STEPS[st.step].id !== stepId) return;
  if (!finished) { st.on = false; t5Save(); render(); return; }
  st.log[stepId] = 'done'; st.step++;
  if (st.step >= T5_STEPS.length) { t5Finish(); return; }
  t5Save(); render();
  if ($('#sheet')) { st.on = false; t5Save(); return; }   // 使用者正在看說明，不要硬切畫面
  toast(`第 ${st.step + 1} 關：${T5_STEPS[st.step].name}`);
  setTimeout(() => { if (t5St().on) t5Go(); }, 450);
}
function t5Finish() { const st = t5St(); st.on = false; st.step = T5_STEPS.length; st.doneAt = Date.now(); t5Save(); render(); fx.t5Done(T5_STEPS, st.log); }
// QA#4/#5：今天 5 分鐘的層級叫「關」；對話內不再用「步」。接續卡上提示這段屬於今天 5 分鐘的第幾關。
function t5DlgNote() { const st = t5St(), i = T5_STEPS.findIndex(x => x.id === 'dlg'); return S.run && st.step === i && (st.on || st.step > 0) ? `<p class="small">這段是今天 5 分鐘的第 ${i + 1} 關</p>` : ''; }
function t5CardHtml() {
  const st = t5St(), done = st.step >= T5_STEPS.length, started = st.step > 0 || Object.keys(st.log).length;
  const rn = t5ReviewN(), rec = S.run && VAR[S.run.vid] ? {tid:S.run.tid, lv:S.run.lv, resume:true} : recommend();
  const detail = {review: rn ? `${rn} 個句塊到期` : '目前沒有到期，會跳過',
    dlg: `${esc(TASK[rec.tid].name)}・第 ${rec.lv} 級${rec.resume ? '（接續上次）' : ''}`,
    kana: knSt().active ? '接續沒做完的一輪' : '五十音一輪'};
  const rows = T5_STEPS.map((s, i) => { const lg = st.log[s.id], cur = !done && i === st.step;
    const mark = lg === 'done' ? '✓' : lg === 'skip' ? '–' : String(i + 1);
    return `<li class="row" style="gap:10px;align-items:flex-start;${cur ? 'font-weight:800' : lg ? 'opacity:.75' : ''}"><span class="tnum" aria-hidden="true" style="flex:none;width:1.6em;height:1.6em;border-radius:50%;display:inline-grid;place-items:center;background:rgba(255,255,255,${cur ? '.95' : '.22'});color:${cur ? 'var(--jp-hero)' : '#fff'};font-weight:800">${mark}</span>
      <span style="flex:1;min-width:0">${s.name}<span class="small muted" style="display:block;font-weight:400">${lg === 'done' ? '完成' : lg === 'skip' ? '跳過' : detail[s.id]}</span></span></li>`; }).join('');
  const label = done ? '再來一輪' : started ? `繼續・第 ${st.step + 1}/${T5_STEPS.length} 關（${T5_STEPS[st.step].name}）` : '開始今天 5 分鐘';
  return `<section class="card hero-jp stack" aria-label="今天 5 分鐘">
    <div><p class="small muted">${done ? '今天的份做完了' : '只要按這一個'}</p><p style="font-size:24px;font-weight:800">今天 5 分鐘</p></div>
    <ol class="stack" style="gap:8px;list-style:none;margin:0;padding:0">${rows}</ol>
    <button class="btn onhero block" style="min-height:64px;font-size:20px;font-weight:800" data-a="t5Go" data-v="${done ? 'again' : ''}">${label}</button>
    <p class="small muted">中途離開會停在這一關，下次按這裡接續。其他練習都在下面「全部」。</p></section>`;
}
document.addEventListener('toggle', e => { if (e.target && e.target.id === 'homeAll') UI.allOpen = e.target.open; }, true);
