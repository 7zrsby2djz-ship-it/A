/* ===== TOCFL 型題庫（本 App 新寫；A2+～B1 為主） =====
   照華語文能力測驗 Band A/B 的題型：
     聽力  dlg  短對話＋一題　　　　 mono 獨白或長對話＋2～3 題（題組）
     閱讀  cloze 選詞填空（一句）　　para 段落填空（一段 3 空）　　text 實用文本／短文＋2～3 題
   難度 lv：A2、A2+、B1-、B1、B1+（CAT 會換成數字難度）
   聽力 audio：[[說話的人, 句子], ...]，說話的人：男／女／廣播／老師…（男、女用不同音高）
   閱讀 text：文字；空格寫成「＿＿」（cloze）或「（1）（2）（3）」（para）
   每題 QQ(問題, 緬文, [[選項,緬文]×4], 說明（緬文）, 根據（中文）, 能力, 技巧?)
     第一個選項是正確答案（執行時會打亂）。
     能力：detail 細節、number 數字時間、infer 推論、main 主旨、attitude 態度意思、next 接下來、place 地點身分、vocab 詞彙、grammar 語法、connect 連接詞
   kw：這題的關鍵字 [[詞, 緬文]]，作答後可加入生字本。 */
const EXAM = [];
function LI(o) { o.skill = 'listening'; EXAM.push(o); }
function RE(o) { o.skill = 'reading'; EXAM.push(o); }
function QQ(q, qMy, o, why, ev, sk, tip) { return { q: q, qMy: qMy, o: o, a: 0, why: why, ev: ev, sk: sk, tip: tip || '' }; }
const SKILL_NAMES = { detail: ['細節', 'အသေးစိတ်'], number: ['數字・時間', 'ဂဏန်း・အချိန်'], infer: ['推論', 'ကောက်ချက်'], main: ['主旨', 'အဓိကအကြောင်း'], attitude: ['意思・態度', 'ဆိုလိုချက်・သဘော'], next: ['接下來做什麼', 'နောက် ဘာလုပ်မလဲ'], place: ['地點・身分', 'နေရာ・ဘယ်သူ'], vocab: ['詞彙', 'စကားလုံး'], grammar: ['語法', 'သဒ္ဒါ'], connect: ['連接詞', 'ဆက်စပ်စကားလုံး'] };
const TYPE_NAMES = { dlg: ['短對話', 'အတိုစကားပြော'], mono: ['長對話・獨白', 'ရှည်တဲ့စကားပြော・တစ်ယောက်တည်းပြော'], cloze: ['選詞填空', 'စကားလုံးဖြည့်'], para: ['段落填空', 'စာပိုဒ်ဖြည့်'], text: ['閱讀理解', 'ဖတ်ပြီးနားလည်'], old: ['短文', 'စာတို'] };
