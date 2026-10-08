/* ===== 主程式：首頁（一個大按鈕帶著走）、設定、事件 =====
   介面文字只用緬文（B()／T() 的緬文）；學習內容才是中文。 */
const sv = d => '<svg viewBox="0 0 24 24" class="icon" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const ICON = {
  today: sv('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>'),
  chat: sv('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
  book: sv('<path d="M4 4.5h6a2 2 0 0 1 2 2V20a1.5 1.5 0 0 0-1.5-1.5H4z"/><path d="M20 4.5h-6a2 2 0 0 0-2 2V20a1.5 1.5 0 0 1 1.5-1.5H20z"/>'),
  ear: sv('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="7" rx="1.5"/><rect x="17" y="13" width="4" height="7" rx="1.5"/>'),
  exam: sv('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5v2h6v-2M8.5 10l1.5 1.5 3-3M8.5 15.5h7"/>'),
  me: sv('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 4-5 7-5s5.8 1.4 7 5"/>'),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  sound: sv('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  star: sv('<path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>'),
  x: sv('<path d="M6 6l12 12M18 6 6 18"/>'),
  back: sv('<path d="M15 5l-7 7 7 7"/>'),
  check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  text: sv('<path d="M5 6h14M12 6v13M8.5 19h7"/>'),
  phone: sv('<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 17.5h2"/>'),
  repeat: sv('<path d="M5 12a7 7 0 0 1 12-4.9L19 9M19 4v5h-5M19 12a7 7 0 0 1-12 4.9L5 15M5 20v-5h5"/>'),
  play: sv('<path d="M8 5.5v13l11-6.5z"/>'),
  cup: sv('<path d="M6 8h12l-1.3 11.2a1.5 1.5 0 0 1-1.5 1.3H8.8a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M5 8h14M8 8l.8-3h6.4L16 8M7.5 12.5h9"/>'),
  boba: sv('<path d="M6.5 7h11l-1.6 13H8.1z"/><path d="M12 7l2-4.5M6 7h12"/><circle cx="10" cy="17" r=".9"/><circle cx="13.2" cy="16.2" r=".9"/><circle cx="12" cy="18.6" r=".9"/>'),
  store: sv('<path d="M4 10v10h16V10"/><path d="M3 10l1.5-5h15L21 10z"/><path d="M10 20v-5h4v5"/>'),
  egg: sv('<path d="M6.5 11A3.5 3.5 0 0 1 8 4.5h8a3.5 3.5 0 0 1 1.5 6.5v8.5h-11z"/><path d="M9.5 14.5h5"/>'),
  train: sv('<rect x="6" y="3.5" width="12" height="13" rx="3"/><path d="M6 11h12M9 20l-1.5 1.5M15 20l1.5 1.5M9 16.5 7.5 20M15 16.5l1.5 3.5"/><circle cx="9.5" cy="13.8" r=".6"/><circle cx="14.5" cy="13.8" r=".6"/>'),
  school: sv('<path d="M3 9l9-4.5L21 9l-9 4.5z"/><path d="M7 11v5c1.5 1.3 3.2 2 5 2s3.5-.7 5-2v-5M21 9v5"/>')
};
const TABS = [['today', 'ဒီနေ့', ICON.today], ['talk', 'စကားပြော', ICON.chat], ['words', 'စကားလုံး', ICON.book], ['practice', 'စာမေးပွဲ', ICON.exam]];
/* 小角色「明明」：原創的飯糰，海苔是襯衫藍 */
function MASCOT(mood, size, cls) {
  const eyes = mood === 'happy' || mood === 'cheer'
    ? '<path d="M35 49q5-6 10 0M55 49q5-6 10 0" stroke="#2A2926" stroke-width="3" fill="none" stroke-linecap="round"/>'
    : '<g class="blink"><circle cx="40" cy="49" r="3.8" fill="#2A2926"/><circle cx="60" cy="49" r="3.8" fill="#2A2926"/></g>';
  const mouth = { happy: '<path d="M44 57q6 6 12 0" stroke="#2A2926" stroke-width="2.6" fill="none" stroke-linecap="round"/>', cheer: '<path d="M43 56q7 10 14 0z" fill="#B85C6A" stroke="#2A2926" stroke-width="2" stroke-linejoin="round"/>',
    wow: '<ellipse cx="50" cy="59" rx="4" ry="5" fill="#B85C6A" stroke="#2A2926" stroke-width="2"/>', think: '<path d="M45 59h10" stroke="#2A2926" stroke-width="2.6" stroke-linecap="round"/>' }[mood] || '<path d="M44 57q6 5 12 0" stroke="#2A2926" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
  const extra = mood === 'cheer' ? '<path d="M14 26l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#F6C945"/><path d="M86 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#F4A9B4"/>' : mood === 'think' ? '<circle cx="84" cy="22" r="3" fill="#C9C3B6"/><circle cx="91" cy="12" r="4.5" fill="#C9C3B6"/>' : '';
  return '<svg class="mascot ' + (cls || '') + '" viewBox="0 0 100 100" width="' + (size || 72) + '" height="' + (size || 72) + '" aria-hidden="true">' + extra +
    '<path d="M50 9c8 0 13 5 19 15l20 37c7 13 0 29-16 30H27C11 90 4 74 11 61l20-37C37 14 42 9 50 9z" fill="#FFFDF8" stroke="#2A2926" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M31 70h38v20H31z" fill="#3B5A82"/><path d="M31 70h38" stroke="#2A2926" stroke-width="2.6"/><path d="M31 70v20M69 70v20" stroke="#2A2926" stroke-width="2.6"/>' +
    '<ellipse cx="31" cy="58" rx="5.5" ry="3.4" fill="#F4C7CC"/><ellipse cx="69" cy="58" rx="5.5" ry="3.4" fill="#F4C7CC"/>' + eyes + mouth + '</svg>';
}
function confetti() {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'confetti';
  const cols = ['#3B5A82', '#7FA3CF', '#F4C7CC', '#F6D98B', '#CFE6D3', '#D8C7A3'];
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('i');
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length];
    c.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px'); c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    c.style.animationDuration = (1.4 + Math.random() * 1.2) + 's'; c.style.animationDelay = (Math.random() * .25) + 's';
    if (i % 3 === 0) { c.style.borderRadius = '50%'; c.style.width = c.style.height = '9px'; }
    box.appendChild(c);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 3000);
}
const MYNUM = n => String(n).replace(/\d/g, d => '၀၁၂၃၄၅၆၇၈၉'[d]);

