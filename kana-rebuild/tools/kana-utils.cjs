const SMALL = new Set(Array.from('ぁぃぅぇぉゃゅょゎゕゖ'));
const BASIC = new Set(Array.from('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'));
const RUBY = /\{([^|{}]+)\|([^|{}]+)\}/g;
function toHiragana(value) {
  return String(value).normalize('NFKC').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
function plain(value) { return String(value).replace(RUBY, '$1').normalize('NFKC'); }
function rubyReading(value) { return String(value).replace(RUBY, '$2').normalize('NFKC'); }
function analyzeReading(value) {
  const normalized = String(value).normalize('NFKC').trim();
  const readingHiragana = toHiragana(normalized);
  const chars = Array.from(readingHiragana);
  const offset = chars.findIndex(c => !/[\s。、，,.!?！？「」『』（）()…〜～・]/u.test(c));
  const c = offset < 0 ? '' : chars[offset];
  const firstKana = /^[ぁ-ゖ]$/u.test(c) ? c : null;
  const firstMora = firstKana ? firstKana + (SMALL.has(chars[offset + 1]) ? chars[offset + 1] : '') : null;
  const flags = {
    hasVoicing:/[がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゔ]/u.test(readingHiragana),
    hasSmall:/[ぁぃぅぇぉゃゅょゎゕゖっ]/u.test(readingHiragana),
    hasLongMark:normalized.includes('ー'), hasDigits:/[0-9]/u.test(normalized),
    hasUnresolved:/[\p{Script=Han}\p{Script=Latin}{}|［］\[\]〇○]/u.test(normalized),
  };
  const readable = !!firstKana && !flags.hasDigits && !flags.hasUnresolved;
  return {readingHiragana, firstKana, firstMora, headOffset:offset, flags, readable,
    basicHeadEligible:readable && BASIC.has(firstKana) && firstMora === firstKana && !['を','ん'].includes(firstKana)};
}
function findKanaSpan(reading, target) {
  const chars = Array.from(toHiragana(reading));
  const start = chars.indexOf(target);
  if (start < 0) throw Error(`Missing ${target} in ${reading}`);
  return {start, end:start + 1}; // Unicode code-point offsets in NFKC-normalized displayed reading.
}
module.exports = {toHiragana, plain, rubyReading, analyzeReading, findKanaSpan, BASIC};
