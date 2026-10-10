/* Voice regression checks without a browser: pacing, cancellation and exam callbacks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let clock = 0, timerId = 0, timers = new Map(), utterances = [], audio, cancelOnEnd = false, autoStart = true;
const audioPlays = [];
const voices = [
  { name: 'Mainland', lang: 'zh-CN', voiceURI: 'cn' },
  { name: 'Taiwan', lang: 'cmn-Hant-TW', voiceURI: 'tw' }
];
const synth = { speaking: false, getVoices: () => voices, addEventListener() {}, resume() {},
  cancel() { this.speaking = false; if (cancelOnEnd && utterances.length) utterances.at(-1).onend(); },
  speak(u) { this.speaking = autoStart; utterances.push(u); if (autoStart) u.onstart(); }
};
const ctx = vm.createContext({
  window: { speechSynthesis: synth }, speechSynthesis: synth,
  SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
  Audio: class { constructor(src) { audio = this; this.src = src; this.playbackRate = 1; this.paused = true; }
    play() { this.paused = false; audioPlays.push(this.src); return Promise.resolve(); }
    pause() { this.paused = true; }
  },
  localStorage: { getItem() { return null; }, setItem() {} }, document: {},
  setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, due: clock + delay }); return id; },
  clearTimeout(id) { timers.delete(id); }
});
const source = fs.readFileSync(path.join(__dirname, '../src/app_core.js'), 'utf8').split('/* ---- 資料 ---- */')[0];
vm.runInContext(source, ctx);
const run = code => vm.runInContext(code, ctx);
function tick(ms) {
  const end = clock + ms;
  for (;;) {
    const next = [...timers].sort((a, b) => a[1].due - b[1].due)[0];
    if (!next || next[1].due > end) break;
    clock = next[1].due; timers.delete(next[0]); next[1].fn();
  }
  clock = end;
}
function end() { synth.speaking = false; utterances.at(-1).onend(); }
function reset() { run('stopAll()'); utterances = []; }

run('globalThis.finished = []; speak("你好，請問要喝什麼？我們慢慢說。", 1, ok => finished.push(ok))');
assert.equal(utterances[0].voice.voiceURI, 'tw', 'Mandarin Hant-TW voice selected');
assert.equal(utterances[0].rate, .88, 'natural dialogue is slower than the system default');
assert.equal(utterances[0].text, '你好，');
end(); tick(139); assert.equal(utterances.length, 1, 'comma breathing space');
tick(1); assert.equal(utterances[1].text, '請問要喝什麼？');
assert.equal(run('finished.length'), 0, 'one callback for the whole phrase');
end(); tick(299); assert.equal(utterances.length, 2, 'sentence breathing space');
tick(1); assert.equal(utterances[2].text, '我們慢慢說。');
end(); assert.equal(run('finished.join()'), 'true');
end(); assert.equal(run('finished.length'), 1, 'repeated end events do not finish twice');

reset(); run('speak("慢慢說。", .7)');
assert(Math.abs(utterances[0].rate - .616) < 1e-9, 'slow replay scales the conversational baseline');
reset(); run('S.set.rate = .8; S.set.voice = "cn"; speak("自選聲音。", 1)');
assert.equal(utterances[0].voice.voiceURI, 'cn', 'saved user voice choice wins');
assert(Math.abs(utterances[0].rate - .704) < 1e-9, 'existing speed preference preserved as a multiplier');
run('S.set.rate = 1; S.set.voice = ""');

reset(); run('finished = []; speak("第一句，第二句。", 1, ok => finished.push(ok))');
end(); run('stopAll()'); tick(1000);
assert.equal(utterances.length, 1, 'navigation cancels pending phrase');
assert.equal(run('finished.length'), 0, 'cancelled phrase cannot finish a new page');
reset(); run('speak("舊聲音。", 1, () => finished.push("old"))');
const stale = utterances[0]; run('speak("新聲音。", 1)'); stale.onend(); stale.onerror();
assert.equal(run('finished.length'), 0, 'stale synth events ignored');