function pageHead(title, my) {
  return '<div class="shead"><button class="ib" data-a="back" aria-label="back">' + ICON.back + '</button><div class="grow"><h1>' + (my ? B(my) : zy(title)) + '</h1></div></div>';
}
function sheetHead(title, i, n) {
  return '<div class="shead"><button class="ib" data-a="close" aria-label="close">' + ICON.x + '</button><span class="grow">' + B(title) + (n ? '　' + MYNUM(i) + ' / ' + MYNUM(n) : '') + '</span></div>' +
    (n ? '<div class="bar" style="margin:-4px 0 16px"><i style="width:' + Math.round((i - 1) / n * 100) + '%"></i></div>' : '');
}
/* 每個練習結束的主要按鈕：在「帶著走」模式是「繼續下一步」 */
function endBtn() {
  return NAV.flow ? '<button class="btn pri block" data-a="flownext">' + B('ဆက်သွားမယ် →') + '</button>' : '<button class="btn pri block" data-a="close">' + B('ပြီးပြီ') + '</button>';
}
SHEETS.done = function (s) {
  return sheetHead(s.title) + '<div class="card endcard">' + MASCOT('happy', 96, 'bob') + '<div style="font-size:1.15rem;margin-top:8px">' + B(s.msg) + '</div></div><div style="margin-top:16px">' + endBtn() + '</div>';
};

