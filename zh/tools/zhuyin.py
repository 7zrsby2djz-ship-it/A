"""產生注音（台灣讀音）：build/strings.json → src/readings.gen.js
每個字串 → 以空白分隔、只對應漢字的注音。明朗中文已有人工確認的讀音就優先使用。"""
import json, sys, re, os
from pypinyin import lazy_pinyin, Style, load_phrases_dict
Z = os.path.join(os.path.dirname(__file__), '..')
strings = json.load(open(os.path.join(Z, 'build/strings.json'), encoding='utf-8'))
ming = json.load(open(os.path.join(Z, 'data/mingalar_content.json'), encoding='utf-8'))['readings']
HAN = re.compile(r'[㐀-鿿]')
# 台灣字音（教育部國語辭典常見差異）
CHAR = {'期': 'ㄑㄧˊ', '危': 'ㄨㄟˊ', '微': 'ㄨㄟˊ', '企': 'ㄑㄧˋ', '頻': 'ㄆㄧㄣˊ', '研': 'ㄧㄢˊ', '質': 'ㄓˊ', '綜': 'ㄗㄨㄥˋ',
        '帆': 'ㄈㄢ', '液': 'ㄧˋ', '誼': 'ㄧˊ', '擁': 'ㄩㄥ', '暫': 'ㄓㄢˋ', '癌': 'ㄧㄢˊ', '識': 'ㄕˋ', '鬆': 'ㄙㄨㄥ', '息': 'ㄒㄧˊ',
        '茄': 'ㄑㄧㄝˊ', '惜': 'ㄒㄧˊ', '跡': 'ㄐㄧ', '突': 'ㄊㄨˊ', '寂': 'ㄐㄧˊ', '蝸': 'ㄨㄛ', '亞': 'ㄧㄚˇ', '曝': 'ㄆㄨˋ', '垃': 'ㄌㄜˋ', '圾': 'ㄙㄜˋ',
        '髮': 'ㄈㄚˇ', '檔': 'ㄉㄤˇ', '框': 'ㄎㄨㄤ', '侮': 'ㄨˇ', '尬': 'ㄍㄚˋ', '蕁': 'ㄑㄧㄢˊ', '迄': 'ㄑㄧˋ', '俱': 'ㄐㄩˋ', '酵': 'ㄒㄧㄠˋ'}
