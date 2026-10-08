"""詞彙分級剖析：用 TOCFL 詞表做最長詞匹配，回傳每一段文字用到的詞與等級。"""
import json, os, re
Z = os.path.join(os.path.dirname(__file__), '..')
T = json.load(open(os.path.join(Z, 'data/tocfl_list.json'), encoding='utf-8'))['levels']
ORDER = ['N1', 'N2', 'L1', 'L2', 'L3', 'L4', 'L5']
MAXLEN = max(len(w) for w in T)
HAN = re.compile(r'[㐀-鿿]')
def segment(text):
    out, i = [], 0
    while i < len(text):
        if not HAN.match(text[i]): i += 1; continue
        for L in range(min(MAXLEN, len(text) - i), 0, -1):
            w = text[i:i + L]
            if w in T or L == 1:
                out.append((w, T.get(w))); i += L; break
    return out
def profile(text):
    seg = [s for s in segment(text) if len(s[0]) > 1 or s[1]]
    lv = [s[1] for s in seg if s[1]]
    top = max(lv, key=ORDER.index) if lv else None
    hard = [w for w, l in seg if l in ('L4', 'L5')]
    l3 = [w for w, l in seg if l == 'L3']
    return {'top': top, 'l3': l3, 'hard': hard, 'n': len(seg)}