/* ---- 每天的計畫 ---- */
const TRACKS = {
  scene: ['နေ့စဉ်နဲ့ အလုပ် အခြေအနေ ၁၅ ခု', () => BOOKS.filter(b => b.kind === 'scene')],
  t1: ['TOCFL အဆင့် ၁（入門）', () => BOOKS.filter(b => b.kind === 'tocfl').slice(0, 1)],
  t2: ['TOCFL အဆင့် ၂（基礎）', () => BOOKS.filter(b => b.kind === 'tocfl').slice(1, 2)],
  ming: ['A1 ～ B2', () => BOOKS.filter(b => b.kind === 'ming')]
};
function trackWords() { const t = TRACKS[S.track] || TRACKS.scene; return t[1]().reduce((a, b) => a.concat(bookIds(b)), []); }
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
/* 今天的步驟（沒有內容的步驟自動略過） */
function daySteps() {
  const day = ensureDay(), tv = findVar(day.talk);
  return [
    { t: 'new', ico: ICON.book, name: 'စကားလုံးအသစ် ' + MYNUM(day.newIds.length) + ' လုံး', d: 'စကားလုံးကို ကြည့်၊ နားထောင်ပြီး ၅ စက္ကန့် စမ်းသပ်မယ်။', on: day.newIds.length > 0 },
    { t: 'rev', ico: ICON.repeat, name: 'ပြန်လေ့ကျင့် ' + MYNUM(day.rev.length) + ' လုံး', d: 'အဓိပ္ပာယ်ကို အရင်တွေး၊ ပြီးမှ အဖြေကြည့်။', on: day.rev.length > 0 },
    { t: 'talk', ico: ICON.chat, name: 'စကားပြော — ' + (tv ? tv.sc.my : ''), d: 'တစ်ဖက်လူ ပြောတာ နားထောင်ပြီး ဘယ်လိုပြန်ပြောမလဲ ရွေး။', on: !!tv },
    { t: 'ui', ico: ICON.phone, name: 'ဖုန်းထဲက စကားလုံး ' + MYNUM(day.ui.length) + ' လုံး', d: 'ဖုန်း/ဝဘ်က ခလုတ်စကားလုံး လေ့လာပြီး ဘယ်ခလုတ်နှိပ်မလဲ ရွေး။', on: day.ui.length > 0 },
    { t: 'listen', ico: ICON.ear, name: 'နားထောင် မေးခွန်း ၅ ခု', d: 'တရုတ်လို နားထောင်ပြီး မေးခွန်းဖြေ။ ထပ်နားထောင်လို့ရတယ်။', on: true }
  ].filter(x => x.on);
}
function nextStep() { const day = ensureDay(); return daySteps().find(x => !day.done[x.t]); }

