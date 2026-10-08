/* ===== 生活對話教材格式 =====
   SCENE({id, name, my, place, goal, goalMy, words:[[中文, 緬文, 補充?]], axis:{1:[中,緬],2:..,3:..}})
   V(scene, 級, id, {who, tr?, setup, setupMy}, [節點...])
   節點（照順序走；選項有 go 就跳到該 id）：
     H(中文, 緬文, {easy, easyMy, bc, q:[Q..], learn:[中,緬], who})   對方說話（bc=廣播，只能重播／放慢）
     SAY(要表達的意思, 緬文, [[積木,緬文]...], 參考答案, 緬文, {alt:[其他說法]})   你先開口
     ACT(題目, 緬文, [O(...)...])   你怎麼接
     O(中文, 緬文, 判定 ok|part|bad, 說明, 說明緬文, go?)   判定：ok 可以繼續／part 需要補充／bad 會出錯
     END(結果, 緬文, res)   res：ok／late（出錯後補救）
   Q(問題, 緬文, [[中,緬],[中,緬],[中,緬]], 正確答案位置=0)   選項執行時會打亂
*/
const TALK = [];
function SCENE(o) { o.vars = []; TALK.push(o); return o; }
function H(zh, my, o) { return Object.assign({ t: 'hear', zh: zh, my: my }, o || {}); }
function Q(q, qMy, o, a) { return { q: q, qMy: qMy, o: o, a: a || 0 }; }
function SAY(intent, intentMy, skel, ans, ansMy, o) { return Object.assign({ t: 'say', intent: intent, intentMy: intentMy, skel: skel, ans: ans, ansMy: ansMy }, o || {}); }
function ACT(q, qMy, o) { return { t: 'act', q: q, qMy: qMy, o: o }; }
function O(zh, my, r, why, whyMy, go) { return { zh: zh, my: my, r: r, why: why, whyMy: whyMy, go: go || null }; }
function END(text, textMy, res) { return { t: 'end', text: text, textMy: textMy, res: res || 'ok' }; }
function V(sc, lv, id, meta, nodes) { sc.vars.push(Object.assign({ id: id, lv: lv, nodes: nodes }, meta)); }

/* 常用的「求助」說法：對話畫面的按鈕就是這幾句，按了也等於練習開口。 */
const REPAIR = {
  again: ['不好意思，可以再說一次嗎？', 'တစ်ခါလောက် ထပ်ပြောပေးလို့ရမလား။'],
  slow: ['可以說慢一點嗎？', 'နည်းနည်း ဖြည်းဖြည်းပြောပေးလို့ရမလား။'],
  easy: ['可以說簡單一點嗎？', 'နည်းနည်း လွယ်လွယ်ပြောပေးလို့ရမလား။']
};
