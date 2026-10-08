/* ===== 主程式：今天、我的、設定、事件 ===== */
const sv = d => '<svg viewBox="0 0 24 24" class="icon" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const ICON = {
  today: sv('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>'),
  chat: sv('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
  book: sv('<path d="M4 4.5h6a2 2 0 0 1 2 2V20a1.5 1.5 0 0 0-1.5-1.5H4z"/><path d="M20 4.5h-6a2 2 0 0 0-2 2V20a1.5 1.5 0 0 1 1.5-1.5H20z"/>'),
  ear: sv('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="7" rx="1.5"/><rect x="17" y="13" width="4" height="7" rx="1.5"/>'),
  me: sv('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 4-5 7-5s5.8 1.4 7 5"/>'),
  sound: sv('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  star: sv('<path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>'),
  x: sv('<path d="M6 6l12 12M18 6 6 18"/>'),
  back: sv('<path d="M15 5l-7 7 7 7"/>'),
  check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  text: sv('<path d="M5 6h14M12 6v13M8.5 19h7"/>'),
  phone: sv('<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 17.5h2"/>'),
  cup: sv('<path d="M6 8h12l-1.3 11.2a1.5 1.5 0 0 1-1.5 1.3H8.8a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M5 8h14M8 8l.8-3h6.4L16 8M7.5 12.5h9"/>'),
  boba: sv('<path d="M6.5 7h11l-1.6 13H8.1z"/><path d="M12 7l2-4.5M6 7h12"/><circle cx="10" cy="17" r=".9"/><circle cx="13.2" cy="16.2" r=".9"/><circle cx="12" cy="18.6" r=".9"/>'),
  store: sv('<path d="M4 10v10h16V10"/><path d="M3 10l1.5-5h15L21 10z"/><path d="M10 20v-5h4v5"/>'),
  egg: sv('<path d="M6.5 11A3.5 3.5 0 0 1 8 4.5h8a3.5 3.5 0 0 1 1.5 6.5v8.5h-11z"/><path d="M9.5 14.5h5"/>'),
  train: sv('<rect x="6" y="3.5" width="12" height="13" rx="3"/><path d="M6 11h12M9 20l-1.5 1.5M15 20l1.5 1.5M9 16.5 7.5 20M15 16.5l1.5 3.5"/><circle cx="9.5" cy="13.8" r=".6"/><circle cx="14.5" cy="13.8" r=".6"/>'),
  school: sv('<path d="M3 9l9-4.5L21 9l-9 4.5z"/><path d="M7 11v5c1.5 1.3 3.2 2 5 2s3.5-.7 5-2v-5M21 9v5"/>')
};
const TABS = [['today', '今天', 'ဒီနေ့', ICON.today], ['talk', '對話', 'စကားပြော', ICON.chat], ['words', '單字', 'စကားလုံး', ICON.book], ['practice', '聽讀', 'နားထောင်/ဖတ်', ICON.ear], ['me', '我的', 'ကျွန်ုပ်', ICON.me]];

function pageHead(title, my) { return '<div class="shead"><button class="ib" data-a="back" aria-label="返回">' + ICON.back + '</button><div class="grow"><h1>' + zy(title) + '</h1>' + (my ? '<small class="my">' + esc(my) + '</small>' : '') + '</div></div>'; }
function sheetHead(title, i, n) {
  return '<div class="shead"><button class="ib" data-a="close" aria-label="關閉">' + ICON.x + '</button><span class="grow">' + zy(title) + (n ? '　' + i + ' / ' + n : '') + '</span></div>' +
    (n ? '<div class="bar" style="margin:-4px 0 16px"><i style="width:' + Math.round((i - 1) / n * 100) + '%"></i></div>' : '');
}
SHEETS.done = function (s) {
  return sheetHead(s.title) + '<div class="card endcard"><div class="mark">' + ICON.check + '</div><div>' + T(s.msg[0], s.msg[1]) + '</div></div><button class="btn pri block" style="margin-top:16px" data-a="close">' + T('完成', 'ပြီးပြီ') + '</button>';
};

/* ---- 每天的計畫 ---- */
const TRACKS = {
  scene: ['生活與工作情境（15 個主題）', 'နေ့စဉ်နဲ့ အလုပ် အခြေအနေ ၁၅ ခု', () => BOOKS.filter(b => b.kind === 'scene')],
  t1: ['TOCFL 入門級', 'TOCFL အခြေခံအဆင့်', () => BOOKS.filter(b => b.kind === 'tocfl').slice(0, 1)],
  t2: ['TOCFL 基礎級', 'TOCFL အဆင့် ၂', () => BOOKS.filter(b => b.kind === 'tocfl').slice(1, 2)],
  ming: ['明朗中文 A1～B2', 'A1～B2', () => BOOKS.filter(b => b.kind === 'ming')]
};
function trackWords() { const t = TRACKS[S.track] || TRACKS.scene; return t[2]().reduce((a, b) => a.concat(bookIds(b)), []); }
function ensureDay() {
  const d = today();
  if (S.day && S.day.d === d) return S.day;
  const newIds = trackWords().filter(id => !(S.w[id] && S.w[id].seen)).slice(0, 5);
  const rev = Object.keys(S.w).filter(id => WORDS[id] && WORDS[id].src !== 'u' && due(id)).sort((a, b) => S.w[a].d - S.w[b].d).slice(0, 10);
  let ui = UI_RAW.map(r => 'u' + r[0]).filter(id => !(S.w[id] && S.w[id].seen)).slice(0, 3);
  if (ui.length < 3) ui = ui.concat(UI_RAW.map(r => 'u' + r[0]).filter(due)).slice(0, 3);
  S.day = { d: d, newIds: newIds, rev: rev, ui: ui, talk: recommendVar(), done: {} };
  save(); return S.day;
}
function doneTask(tag) { if (S.day && S.day.d === today()) { S.day.done[tag] = 1; save(); } }

VIEWS.today = function () {
  const day = ensureDay();
  const hr = new Date(now() + 8 * 3600e3).getUTCHours();
  const hi = hr < 11 ? ['早安', 'မင်္ဂလာနံနက်ခင်းပါ'] : hr < 18 ? ['午安', 'မင်္ဂလာနေ့လယ်ခင်းပါ'] : ['晚安', 'မင်္ဂလာညနေခင်းပါ'];
  let h = '<div class="hello"><h1>' + T(hi[0], hi[1]) + '</h1><p>' + zy('今天大約 15 分鐘。一次做一件就好。') + '<small class="my">ဒီနေ့ ၁၅ မိနစ်လောက်။ တစ်ခါ တစ်ခုပဲ လုပ်။</small></p></div>';
  if (!S.track) {
    h += '<div class="card" style="margin-top:14px"><div style="font-weight:500">' + T('每天的新字要從哪裡來？', 'နေ့စဉ် စကားလုံးအသစ် ဘယ်ကယူမလဲ') + '</div><div class="btns" style="margin-top:12px">' +
      Object.keys(TRACKS).map(k => '<button class="btn" data-a="track" data-t="' + k + '">' + T(TRACKS[k][0], TRACKS[k][1]) + '</button>').join('') + '</div><p class="tiny" style="margin-top:8px">' + esc('之後可以在「我的 → 設定」改。') + '</p></div>';
    return h;
  }
  if (S.run && !S.run.end) { const f = findVar(S.run.vid); if (f) h += '<button class="card resume row" style="width:100%;text-align:left;margin-top:14px" data-a="tresume"><span class="grow">' + T('接著練：' + f.sc.name, 'ဆက်လေ့ကျင့်') + '</span><span class="arr">›</span></button>'; }
  const tv = findVar(day.talk);
  const tasks = [
    ['new', '新字 ' + day.newIds.length + ' 個', 'စကားလုံးအသစ် ' + day.newIds.length + ' လုံး', '學完馬上 5 秒測驗', day.newIds.length],
    ['rev', day.rev.length ? '複習 ' + day.rev.length + ' 個' : '今天沒有要複習的字', day.rev.length ? 'ပြန်လေ့လာ ' + day.rev.length + ' လုံး' : 'ပြန်လေ့လာစရာ မရှိ', '先想意思，再看答案', day.rev.length],
    ['talk', '對話：' + (tv ? tv.sc.name : ''), 'စကားပြော', tv ? 'Lv.' + tv.v.lv + (tv.v.tr ? '・換說法' : '') : '', tv ? 1 : 0],
    ['ui', '手機介面字 ' + day.ui.length + ' 個', 'ဖုန်းမျက်နှာပြင် စကားလုံး', '再做 3 題手機畫面題', day.ui.length],
    ['listen', '聽力 5 題', 'နားထောင် ၅ ခု', S.prSet.level + '・不限時', 1]
  ];
  h += '<div class="sec"><h2>' + T('今天', 'ဒီနေ့') + '</h2><span class="meta">' + esc(Object.keys(day.done).length + ' / ' + tasks.length) + '</span></div><div class="list">';
  tasks.forEach((t, i) => {
    const done = day.done[t[0]] || (!t[4] && t[0] === 'rev');
    h += '<button class="task' + (done ? ' done' : '') + '" data-a="task" data-t="' + t[0] + '"' + (!t[4] ? ' disabled' : '') + '><span class="ck">' + (done ? '✓' : (i + 1)) + '</span><span class="grow"><span class="t1">' + zy(t[1]) + '</span><small class="my">' + esc(t[2]) + '</small>' + (t[3] ? '<span class="t2" style="display:block">' + zy(t[3]) + '</span>' : '') + '</span><span class="arr">›</span></button>';
  });
  h += '</div>';
  if (tasks.every(t => day.done[t[0]] || !t[4])) h += '<div class="note blue" style="margin-top:12px">' + T('今天的都做完了。想多練可以去「對話」。', 'ဒီနေ့ဟာ ပြီးပြီ။ ပိုလေ့ကျင့်ချင်ရင် 對話 ကိုသွား။') + '</div>';
  // 這一週
  const days = []; for (let i = 6; i >= 0; i--) days.push(today(now() - i * 86400e3));
  h += '<div class="sec"><h2>' + T('這一週', 'ဒီအပတ်') + '</h2></div><div class="card row" style="justify-content:space-between">' +
    days.map(d => { const on = S.log[d]; const wd = '日一二三四五六'[new Date(d + 'T00:00:00Z').getUTCDay()]; return '<div class="center"><div class="tiny">' + wd + '</div><div style="width:26px;height:26px;border-radius:50%;margin:4px auto 0;border:1px solid ' + (on ? 'var(--blue)' : 'var(--line2)') + ';background:' + (on ? 'var(--blue-soft)' : 'transparent') + '"></div></div>'; }).join('') + '</div>';
  const learned = Object.keys(S.w).filter(id => S.w[id].seen && WORDS[id]).length;
  const starred = Object.keys(S.w).filter(id => S.w[id].star && WORDS[id]).length;
  h += '<div class="stat" style="margin-top:10px"><div><b>' + learned + '</b><span>' + zy('學過的字') + '</span></div><div><b>' + Object.keys(S.talk).length + '</b><span>' + zy('練過的對話') + '</span></div><div><b>' + starred + '</b><span>' + zy('生字本') + '</span></div></div>';
  return h;
};
function runTask(t) {
  const day = ensureDay();
  if (t === 'new') startStudy(day.newIds, { then: 'quiz', tag: 'new', title: '今天的新字' });
  else if (t === 'rev') startStudy(day.rev, { recall: true, tag: 'rev', title: '複習' });
  else if (t === 'talk') startTalk(day.talk, 'talk');
  else if (t === 'ui') startStudy(day.ui, { then: 'screens', tag: null, title: '手機介面字' });
  else if (t === 'listen') startPractice({ skill: 'listening', mode: 'guided', count: 5, level: S.prSet.level, tag: 'listen' });
}

/* ---- 我的 ---- */
VIEWS.me = function () {
  const set = S.set;
  const starred = Object.keys(S.w).filter(id => S.w[id].star && WORDS[id]);
  const dueN = starred.filter(due).length;
  let h = '<button class="card row" style="width:100%;text-align:left" data-a="go" data-v="note"><span class="mk" style="color:var(--blue)">' + ICON.star + '</span><span class="grow"><b style="font-weight:500">' + zy('生字本') + '</b><small class="my">စကားလုံးစာအုပ်</small></span><span class="tiny">' + esc(starred.length + ' 個' + (dueN ? '・' + dueN + ' 個該複習' : '')) + '</span><span class="arr">›</span></button>';
  // 紀錄
  const learned = Object.keys(S.w).filter(id => S.w[id].seen && WORDS[id]);
  const solid = learned.filter(id => S.w[id].s >= 3).length;
  const talkN = TALK.reduce((t, sc) => t + sc.vars.length, 0);
  const listenN = Object.keys(S.talk).filter(k => S.talk[k].best !== 'text').length;
  h += '<div class="sec"><h2>' + T('學習紀錄', 'လေ့လာမှု မှတ်တမ်း') + '</h2></div><div class="stat"><div><b>' + learned.length + '</b><span>' + zy('學過的字') + '</span></div><div><b>' + solid + '</b><span>' + zy('比較熟') + '</span></div><div><b>' + Object.keys(S.talk).length + '/' + talkN + '</b><span>' + zy('對話') + '</span></div></div>';
  h += '<div class="stat" style="margin-top:8px"><div><b>' + listenN + '</b><span>' + zy('只用聽完成') + '</span></div><div><b>' + ((S.pstat.listening || {}).n || 0) + '</b><span>' + zy('聽力題') + '</span></div><div><b>' + ((S.pstat.reading || {}).n || 0) + '</b><span>' + zy('閱讀題') + '</span></div></div>';
  // 設定
  const sw = (k, zh, my) => '<button class="set" style="width:100%;text-align:left" data-a="set" data-k="' + k + '"><span>' + T(zh, my) + '</span><span class="sw' + (set[k] ? ' on' : '') + '"></span></button>';
  const sg = (k, zh, my, opts) => '<div class="set"><span>' + T(zh, my) + '</span><div class="seg" style="width:58%">' + opts.map(o => '<button class="' + (String(set[k]) === String(o[0]) ? 'on' : '') + '" data-a="setv" data-k="' + k + '" data-v="' + o[0] + '">' + esc(o[1]) + '</button>').join('') + '</div></div>';
  h += '<div class="sec"><h2>' + T('設定', 'Settings') + '</h2></div><div class="list">';
  h += sw('my', '顯示緬文', 'မြန်မာစာ ပြ') + sw('zy', '顯示注音', 'ဇူယင် ပြ') + sw('auto', '自動播放聲音', 'အသံ အလိုအလျောက်ဖွင့်');
  h += sg('size', '字的大小', 'စာလုံးအရွယ်', [['s', '小'], ['m', '中'], ['l', '大']]);
  h += sg('theme', '外觀', 'အရောင်', [['auto', '自動'], ['light', '淺'], ['dark', '深']]);
  h += sg('rate', '說話速度', 'အမြန်နှုန်း', [['0.8', '慢'], ['1', '正常'], ['1.15', '快']]);
  const vs = TTS.voices;
  h += '<div class="set"><span>' + T('中文聲音', 'အသံ') + '</span><span class="row"><select class="sel" data-a="voice" id="voiceSel"><option value="">' + esc('自動（台灣優先）') + '</option>' + vs.map(v => '<option value="' + esc(v.voiceURI) + '"' + (v.voiceURI === set.voice ? ' selected' : '') + '>' + esc(v.name + ' ' + v.lang) + '</option>').join('') + '</select><button class="ib" data-a="say" data-t="你好，我們開始練習吧。">' + ICON.sound + '</button></span></div>';
  h += '<div class="set"><span>' + T('每天新字的來源', 'စကားလုံးအသစ် ရင်းမြစ်') + '</span><select class="sel" data-a="trackSel" id="trackSel">' + Object.keys(TRACKS).map(k => '<option value="' + k + '"' + (S.track === k ? ' selected' : '') + '>' + esc(TRACKS[k][0]) + '</option>').join('') + '</select></div>';
  h += '<div class="set"><span>' + T('聽力練習的級數', 'နားထောင် အဆင့်') + '</span><div class="seg" style="width:58%">' + LEVELS.map(l => '<button class="' + (S.prSet.level === l ? 'on' : '') + '" data-a="pset" data-k="level" data-v="' + l + '">' + l + '</button>').join('') + '</div></div>';
  h += '</div>';
  if (!TTS.ok || !vs.length) h += '<p class="tiny" style="margin:8px 4px">' + esc('這台手機目前找不到中文語音。iPhone：設定 → 輔助使用 → 朗讀內容 → 聲音 → 中文（台灣）。單字的真人錄音不受影響。') + '</p>';
  // 備份
  h += '<div class="sec"><h2>' + T('備份', 'Backup') + '</h2></div><div class="card"><p class="small" style="margin:0">' + zy('進度只存在這支手機的瀏覽器。換手機前，先複製備份碼。') + '<small class="my">မှတ်တမ်းက ဒီဖုန်းထဲမှာပဲ ရှိတယ်။ ဖုန်းမပြောင်းခင် backup ကုဒ် ကူးထားပါ။</small></p>' +
    '<div class="btns two" style="margin-top:10px"><button class="btn sm" data-a="export">' + T('複製備份碼', 'ကုဒ်ကူး') + '</button><button class="btn sm" data-a="importShow">' + T('貼上備份碼', 'ကုဒ်ထည့်') + '</button></div>' +
    (NAV.imp ? '<textarea class="code" id="impBox" placeholder="貼上備份碼"></textarea><button class="btn pri block" style="margin-top:8px" data-a="import">' + T('還原', 'ပြန်ထည့်') + '</button>' : '') + '</div>';
  // 關於
  h += '<div class="sec"><h2>' + T('關於', 'အကြောင်း') + '</h2></div><div class="card small stack">' +
    '<div>' + zy('明白（ㄇㄧㄥˊ ㄅㄞˊ）＝聽懂了。給緬恩一個人用的中文學習 App。') + '</div>' +
    '<div class="tiny">' + esc('・情境單字、TOCFL 單字、例句、緬文翻譯、單字錄音、答對答錯音效：Work Chinese／Chin Chin Chinese（Myanmar Edition），YUNG-TSAI LAI、ChinQing in Taiwan。授權 CC BY-NC-ND 4.0，原樣使用、未修改、非商業。') + '<br><a href="https://github.com/lai2570/Burmese_language_app" target="_blank" rel="noopener" style="color:var(--blue)">github.com/lai2570/Burmese_language_app</a></div>' +
    '<div class="tiny">' + esc('・聽讀題目、CAT 模擬、明朗中文 96 詞：明朗中文（ChatGPT 製作）。') + '</div>' +
    '<div class="tiny">' + esc('・生活對話、手機介面字：為這個 App 新寫。緬文翻譯還沒有母語老師檢查，看到怪的地方可以記下來。') + '</div>' +
    '<div class="tiny">' + esc('・句子的聲音是手機內建的電腦語音，不是真人。') + '</div></div>';
  h += '<button class="btn ghost block" style="margin-top:16px;color:var(--bad)" data-a="reset">' + esc(NAV.resetArm ? '再按一次：全部清除' : '清除所有紀錄') + '</button>';
  return h;
};

/* ---- 畫面 ---- */
function applySettings() {
  const r = document.documentElement;
  if (S.set.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', S.set.theme);
  r.setAttribute('data-size', S.set.size);
  document.body.classList.toggle('hide-my', !S.set.my);
  document.body.classList.toggle('hide-zy', !S.set.zy);
}
let lastKey = '';
function render() {
  applySettings();
  const sh = NAV.sheet;
  document.body.classList.toggle('sheet-mode', !!sh);
  let h;
  if (sh) h = SHEETS[sh.v](sh);
  else {
    const top = NAV.stack[NAV.stack.length - 1];
    h = (top ? '' : '<header class="top"><div class="brand"><b>' + zy('明白') + '</b><span class="my">နားလည်ပြီ</span></div><div class="tag"><b>' + esc(today().slice(5).replace('-', '.')) + '</b><span>' + esc(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(today() + 'T00:00:00Z').getUTCDay()]) + '</span></div></header>') +
      (top ? VIEWS[top.v](top) : VIEWS[NAV.tab]());
  }
  $('#app').innerHTML = '<main class="' + (sh ? 'sheet' : 'page') + '">' + h + '</main>';
  $('#nav').innerHTML = '<div class="nav-in">' + TABS.map(t => '<button class="' + (NAV.tab === t[0] ? 'on' : '') + '" data-a="tab" data-t="' + t[0] + '">' + t[3] + '<span>' + esc(t[1]) + '<span class="my" lang="my">' + esc(t[2]) + '</span></span></button>').join('') + '</div>';
  const key = sh ? sh.v + ':' + (sh.i != null ? sh.i : '') + ':' + (sh.ans ? sh.ans.length : '') : 'p:' + NAV.tab + ':' + NAV.stack.length + ':' + (NAV.stack.length ? JSON.stringify(NAV.stack[NAV.stack.length - 1]) : '');
  if (key !== lastKey && !(sh && sh.v === 'talk')) window.scrollTo(0, 0);
  if (sh && sh.v === 'talk' && !lastKey.startsWith('talk')) window.scrollTo(0, 0);
  lastKey = key;
}

/* ---- 事件 ---- */
const ACTS = {
  tab: el => { stopAll(); NAV.tab = el.dataset.t; NAV.stack = []; NAV.resetArm = false; render(); },
  go: el => { stopAll(); NAV.stack.push({ v: el.dataset.v, id: el.dataset.id, u: el.dataset.u != null ? +el.dataset.u : null }); render(); },
  back: () => { stopAll(); NAV.stack.pop(); render(); },
  close: () => { stopAll(); const s = NAV.sheet; if (s) { clearTimeout(s.timer); clearInterval(s.tick); } NAV.sheet = null; if (S.run && S.run.end) { S.run = null; save(); } render(); },
  wtab: el => { NAV.wtab = el.dataset.t; render(); },
  nf: el => { NAV.nf = el.dataset.f; render(); },
  reveal: el => { const w = el.closest('.myw'); if (w) w.classList.add('force'); },
  star: el => { const st = ws(el.dataset.id); st.star = st.star ? 0 : 1; if (st.star && !st.seen) { st.seen = now(); st.d = now(); } save(); el.classList.toggle('on', !!st.star); toast(st.star ? '已加入生字本' : '已從生字本拿掉'); },
  starall: () => { NAV.sheet.res.filter(r => !r.ok).forEach(r => { ws(r.id).star = 1; }); save(); toast('已加入生字本'); render(); },
  playw: el => { const b = el; b.classList.add('busy'); playWord(WORDS[el.dataset.id], () => b.classList.remove('busy')); },
  say: el => { speak(el.dataset.t, 1); },
  study: el => { const b = book(el.dataset.b), u = b.units[+el.dataset.u]; startStudy(u.ids, { then: 'quiz', unit: u.key, title: HAN.test(u.title) ? u.title : b.zh }); },
  quiz: el => { const b = book(el.dataset.b), u = b.units[+el.dataset.u]; startQuiz(u.ids, { unit: u.key }); },
  sknow: el => studyNext(el.dataset.k === '1'),
  sshow: () => { NAV.sheet.show = true; render(); },
  qans: el => quizAnswer(+el.dataset.k),
  qagain: () => startQuiz(NAV.sheet.again, { tag: null, unit: NAV.sheet.unit }),
  screens: () => startScreens(),
  scrans: el => { const s = NAV.sheet; const k = +el.dataset.k; s.sel = k; const q = UI_SCREENS[s.list[s.i]]; const ok = k === q.a; S.scr[s.list[s.i]] = (S.scr[s.list[s.i]] || 0) + (ok ? 1 : 0); if (ok) s.ok++; sfx(ok ? 'pass' : 'fail'); save(); render(); },
  scrnext: () => { const s = NAV.sheet; if (s.i + 1 < s.list.length) { s.i++; s.sel = null; render(); } else { if (s.tag) doneTask(s.tag); NAV.sheet = { v: 'done', title: s.title, msg: ['答對 ' + s.ok + ' / ' + s.list.length, 'မှန် ' + s.ok + ' / ' + s.list.length] }; render(); } },
  studyg: el => { const g = UI_GROUPS.find(x => x.id === el.dataset.id); startStudy(g.ids.map(k => 'u' + k), { title: g.name }); },
  scwords: el => { const sc = TALK.find(x => x.id === el.dataset.id); startStudy(sc.words.map((_, i) => 's' + sc.id + i), { title: sc.name }); },
  tstart: el => startTalk(el.dataset.id),
  tresume: () => { NAV.sheet = { v: 'talk' }; render(); },
  pset: el => { const k = el.dataset.k; S.prSet[k] = k === 'count' || k === 'sec' ? +el.dataset.v : el.dataset.v; save(); render(); },
  pfam: () => { S.prSet.fam = !S.prSet.fam; save(); render(); },
  pstart: () => startPractice(),
  preplay: () => { const s = NAV.sheet; s.replay++; speakSeq(s.cur.audio, 1); },
  pslow: () => { const s = NAV.sheet; s.replay++; speakSeq(s.cur.audio, .8); },
  phint: () => { NAV.sheet.hint = true; render(); },
  pans: el => prSubmit(+el.dataset.k, false),
  pnext: () => prAdvance(),
  pnextsec: () => prNextItem(),
  preason: el => { const s = NAV.sheet.src; s.ans[+el.dataset.i].reason = el.dataset.r; render(); },
  pagain: () => { const s = NAV.sheet.src; startPractice({ skill: s.mode === 'mock' ? 'listening' : s.skill, mode: s.mode, level: s.level, type: s.type, count: s.mode === 'mock' ? 20 : s.count }); },
  pweak: el => startPractice({ skill: el.dataset.s, mode: 'guided', level: 'all', type: el.dataset.t, count: 10 }),
  task: el => runTask(el.dataset.t),
  track: el => { S.track = el.dataset.t; if (S.day) S.day.newIds = trackWords().filter(id => !(S.w[id] && S.w[id].seen)).slice(0, 5); save(); render(); },
  set: el => { const k = el.dataset.k; S.set[k] = !S.set[k]; save(); render(); },
  setv: el => { const k = el.dataset.k; S.set[k] = k === 'rate' ? +el.dataset.v : el.dataset.v; save(); render(); },
  export: () => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    const done = () => toast('備份碼已複製，貼到記事本或傳給自己');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => fallbackCopy(code));
    else fallbackCopy(code);
  },
  importShow: () => { NAV.imp = !NAV.imp; render(); },
  import: () => {
    try { const s = JSON.parse(decodeURIComponent(escape(atob(($('#impBox').value || '').trim())))); if (!s || !s.set || !s.w) throw 0; localStorage.setItem(KEY, JSON.stringify(s)); S = load(); NAV.imp = false; toast('還原好了'); render(); }
    catch (e) { toast('備份碼不對，請整段重新貼上'); }
  },
  reset: () => { if (!NAV.resetArm) { NAV.resetArm = true; render(); return; } S = DEF(); save(); NAV.resetArm = false; toast('已清除'); render(); }
};
['tshow', 'tmode', 'trep', 'tq', 'tqnext', 'tnext', 'trev', 'tsaid', 'tact', 'tactnext'].forEach(a => { ACTS[a] = el => talkAct(a, el.dataset.k); });
function fallbackCopy(code) { NAV.imp = true; render(); const b = $('#impBox'); if (b) { b.value = code; b.select(); } toast('請長按全選，再複製'); }
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const f = ACTS[el.dataset.a]; if (f && el.tagName !== 'SELECT') { e.preventDefault(); f(el, e); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'voiceSel') { S.set.voice = e.target.value; save(); speak('你好，我們開始練習吧。'); }
  if (e.target.id === 'trackSel') { S.track = e.target.value; if (S.day && !S.day.done.new) S.day.newIds = trackWords().filter(id => !(S.w[id] && S.w[id].seen)).slice(0, 5); save(); toast('已更換'); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopAll(); } });
if (TTS.ok && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', () => { if (NAV.tab === 'me' && !NAV.sheet && !NAV.stack.length) render(); });
render();