VIEWS.today = function () {
  const day = ensureDay(), steps = daySteps();
  const doneN = steps.filter(x => day.done[x.t]).length, nx = nextStep();
  const hr = new Date(now() + 8 * 3600e3).getUTCHours();
  const hi = hr < 11 ? 'မင်္ဂလာနံနက်ခင်းပါ' : hr < 18 ? 'မင်္ဂလာနေ့လယ်ခင်းပါ' : 'မင်္ဂလာညနေခင်းပါ';
  const say = !nx ? 'ဒီနေ့ အရမ်းတော်တယ်！' : doneN ? 'ဆက်လုပ်ကြမယ်။ နည်းနည်းပဲ ကျန်တော့တယ်။' : hi + '။ ဒီနေ့လည်း အတူတူ လေ့လာကြမယ်။';
  let h = '<div class="hello-row">' + MASCOT(!nx ? 'cheer' : 'smile', 70, 'bob') + '<div class="bubble grow">' + esc(say) + '</div></div>';
  if (S.run && !S.run.end) {
    h += '<button class="bigcard" style="margin-top:14px" data-a="tresume"><span class="ico">' + ICON.chat + '</span><span class="grow"><span class="t">စကားပြော ဆက်လုပ်မယ်</span><span class="d">' + esc(findVar(S.run.vid) ? findVar(S.run.vid).sc.my : '') + '</span></span></button>';
  }
  const ring = '<span class="ring">' + steps.map(x => '<i class="' + (day.done[x.t] ? 'on' : '') + '"></i>').join('') + '</span>';
  if (nx) {
    h += '<button class="hero" data-a="flowstart"><span class="big">' + (doneN ? 'ဆက်လုပ်မယ်' : 'စမယ်') + '</span><span class="sub">' + esc(doneN ? 'ပြီးပြီ ' + MYNUM(doneN) + ' / ' + MYNUM(steps.length) + '・နောက်တစ်ခု：' + nx.name : 'ဒီနေ့ ၁၅ မိနစ်လောက်・အဆင့် ' + MYNUM(steps.length) + ' ခု') + '</span>' + ring + '</button>';
  } else {
    h += '<div class="hero done"><span class="big">ဒီနေ့ ပြီးပါပြီ ✓</span><span class="sub">အရမ်းတော်တယ်။ မနက်ဖြန် ပြန်တွေ့မယ်။</span>' + ring + '</div>' +
      '<button class="btn block" style="margin-top:12px" data-a="extra">' + B('နောက်ထပ် စကားပြော လေ့ကျင့်မယ်') + '</button>';
  }
  h += '<div class="list steps">';
  steps.forEach((x, i) => {
    const dn = day.done[x.t];
    h += '<button class="step' + (dn ? ' done' : '') + (nx && nx.t === x.t ? ' now' : '') + '" data-a="task" data-t="' + x.t + '"><span class="ck">' + (dn ? '✓' : MYNUM(i + 1)) + '</span><span class="grow">' + B(x.name) + '</span></button>';
  });
  h += '</div>';
  return h;
};
function runTask(t) {
  const day = ensureDay();
  if (t === 'new') startStudy(day.newIds, { then: 'quiz', tag: 'new', title: 'စကားလုံးအသစ်' });
  else if (t === 'rev') startStudy(day.rev, { recall: true, tag: 'rev', title: 'ပြန်လေ့ကျင့်' });
  else if (t === 'talk') startTalk(day.talk, 'talk');
  else if (t === 'ui') startStudy(day.ui, { then: 'screens', tag: null, title: 'ဖုန်းထဲက စကားလုံး' });
  else if (t === 'listen') startPractice({ skill: 'listening', mode: 'guided', count: 5, level: 'all', type: 'all', tag: 'listen' });
}
/* 步驟介紹畫面 */
SHEETS.step = function (s) {
  const steps = daySteps(), i = steps.findIndex(x => x.t === s.t), x = steps[i];
  return '<div class="shead"><button class="ib" data-a="close" aria-label="close">' + ICON.x + '</button><span class="grow"></span></div>' +
    '<div class="intro fade"><div class="num">' + esc('အဆင့် ' + MYNUM(i + 1) + ' / ' + MYNUM(steps.length)) + '</div><div class="ico">' + x.ico + '</div><h1>' + esc(x.name) + '</h1><p>' + esc(x.d) + '</p></div>' +
    '<button class="btn pri block" style="margin-top:22px;min-height:66px;font-size:1.2rem" data-a="stepgo">' + B('စမယ်') + '</button>' +
    '<button class="linkbtn" data-a="stepskip">' + esc('ဒါကို ကျော်မယ်') + '</button>';
};
SHEETS.alldone = function () {
  return '<div class="shead"><button class="ib" data-a="close" aria-label="close">' + ICON.x + '</button><span class="grow"></span></div><div class="intro fade">' + MASCOT('cheer', 130, 'bob') + '<h1>ဒီနေ့ ပြီးပါပြီ</h1><p>အရမ်းတော်တယ်။ နေ့တိုင်း နည်းနည်းစီ လုပ်ရင် တိုးတက်မယ်။</p></div><button class="btn pri block" style="margin-top:22px" data-a="close">' + B('ပင်မစာမျက်နှာ') + '</button>';
};
function flowNext() {
  stopAll();
  if (S.run && S.run.end) { S.run = null; save(); }
  const nx = nextStep();
  NAV.sheet = nx ? { v: 'step', t: nx.t } : { v: 'alldone' };
  if (!nx) NAV.flow = false;
  render();
}