PHRASE = {'朋友': 'ㄆㄥˊ ㄧㄡˇ', '衣服': 'ㄧ ㄈㄨˊ', '先生': 'ㄒㄧㄢ ㄕㄥ', '學生': 'ㄒㄩㄝˊ ㄕㄥ', '喜歡': 'ㄒㄧˇ ㄏㄨㄢ', '告訴': 'ㄍㄠˋ ㄙㄨˋ',
          '認識': 'ㄖㄣˋ ㄕˋ', '休息': 'ㄒㄧㄡ ㄒㄧˊ', '東西': 'ㄉㄨㄥ ㄒㄧ˙', '意思': 'ㄧˋ ㄙ˙', '時候': 'ㄕˊ ㄏㄡˋ', '知道': 'ㄓ ㄉㄠˋ',
          '地方': 'ㄉㄧˋ ㄈㄤ', '事情': 'ㄕˋ ㄑㄧㄥˊ', '漂亮': 'ㄆㄧㄠˋ ㄌㄧㄤˋ', '舒服': 'ㄕㄨ ㄈㄨˊ', '豆腐': 'ㄉㄡˋ ㄈㄨˇ', '便宜': 'ㄆㄧㄢˊ ㄧˊ',
          '麻煩': 'ㄇㄚˊ ㄈㄢˊ', '關係': 'ㄍㄨㄢ ㄒㄧˋ', '客人': 'ㄎㄜˋ ㄖㄣˊ', '帥哥': 'ㄕㄨㄞˋ ㄍㄜ', '號碼': 'ㄏㄠˋ ㄇㄚˇ', '頭髮': 'ㄊㄡˊ ㄈㄚˇ',
          '一下': 'ㄧ ㄒㄧㄚˋ', '一下下': 'ㄧ ㄒㄧㄚˋ ㄒㄧㄚˋ', '歹勢': 'ㄉㄞˇ ㄕˋ', '還是': 'ㄏㄞˊ ㄕˋ', '還沒': 'ㄏㄞˊ ㄇㄟˊ', '還要': 'ㄏㄞˊ ㄧㄠˋ',
          '還你': 'ㄏㄨㄢˊ ㄋㄧˇ', '找你': 'ㄓㄠˇ ㄋㄧˇ', '外帶': 'ㄨㄞˋ ㄉㄞˋ', '內用': 'ㄋㄟˋ ㄩㄥˋ', '載具': 'ㄗㄞˋ ㄐㄩˋ', '統編': 'ㄊㄨㄥˇ ㄅㄧㄢ',
          '拿鐵': 'ㄋㄚˊ ㄊㄧㄝˇ', '珍奶': 'ㄓㄣ ㄋㄞˇ', '尺寸': 'ㄔˇ ㄘㄨㄣˋ', '刷卡': 'ㄕㄨㄚ ㄎㄚˇ', '提袋': 'ㄊㄧˊ ㄉㄞˋ', '末三碼': 'ㄇㄛˋ ㄙㄢ ㄇㄚˇ',
          '登出': 'ㄉㄥ ㄔㄨ', '重試': 'ㄔㄨㄥˊ ㄕˋ', '重新': 'ㄔㄨㄥˊ ㄒㄧㄣ', '重新整理': 'ㄔㄨㄥˊ ㄒㄧㄣ ㄓㄥˇ ㄌㄧˇ', '儲存': 'ㄔㄨˊ ㄘㄨㄣˊ',
          '綁定': 'ㄅㄤˇ ㄉㄧㄥˋ', '逾時': 'ㄩˊ ㄕˊ', '備取': 'ㄅㄟˋ ㄑㄩˇ', '錄取': 'ㄌㄨˋ ㄑㄩˇ', '正反面': 'ㄓㄥˋ ㄈㄢˇ ㄇㄧㄢˋ', '影本': 'ㄧㄥˇ ㄅㄣˇ',
          '承辦人': 'ㄔㄥˊ ㄅㄢˋ ㄖㄣˊ', '請假': 'ㄑㄧㄥˇ ㄐㄧㄚˋ', '放假': 'ㄈㄤˋ ㄐㄧㄚˋ', '號誌': 'ㄏㄠˋ ㄓˋ', '月台': 'ㄩㄝˋ ㄊㄞˊ', '南屯': 'ㄋㄢˊ ㄊㄨㄣˊ',
          '北屯': 'ㄅㄟˇ ㄊㄨㄣˊ', '逢甲': 'ㄈㄥˊ ㄐㄧㄚˇ', '櫃台': 'ㄍㄨㄟˋ ㄊㄞˊ', '櫃檯': 'ㄍㄨㄟˋ ㄊㄞˊ', '吐司': 'ㄊㄨˇ ㄙ', '蘿蔔糕': 'ㄌㄨㄛˊ ㄅㄛˊ ㄍㄠ',
          '蘿蔔': 'ㄌㄨㄛˊ ㄅㄛˊ', '起司': 'ㄑㄧˇ ㄙ', '蛋餅': 'ㄉㄢˋ ㄅㄧㄥˇ', '豆漿': 'ㄉㄡˋ ㄐㄧㄤ', '鐵板麵': 'ㄊㄧㄝˇ ㄅㄢˇ ㄇㄧㄢˋ', '咧': 'ㄌㄧㄝ˙',
          '齁': 'ㄏㄡ', '嗶': 'ㄅㄧˋ', '喔': 'ㄛ', '囉': 'ㄌㄨㄛ˙', '耶': 'ㄧㄝ', '啦': 'ㄌㄚ˙', '嘛': 'ㄇㄚ˙', '吧': 'ㄅㄚ˙', '呢': 'ㄋㄜ˙', '嗎': 'ㄇㄚ˙',
          '的話': 'ㄉㄜ˙ ㄏㄨㄚˋ', '什麼': 'ㄕㄣˊ ㄇㄜ˙', '怎麼': 'ㄗㄣˇ ㄇㄜ˙', '這麼': 'ㄓㄜˋ ㄇㄜ˙', '那麼': 'ㄋㄚˋ ㄇㄜ˙', '多少': 'ㄉㄨㄛ ㄕㄠˇ',
          '謝謝': 'ㄒㄧㄝˋ ㄒㄧㄝ˙', '不客氣': 'ㄅㄨˊ ㄎㄜˋ ㄑㄧˋ', '對不起': 'ㄉㄨㄟˋ ㄅㄨˋ ㄑㄧˇ', '不好意思': 'ㄅㄨˋ ㄏㄠˇ ㄧˋ ㄙ˙', '沒關係': 'ㄇㄟˊ ㄍㄨㄢ ㄒㄧˋ',
          '收據': 'ㄕㄡ ㄐㄩˋ', '暫停': 'ㄓㄢˋ ㄊㄧㄥˊ', '說明': 'ㄕㄨㄛ ㄇㄧㄥˊ', '明白': 'ㄇㄧㄥˊ ㄅㄞˊ', '打工': 'ㄉㄚˇ ㄍㄨㄥ', '一樣': 'ㄧ ㄧㄤˋ'}