reset(); run('finished = []; speakSeq([["男", "第一句，保持完整。"], ["女", "第二句。"]], 1, ok => finished.push(ok))');
assert.equal(utterances[0].rate, 1, 'exam keeps its original rate');
assert.equal(utterances[0].text, '第一句，保持完整。', 'exam utterance is not split');
end(); tick(380); assert.equal(utterances.length, 2);
assert.equal(run('finished.length'), 0, 'exam cannot start answer timing before playback finishes');
end(); tick(380); assert.equal(run('finished.join()'), 'true');
reset(); run('finished = []; speakSeq([["男", "第一句。"], ["女", "第二句。"]], 1, ok => finished.push(ok))');
end(); run('stopAll()'); tick(1000);
assert.equal(utterances.length, 1, 'navigation cancels pending exam speaker');
assert.equal(run('finished.length'), 0);

reset(); run('finished = []; speak("發生錯誤，停止播報。", 1, ok => finished.push(ok))');
utterances[0].onerror(); tick(1000);
assert.equal(utterances.length, 1, 'failed phrase does not continue');
assert.equal(run('finished.join()'), 'false');
reset(); run('finished = []; speak("卡住的語音。", 1, ok => finished.push(ok))');
tick(16000); assert.equal(run('finished.join()'), 'false', 'watchdog never reports stuck playback as a successful exam');
reset(); cancelOnEnd = true;
run('finished = []; speak("取消時發出結束事件。", 1, ok => finished.push(ok))');
tick(25000);
assert.equal(run('finished.join()'), 'false', 'synchronous cancel end event cannot turn watchdog failure into success');
reset(); autoStart = false;
run('finished = []; speak("沒有啟動的語音。", 1, ok => finished.push(ok))');
tick(8000); assert.equal(run('finished.join()'), 'false', 'startup timeout also ignores synchronous cancel end events');
autoStart = true; reset();
run('finished = []; speak("停滯的第一句。", 1, ok => { finished.push(ok); speak("切換到新的句子。", 1); })');
tick(16000);
assert.equal(run('finished.join()'), 'false');
assert.equal(utterances.at(-1).text, '切換到新的句子。');
assert.equal(synth.speaking, true, 'watchdog cancels before callback so a new speech request survives');
cancelOnEnd = false;

reset(); audioPlays.length = 0;
run('sfx("pass")'); assert.equal(audioPlays.length, 0, 'missing inline asset fails silently without a network request');
run('globalThis.SFX_DATA = { confirmation_001: "data:audio/mpeg;base64,test-pass", select_001: "data:audio/mpeg;base64,test-click" }; sfx("pass")');
assert.equal(audioPlays[0], 'data:audio/mpeg;base64,test-pass', 'selected Kenney asset is used directly');
assert.equal(audio.volume, .32, 'confirmation sound stays quiet');
const passAudio = audio;
run('speak("先聽，然後回答。", 1)');
assert.equal(passAudio.paused, true, 'speech stops a sound effect already playing');
const before = audioPlays.length;
run('sfx("click")'); assert.equal(audioPlays.length, before, 'no sound effects over spoken audio');
end(); run('sfx("click")'); assert.equal(audioPlays.length, before, 'no sound effects in a conversational breathing pause');
tick(140); end(); run('sfx("click")');
assert.equal(audioPlays.at(-1), 'data:audio/mpeg;base64,test-click', 'sound effects resume after the whole dialogue');
const enabledCount = audioPlays.length;
run('S.set.sfx = false; sfx("pass")');
assert.equal(audioPlays.length, enabledCount, 'sound preference disables playback');
run('S.set.sfx = true');

reset(); run('playWord({zh:"學校", au:"school.mp3"})');
assert.equal(audio.playbackRate, 1, 'recorded word audio is unchanged');
assert.equal(utterances.length, 0);
assert.equal(audio.src, 'audio/school.mp3');
const recordedCount = audioPlays.length;
run('sfx("pass")'); assert.equal(audioPlays.length, recordedCount, 'no effects over recorded word audio');
run('stopAll()'); assert.equal(audio.paused, true, 'navigation stops recorded word audio');
console.log('PASS: Mandarin pacing, voice preferences, cancellation, exam timing, recorded audio and inline sound suppression');