/* ---- 設定與紀錄（右上角齒輪） ---- */
VIEWS.me = function () {
  const set = S.set;
  let h = pageHead('', 'ဆက်တင်');
  const sw = (k, my) => '<button class="set" style="width:100%;text-align:left" data-a="set" data-k="' + k + '"><span class="setlbl">' + esc(my) + '</span><span class="sw' + (set[k] ? ' on' : '') + '"></span></button>';
  const sg = (k, my, opts) => '<div class="set" style="flex-direction:column;align-items:stretch;gap:8px"><span class="setlbl">' + esc(my) + '</span><div class="seg">' + opts.map(o => '<button class="' + (String(set[k]) === String(o[0]) ? 'on' : '') + '" data-a="setv" data-k="' + k + '" data-v="' + o[0] + '">' + B(o[1]) + '</button>').join('') + '</div></div>';
  h += '<div class="list">';
  h += sg('size', 'စာလုံးအရွယ်', [['s', 'အသေး'], ['m', 'အလတ်'], ['l', 'အကြီး']]);
  h += sw('my', 'မြန်မာ ဘာသာပြန် ပြမယ်') + sw('zy', 'ဇူယင်（ㄅㄆㄇ）ပြမယ်') + sw('auto', 'အသံ အလိုအလျောက် ဖွင့်မယ်');
  h += sg('rate', 'စကားပြော အမြန်နှုန်း', [['0.8', 'နှေး'], ['1', 'ပုံမှန်'], ['1.15', 'မြန်']]);
  h += sg('theme', 'အရောင်', [['auto', 'အလိုအလျောက်'], ['light', 'အဖြူ'], ['dark', 'အမည်း']]);
  const vs = TTS.voices;
  h += '<div class="set" style="flex-direction:column;align-items:stretch;gap:8px"><span class="setlbl">တရုတ် အသံ</span><span class="row"><select class="sel grow" style="max-width:none" id="voiceSel"><option value="">' + esc('အလိုအလျောက်（ထိုင်ဝမ်）') + '</option>' + vs.map(v => '<option value="' + esc(v.voiceURI) + '"' + (v.voiceURI === set.voice ? ' selected' : '') + '>' + esc(v.name + ' ' + v.lang) + '</option>').join('') + '</select><button class="ib" data-a="say" data-t="你好，我們開始練習吧。">' + ICON.sound + '</button></span></div>';
  h += '<div class="set" style="flex-direction:column;align-items:stretch;gap:8px"><span class="setlbl">နေ့စဉ် စကားလုံးအသစ် ဘယ်ကယူမလဲ</span><select class="sel" style="max-width:none" id="trackSel">' + Object.keys(TRACKS).map(k => '<option value="' + k + '"' + ((S.track || 'scene') === k ? ' selected' : '') + '>' + esc(TRACKS[k][0]) + '</option>').join('') + '</select></div>';
  h += '</div>';
  if (!TTS.ok || !vs.length) h += '<p class="small muted" style="margin:10px 4px;font-family:var(--my)">' + esc('ဒီဖုန်းမှာ တရုတ်အသံ မတွေ့ဘူး။ iPhone：Settings → Accessibility → Spoken Content → Voices → Chinese (Taiwan)။') + '</p>';
  // 紀錄
  const learned = Object.keys(S.w).filter(id => S.w[id].seen && WORDS[id]);
  const solid = learned.filter(id => S.w[id].s >= 3).length;
  const talkN = TALK.reduce((t, sc) => t + sc.vars.length, 0);
  h += '<div class="sec"><h2>' + B('မှတ်တမ်း') + '</h2></div><div class="stat"><div><b>' + learned.length + '</b><span class="ui">သင်ပြီး</span></div><div><b>' + solid + '</b><span class="ui">ကျွမ်းလာ</span></div><div><b>' + Object.keys(S.talk).length + '/' + talkN + '</b><span class="ui">စကားပြော</span></div></div>';
  const days = []; for (let i = 6; i >= 0; i--) days.push(today(now() - i * 86400e3));
  h += '<div class="card row" style="justify-content:space-between;margin-top:10px">' + days.map(d => { const on = S.log[d]; return '<div style="width:30px;height:30px;border-radius:50%;border:1.5px solid ' + (on ? 'var(--blue)' : 'var(--line2)') + ';background:' + (on ? 'var(--blue-soft)' : 'transparent') + '"></div>'; }).join('') + '</div>';
  // 備份
  h += '<div class="sec"><h2>' + B('Backup') + '</h2></div><div class="card"><p class="small" style="margin:0;font-family:var(--my);line-height:1.9">' + esc('မှတ်တမ်းက ဒီဖုန်းထဲမှာပဲ ရှိတယ်။ ဖုန်းမပြောင်းခင် ကုဒ်ကို ကူးထားပါ။') + '</p>' +
    '<div class="btns two" style="margin-top:10px"><button class="btn sm" data-a="export">' + B('ကုဒ်ကူးမယ်') + '</button><button class="btn sm" data-a="importShow">' + B('ကုဒ်ထည့်မယ်') + '</button></div>' +
    (NAV.imp ? '<textarea class="code" id="impBox"></textarea><button class="btn pri block" style="margin-top:8px" data-a="import">' + B('ပြန်ထည့်မယ်') + '</button>' : '') + '</div>';
  // 關於
  h += '<details class="more"><summary>' + esc('ဒီ App အကြောင်း ›') + '</summary><div class="card small stack" style="line-height:1.8">' +
    '<div class="ui">明白（နားလည်ပြီ）— မင်းအတွက်ပဲ လုပ်ထားတဲ့ တရုတ်စာ App။ မြန်မာဘာသာပြန်တွေမှာ မှားနေတာတွေ့ရင် ပြောပါ။</div>' +
    '<div class="tiny">' + esc('單字、例句、緬文翻譯、單字錄音、音效：Work Chinese／Chin Chin Chinese（Myanmar Edition），YUNG-TSAI LAI、ChinQing in Taiwan，CC BY-NC-ND 4.0，原樣使用、未修改、非商業。') + ' <a href="https://github.com/lai2570/Burmese_language_app" target="_blank" rel="noopener" style="color:var(--blue)">GitHub</a></div>' +
    '<div class="tiny">' + esc('短文題、明朗中文 96 詞：明朗中文。TOCFL 型題目、生活對話、介面字：本 App 新寫。句子聲音是手機內建語音。') + '</div></div></details>';
  h += '<button class="btn ghost block" style="margin-top:12px;color:var(--bad)" data-a="reset">' + B(NAV.resetArm ? 'ထပ်နှိပ်ရင် မှတ်တမ်းအားလုံး ပျက်မယ်' : 'မှတ်တမ်းအားလုံး ဖျက်မယ်') + '</button>';
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
    h = (top ? '' : '<header class="top"><div class="brand"><b>' + zy('明白') + '</b></div><button class="gear" data-a="go" data-v="me" aria-label="settings">' + ICON.gear + '</button></header>') +
      (top ? VIEWS[top.v](top) : VIEWS[NAV.tab]());
  }
  const key0 = sh ? (sh.v === 'pr' ? 'pr:' + (sh.cur ? sh.cur.id : sh.phase) + ':' + sh.qi : sh.v + ':' + (sh.i != null ? sh.i : '') + ':' + (sh.t || '')) : 'p:' + NAV.tab + ':' + NAV.stack.length + ':' + (NAV.stack.length ? JSON.stringify(NAV.stack[NAV.stack.length - 1]) : '');
  let anim = '';
  if (key0 !== lastKey) anim = NAV.dir ? 'enter-' + NAV.dir : (sh && lastKey.split(':')[0] === sh.v ? 'enter-next' : 'enter-fwd');
  NAV.dir = null;
  $('#app').innerHTML = '<main class="' + (sh ? 'sheet' : 'page') + ' ' + anim + '">' + h + '</main>';
  if (sh && !sh._cele) {
    const win = sh.v === 'alldone' || sh.v === 'done' || (sh.v === 'qres' && sh.res.every(r => r.ok)) || (sh.v === 'prres' && sh.src.ans.length && sh.src.ans.filter(a => a.ok).length / sh.src.ans.length >= .8) || (sh.v === 'talk' && S.run && S.run.end);
    if (win) { sh._cele = true; setTimeout(confetti, 120); }
  }
  $('#nav').innerHTML = '<div class="nav-in">' + TABS.map(t => '<button class="' + (NAV.tab === t[0] ? 'on' : '') + '" data-a="tab" data-t="' + t[0] + '">' + t[2] + '<span class="lbl" lang="my">' + esc(t[1]) + '</span></button>').join('') + '</div>';
  const key = key0;
  if (key !== lastKey && !(sh && sh.v === 'talk')) window.scrollTo(0, 0);
  if (sh && sh.v === 'talk' && !lastKey.startsWith('talk')) window.scrollTo(0, 0);
  lastKey = key;
}

