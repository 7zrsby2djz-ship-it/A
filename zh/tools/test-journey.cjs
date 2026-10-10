/* Journey/state regression without a browser. DOM and audio are deliberately
   mocked: this verifies behavior and semantic markup, not visual layout or TTS. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const Z = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(Z, f), 'utf8');
const modules = ['readings.gen', 'itemdiff.gen', 'talk_core', 'talk_sbux', 'talk_boba', 'talk_cvs', 'talk_bfast', 'talk_mrt', 'talk_school', 'data_ui', 'exam_core', 'exam_listen', 'exam_read', 'app_core', 'app_words', 'app_talk', 'app_practice', 'app_main'];
const ming = JSON.parse(read('data/mingalar_content.json')); delete ming.readings;
const code = 'const CHIN=' + read('data/chin_words.json') + ';const MING=' + JSON.stringify(ming) + ';\n' + modules.map(f => read('src/' + f + '.js')).join('\n');
function boot(seed) {
  let clock = Date.UTC(2026, 9, 10, 3), id = 0;
  const timers = new Map(), storage = new Map();
  if (seed) storage.set('mingbai-zh-v1', JSON.stringify(seed));
  const el = () => ({ innerHTML: '', textContent: '', dataset: {}, style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, remove() {}, setAttribute() {}, removeAttribute() {}, querySelector: () => null });
  const app = el(), nav = el();
  const document = { body: el(), documentElement: el(), hidden: false, querySelector: s => s === '#app' ? app : s === '#nav' ? nav : null, createElement: el, addEventListener() {} };
  const timeout = (fn, ms = 0, repeat = 0) => { const n = ++id; timers.set(n, { fn, at: clock + ms, repeat }); return n; };
  const advance = ms => {
    const end = clock + ms; let n = 0;
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      assert(++n < 10000, 'timer loop'); clock = next[1].at;
      if (next[1].repeat) next[1].at += next[1].repeat; else timers.delete(next[0]);
      next[1].fn();
    }
    clock = end;
  };
  class Clock extends Date { constructor(...a) { super(...(a.length ? a : [clock])); } static now() { return clock; } }
  class Audio { constructor() { this.paused = true; } play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } }
  const context = { console, Date: Clock, document, Audio, navigator: {}, localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) }, setTimeout: (f, m) => timeout(f, m), clearTimeout: n => timers.delete(n), setInterval: (f, m) => timeout(f, m, m), clearInterval: n => timers.delete(n), requestAnimationFrame: f => timeout(f, 0), matchMedia: () => ({ matches: true }) };
  context.window = { document, matchMedia: context.matchMedia, scrollTo() {} };
  vm.createContext(context); vm.runInContext(code, context, { timeout: 10000 });
  const run = js => vm.runInContext(js, context, { timeout: 10000 });
  run('S.set.auto=false;');
  return { run, advance, app, nav, storage };
}
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
function dialogueStep(b) {
  const type = b.run('curNode().t');
  if (type === 'hear') {
    if (b.run('curNode().q && !S.run.ns.qdone')) {
      b.run("talkAct('tq',curNode().q[S.run.ns.qi].a);"); b.advance(600);
    } else b.run("talkAct('tnext');");
  } else if (type === 'say') b.run("talkAct('trev');talkAct('tsaid');");
  else if (type === 'act') b.run("talkAct('tact',curNode().o.findIndex(o=>o.r==='ok'));talkAct('tactnext');");
  else assert.fail('unexpected dialogue node ' + type);
}
const old = { v: 1, set: { my: false, zy: true, size: 'l', rate: 0.8, voice: 'old-voice', auto: false }, w: { c101: { seen: 17, s: 2, d: 19, star: 1 } }, talk: { sb1a: { best: 'text', n: 1, last: 23 } }, units: { g0u0: 0 }, sessions: [{ total: 5, correct: 3 }], day: { d: '2026-10-10', newIds: ['c102'], rev: [], ui: [], talk: 'sb1a', done: {} } };
check('old save retains vocabulary, zero-score unit and explicit preferences', () => {
  const b = boot(old);
  assert.equal(b.run('S.w.c101.seen'), 17); assert.equal(b.run('S.w.c101.star'), 1);
  assert.equal(b.run('S.units.g0u0'), 0); assert.equal(b.run('S.set.rate'), 0.8);
  assert.equal(b.run('S.set.voice'), 'old-voice'); assert.equal(b.run('S.set.my'), false);
  assert.equal(b.run('S.sessions.length'), 1); assert.equal(b.run('KEY'), 'mingbai-zh-v1');
});
check('daily path exposes real lesson nodes and an accessible current step', () => {
  const b = boot(); const html = b.run('VIEWS.today()');
  assert(html.includes('map-stop')); assert(html.includes('map-node'));
  assert(html.includes('data-a="flowtask"')); assert(html.includes('current'));
  assert.equal((html.match(/data-a="flowtask"/g) || []).length, b.run('daySteps().length'));
  assert(b.nav.innerHTML.includes('data-t="today"'));
});
check('skipping every daily task never writes learning completion', () => {
  const b = boot(); const n = b.run('daySteps().length');
  b.run('ACTS.flowstart();');
  for (let i = 0; i < n; i++) b.run('ACTS.stepskip();');
  assert.equal(b.run('Object.keys(S.day.done).length'), 0);
  assert.equal(b.run('Object.keys(S.day.skip).length'), n);
  assert.equal(b.run('nextStep()'), undefined);
  assert.equal(b.run('Object.keys(S.w).length + Object.keys(S.talk).length + S.sessions.length'), 0);
  assert.equal(b.run('NAV.sheet.v'), 'alldone');
  assert(b.run('SHEETS.alldone()').includes('data-a="retrySkipped"'));
  assert(b.run('VIEWS.today()').includes('skipped'));
  b.run('ACTS.retrySkipped();');
  assert.equal(b.run('Object.keys(S.day.skip).length'), 0);
  assert.equal(b.run('Object.keys(S.day.done).length'), 0);
  assert(b.run('nextStep()'));
});
check('real completion clears a skip and persists on reload', () => {
  const b = boot(); b.run("S.day.skip={talk:1};doneTask('talk');");
  assert.equal(b.run('S.day.done.talk'), 1); assert(!b.run('S.day.skip.talk'));
  const c = boot(JSON.parse(b.storage.get('mingbai-zh-v1')));
  assert.equal(c.run('S.day.done.talk'), 1); assert(!c.run('S.day.skip.talk'));
});
check('daily conversation resumes its unfinished run', () => {
  const b = boot();
  b.run("startTalk(ensureDay().talk,'talk');S.run.help=2;S.run.hist.push({k:'me',zh:'你好'});this.pending=S.run;ACTS.close();runTask('talk');");
  assert(b.run('S.run===pending')); assert.equal(b.run('S.run.help'), 2);
  assert.equal(b.run('S.run.hist.length'), 1); assert.equal(b.run('NAV.sheet.v'), 'talk');
  assert.equal(b.run('S.day.done.talk'), undefined);
});
check('leaving a conversation cancels its pending automatic playback', () => {
  const b = boot();
  b.run("this.played=0;hearPlay=()=>played++;S.set.auto=true;startTalk(TALK[0].vars[0].id);ACTS.close();");
  b.advance(500);
  assert.equal(b.run('played'), 0, 'closed lesson must stay silent');
  assert.equal(b.run('NAV.sheet'), null);
});
check('leaving after a help phrase cancels its deferred reply', () => {
  const b = boot();
  b.run("this.played=0;hearPlay=()=>played++;speak=(text,rate,cb)=>{stopAll();if(cb)cb(true);};startTalk(TALK[0].vars[0].id);talkAct('trep','slow');ACTS.close();");
  b.advance(500);
  assert.equal(b.run('played'), 0, 'help reply must not reopen a closed lesson');
});
check('unit map uses quiz results and treats zero as attempted, not mastery', () => {
  const b = boot();
  b.run("this.unit=BOOKS.find(b=>b.kind==='scene').units[0];this.bk=BOOKS.find(b=>b.kind==='scene');unit.ids.forEach(id=>{ws(id).seen=now();});");
  const before = b.run('VIEWS.book({id:bk.id})');
  assert(before.includes('map-stop')); assert(!b.run('S.units[unit.key]'));
  b.run("startQuiz(unit.ids,{unit:unit.key});NAV.sheet.res=unit.ids.map(id=>({id,ok:false}));quizFinish();");
  assert.equal(b.run('S.units[unit.key]'), 0);
  assert(b.run('VIEWS.book({id:bk.id})').includes('done'));
  b.run("startQuiz(unit.ids,{unit:unit.key});NAV.sheet.res=unit.ids.map(id=>({id,ok:true}));quizFinish();");
  assert.equal(b.run('S.units[unit.key]'), b.run('unit.ids.length'));
  const c = boot(JSON.parse(b.storage.get('mingbai-zh-v1')));
  assert.equal(c.run('S.units[BOOKS.find(b=>b.kind===\'scene\').units[0].key]'), b.run('unit.ids.length'));
});
check('all conversation lesson maps render existing variants', () => {
  const b = boot();
  for (const scene of b.run('TALK.map(sc=>({id:sc.id,n:sc.vars.length}))')) {
    const html = b.run('VIEWS.scene({id:' + JSON.stringify(scene.id) + '})');
    assert(html.includes('map-stop'));
    assert.equal((html.match(/data-a="tstart"/g) || []).length, scene.n);
  }
});
check('all 26 real dialogue variants finish and record actual endings', () => {
  const b = boot(); const vids = b.run('TALK.flatMap(sc=>sc.vars.map(v=>v.id))');
  assert.equal(vids.length, 26);
  for (const vid of vids) {
    b.run('startTalk(' + JSON.stringify(vid) + ');');
    for (let i = 0; i < 200 && !b.run('S.run.end'); i++) dialogueStep(b);
    assert(b.run('S.run.end'), 'stuck ' + vid);
    assert.equal(b.run('S.talk[' + JSON.stringify(vid) + '].n'), 1);
    b.run('ACTS.close();');
  }
  assert.equal(b.run('Object.keys(S.talk).length'), 26);
});
check('complete guided day preserves study, review, quiz, dialogue, screens and listening pipeline', () => {
  const b = boot();
  b.run("this.dueId=BOOKS.find(b=>b.kind==='scene').units[0].ids[0];mark(dueId,true);S.w[dueId].d=now()-1;S.day=null;save();ACTS.flowstart();");
  assert.equal(b.run('daySteps().length'), 5);
  for (let i = 0; i < 300 && b.run('NAV.sheet.v') !== 'alldone'; i++) {
    const sheet = b.run('NAV.sheet.v');
    if (sheet === 'step') b.run('ACTS.stepgo();');
    else if (sheet === 'study') b.run('studyNext(true);');
    else if (sheet === 'quiz') { b.run('quizAnswer(NAV.sheet.qs[NAV.sheet.i].a);'); b.advance(700); }
    else if (sheet === 'talk') { if (b.run('S.run.end')) b.run('ACTS.flownext();'); else dialogueStep(b); }
    else if (sheet === 'screen') b.run("ACTS.scrans({dataset:{k:String(UI_SCREENS[NAV.sheet.list[NAV.sheet.i]].a)}});ACTS.scrnext();");
    else if (sheet === 'pr') {
      if (b.run('NAV.sheet.phase') === 'answer') b.run('prSubmit(NAV.sheet.cur.qs[NAV.sheet.qi].a,false);');
      else if (b.run('NAV.sheet.phase') === 'feedback') b.run('prAdvance();');
      else assert.fail('unexpected practice phase ' + b.run('NAV.sheet.phase'));
    } else if (['qres','done','prres'].includes(sheet)) b.run('ACTS.flownext();');
    else assert.fail('unexpected guided-day sheet ' + sheet);
  }
  assert.equal(b.run('NAV.sheet.v'), 'alldone');
  assert.equal(b.run('Object.keys(S.day.done).sort().join()'), 'listen,new,rev,talk,ui');
  assert.equal(b.run('Object.keys(S.day.skip||{}).length'), 0);
  assert.equal(b.run('Object.keys(S.talk).length'), 1);
  assert.equal(b.run('S.sessions.length'), 1);
  assert.equal(b.run('S.sessions[0].total'), 5); assert.equal(b.run('S.sessions[0].correct'), 5);
  assert(b.run('Object.keys(S.scr).length') > 0);
  assert.equal(b.run('S.run'), null);
});
console.log('Journey regression: ' + checks + ' checks passed (no browser, visual or real-device audio claims).');
