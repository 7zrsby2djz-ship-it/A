"""TOCFL 華語八千詞 2.0（2024-09-23 版）→ data/tocfl_list.json：{詞: 等級}
等級：N1 準備一、N2 準備二、L1 入門、L2 基礎、L3 進階、L4 高階、L5 流利"""
import openpyxl, json, re, sys
SHEETS = [('準備級一級', 'N1'), ('準備級二級', 'N2'), ('入門級', 'L1'), ('基礎級', 'L2'), ('進階級', 'L3'), ('高階級', 'L4'), ('流利級', 'L5')]
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
out, raw = {}, []
for ws in wb.worksheets:
    lv = next((c for n, c in SHEETS if ws.title.startswith(n)), None)
    if not lv: continue
    rows = list(ws.iter_rows(values_only=True))
    head = [str(h or '') for h in rows[0]]
    wi = next(i for i, h in enumerate(head) if h.startswith('詞彙'))
    ci = next((i for i, h in enumerate(head) if h.startswith('任務領域')), None)
    for r in rows[1:]:
        w = r[wi]
        if not w: continue
        w = str(w).strip()
        raw.append({'w': w, 'lv': lv, 'ctx': (r[ci] if ci is not None else None), 'pos': r[-1]})
        for v in re.split(r'[/／]', w):
            v = re.sub(r'[（(][^）)]*[）)]', '', v).strip()
            if v and v not in out: out[v] = lv
json.dump({'_source': 'TOCFL 華語八千詞表 2.0（國家華語測驗推動工作委員會，2024-09-23 版，使用者提供）', 'levels': out, 'entries': raw}, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
from collections import Counter
print(len(out), Counter(out.values()))