/* ---- 事件 ---- */
const ACTS = {
  tab: el => { stopAll(); NAV.dir = 'tab'; NAV.tab = el.dataset.t; NAV.stack = []; NAV.resetArm = false; render(); },
  go: el => { stopAll(); NAV.stack.push({ v: el.dataset.v, id: el.dataset.id, u: el.dataset.u != null ? +el.dataset.u : null }); render(); },
  back: () => { stopAll(); NAV.dir = 'back'; NAV.stack.pop(); render(); },
  close: () => { stopAll(); NAV.dir = 'back'; const s = NAV.sheet; if (s) { clearTimeout(s.timer); clearInterval(s.tick); } NAV.sheet = null; NAV.flow = false; if (S.run && S.run.end) { S.run = null; save(); } render(); },
  flowstart: () => { NAV.flow = true; const nx = nextStep(); if (nx) { NAV.sheet = { v: 'step', t: nx.t }; render(); } },
  flownext: () => { const s = NAV.sheet; if (s) { clearTimeout(s.timer); clearInterval(s.tick); } flowNext(); },
  stepgo: () => runTask(NAV.sheet.t),
  stepskip: () => { doneTask(NAV.sheet.t); flowNext(); },
  extra: () => { const tv = recommendVar(); startTalk(tv); },
  wtab: el => { NAV.wtab = el.dataset.t; render(); },
  nf: el => { NAV.nf = el.dataset.f; render(); },
  reveal: el => { const w = el.closest('.myw'); if (w) w.classList.add('force'); },
  star: el => { const st = ws(el.dataset.id); st.star = st.star ? 0 : 1; if (st.star && !st.seen) { st.seen = now(); st.d = now(); } save(); el.classList.toggle('on', !!st.star); toast(st.star ? 'စကားလုံးစာအုပ်ထဲ ထည့်ပြီး ☆' : 'စာအုပ်ထဲက ဖယ်ပြီး'); },
  starall: () => { NAV.sheet.res.filter(r => !r.ok).forEach(r => { ws(r.id).star = 1; }); save(); toast('စကားလုံးစာအုပ်ထဲ ထည့်ပြီး ☆'); render(); },
  playw: el => { const b = el; b.classList.add('busy'); playWord(WORDS[el.dataset.id], () => b.classList.remove('busy')); },
  say: el => { speak(el.dataset.t, 1); },
  study: el => { const b = book(el.dataset.b), u = b.units[+el.dataset.u]; startStudy(u.ids, { then: 'quiz', unit: u.key, title: unitName(b, u) }); },
  quiz: el => { const b = book(el.dataset.b), u = b.units[+el.dataset.u]; startQuiz(u.ids, { unit: u.key }); },
  nstudy: () => { const all = Object.keys(S.w).filter(id => S.w[id].star && WORDS[id]); const d = all.filter(due); startStudy((d.length ? d : all).slice(0, 20), { recall: true, title: 'စကားလုံးစာအုပ်' }); },
  nquiz: () => { const all = Object.keys(S.w).filter(id => S.w[id].star && WORDS[id]); startQuiz(shuffle(all).slice(0, 10)); },
  sknow: el => studyNext(el.dataset.k === '1'),
  sshow: () => { NAV.sheet.show = true; render(); },
  qans: el => quizAnswer(+el.dataset.k),
  qagain: () => startQuiz(NAV.sheet.again, { tag: null, unit: NAV.sheet.unit }),
  screens: () => startScreens(),
  scrans: el => { const s = NAV.sheet; const k = +el.dataset.k; s.sel = k; const q = UI_SCREENS[s.list[s.i]]; const ok = k === q.a; S.scr[s.list[s.i]] = (S.scr[s.list[s.i]] || 0) + (ok ? 1 : 0); if (ok) s.ok++; sfx(ok ? 'pass' : 'fail'); save(); render(); },
  scrnext: () => { const s = NAV.sheet; if (s.i + 1 < s.list.length) { s.i++; s.sel = null; render(); } else { if (s.tag) doneTask(s.tag); NAV.sheet = { v: 'done', title: s.title, msg: 'မှန် ' + MYNUM(s.ok) + ' / ' + MYNUM(s.list.length) }; render(); } },
  studyg: el => { const g = UI_GROUPS.find(x => x.id === el.dataset.id); startStudy(g.ids.map(k => 'u' + k), { title: 'App စကားလုံး' }); },
  scwords: el => { const sc = TALK.find(x => x.id === el.dataset.id); startStudy(sc.words.map((_, i) => 's' + sc.id + i), { title: sc.my }); },
  tstart: el => startTalk(el.dataset.id),
  tresume: () => { NAV.sheet = { v: 'talk' }; render(); },
  pset: el => { const k = el.dataset.k; S.prSet[k] = k === 'count' || k === 'sec' ? +el.dataset.v : el.dataset.v; save(); render(); },
  pfam: () => { S.prSet.fam = !S.prSet.fam; save(); render(); },
  pstart: () => startPractice(),
  pquick: el => startPractice({ skill: el.dataset.s, mode: el.dataset.m, level: 'all', type: 'all', count: +el.dataset.n }),
  preplay: () => { const s = NAV.sheet; s.replay++; speakSeq(s.cur.audio, 1); },
  pslow: () => { const s = NAV.sheet; s.replay++; speakSeq(s.cur.audio, .8); },
  phint: () => { NAV.sheet.hint = true; render(); },
  pans: el => prSubmit(+el.dataset.k, false),
  pnext: () => prAdvance(),
  pnextsec: () => prNextItem(),
  preason: el => { const s = NAV.sheet.src; s.ans[+el.dataset.i].reason = el.dataset.r; render(); },
  pagain: () => { const s = NAV.sheet.src; startPractice({ skill: s.mode === 'mock' ? 'listening' : s.skill, mode: s.mode, level: s.level, type: s.type, count: s.mode === 'mock' ? 20 : s.count }); },
  pweak: el => startPractice({ skill: el.dataset.s, mode: 'guided', level: 'all', type: el.dataset.t, count: 10 }),
  pweaksk: el => startPractice({ skill: S.prSet.skill, mode: 'guided', level: 'all', type: 'all', count: 10, sk: el.dataset.k }),
  task: el => { NAV.flow = false; runTask(el.dataset.t); },
  set: el => { const k = el.dataset.k; S.set[k] = !S.set[k]; save(); render(); },
  setv: el => { const k = el.dataset.k; S.set[k] = k === 'rate' ? +el.dataset.v : el.dataset.v; save(); render(); },
  export: () => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    const done = () => toast('ကုဒ် ကူးပြီးပြီ။ Notes ထဲ ကပ်ထားပါ။');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => fallbackCopy(code));
    else fallbackCopy(code);
  },
  importShow: () => { NAV.imp = !NAV.imp; render(); },
  import: () => {
    try { const s = JSON.parse(decodeURIComponent(escape(atob(($('#impBox').value || '').trim())))); if (!s || !s.set || !s.w) throw 0; localStorage.setItem(KEY, JSON.stringify(s)); S = load(); NAV.imp = false; toast('ပြန်ထည့်ပြီးပြီ'); render(); }
    catch (e) { toast('ကုဒ် မမှန်ဘူး။ အကုန် ပြန်ကပ်ပါ။'); }
  },
  reset: () => { if (!NAV.resetArm) { NAV.resetArm = true; render(); return; } S = DEF(); save(); NAV.resetArm = false; toast('ဖျက်ပြီးပြီ'); render(); }
};
['tshow', 'tmode', 'trep', 'tq', 'tqnext', 'tnext', 'trev', 'tsaid', 'tact', 'tactnext'].forEach(a => { ACTS[a] = el => talkAct(a, el.dataset.k); });
function fallbackCopy(code) { NAV.imp = true; render(); const b = $('#impBox'); if (b) { b.value = code; b.select(); } toast('ဖိထားပြီး Select All → Copy'); }
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const f = ACTS[el.dataset.a]; if (f && el.tagName !== 'SELECT') { e.preventDefault(); f(el, e); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'voiceSel') { S.set.voice = e.target.value; save(); speak('你好，我們開始練習吧。'); }
  if (e.target.id === 'trackSel') { S.track = e.target.value; if (S.day && !S.day.done.new) S.day.newIds = trackWords().filter(id => !(S.w[id] && S.w[id].seen)).slice(0, 5); save(); toast('ပြောင်းပြီးပြီ'); }
});
document.addEventListener('toggle', e => { if (e.target.id === 'prmore') NAV.prMore = e.target.open; }, true);
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopAll(); } });
if (TTS.ok && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', () => { if (NAV.stack.length && NAV.stack[NAV.stack.length - 1].v === 'me' && !NAV.sheet) render(); });
render();