NEUTRAL_OK = set('嗎呢吧啊呀了的地得著過們麼嘛啦囉喔哦咧')
def toks(text):
    out = lazy_pinyin(text, style=Style.BOPOMOFO, errors=lambda s: ['?'] * len(s), tone_sandhi=False)
    if len(out) != len(text):  # 安全退回：逐字
        out = [lazy_pinyin(ch, style=Style.BOPOMOFO, errors=lambda s: ['?'] * len(s))[0] for ch in text]
    res = []
    for i, ch in enumerate(text):
        if not HAN.match(ch): res.append(None); continue
        t = out[i]
        if t.endswith('˙') and ch not in NEUTRAL_OK and not (i > 0 and text[i - 1] == ch) and ch not in '子頭們候':
            t = lazy_pinyin(ch, style=Style.BOPOMOFO)[0]
        if ch in CHAR: t = CHAR[ch]
        res.append(t)
    # 詞組覆寫（長的先）
    for p in sorted(PHRASE, key=len, reverse=True):
        start = 0
        while True:
            j = text.find(p, start)
            if j < 0: break
            for k, z in enumerate(PHRASE[p].split(' ')): res[j + k] = z
            start = j + len(p)
    return res
R = {}
for s in strings:
    if s in ming:
        r = [x for x, ch in zip(ming[s], s) if HAN.match(ch)] if len(ming[s]) == len(s) else None
        if r: R[s] = ' '.join(r); continue
    R[s] = ' '.join(t for t in toks(s) if t is not None)
# 單字備用讀音（給程式裡組出來的句子用）
C = {}
for s in strings:
    for ch, t in zip([c for c in s if HAN.match(c)], R[s].split(' ')):
        C.setdefault(ch, {}).setdefault(t, 0); C[ch][t] += 1
CH = {ch: (CHAR.get(ch) or max(v, key=v.get)) for ch, v in C.items()}
open(os.path.join(Z, 'src/readings.gen.js'), 'w', encoding='utf-8').write('const READ=' + json.dumps(R, ensure_ascii=False, separators=(',', ':')) + ';\nconst CHREAD=' + json.dumps(CH, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('readings', len(R), os.path.getsize(os.path.join(Z, 'src/readings.gen.js')))
