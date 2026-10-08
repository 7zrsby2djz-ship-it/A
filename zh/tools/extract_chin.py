"""Extract the Chin Chin Chinese (Work Chinese, Myanmar Edition) vocabulary VERBATIM.
Content license: CC BY-NC-ND 4.0 (YUNG-TSAI LAI, ChinQing in Taiwan).
Nothing is edited: every string field is copied byte-for-byte from the Dart source.
Usage: python3 extract_chin.py <path-to-Burmese_language_app> <out.json>
"""
import json, re, sys, os
root, out = sys.argv[1], sys.argv[2]
FIELDS = ['zh','pinyin','myn','sentenceZH','sentencePINYIN','sentenceMYN','audioZH']
words = []
for fn in ['vocab_data.dart', 'tocfl_data.dart']:
    src = open(os.path.join(root, 'lib/data', fn), encoding='utf-8').read()
    for m in re.finditer(r'Word\(\s*id:\s*(\d+)\s*,(.*?)\)\s*,\s*\n', src, re.S):
        body = m.group(2)
        w = {'id': int(m.group(1))}
        for f in FIELDS:
            fm = re.search(r'\b' + f + r':\s*"((?:[^"\\]|\\.)*)"', body)
            if not fm: raise SystemExit(f'missing {f} in id {w["id"]}')
            w[f] = fm.group(1).replace('\\"', '"').replace("\\'", "'")
        words.append(w)
ug = open(os.path.join(root, 'lib/data/unit_group.dart'), encoding='utf-8').read()
groups = []
for b in ug.split('appUnitGroups')[1].split('UnitGroup(')[1:]:
    t = re.search(r'title:\s*"([^"]*)"', b); s = re.search(r'startId:\s*(\d+)', b); e = re.search(r'endId:\s*(\d+)', b)
    subs = re.search(r'subUnits:\s*\[(.*?)\]', b, re.S); col = re.search(r'Color\(0xFF([0-9A-Fa-f]{6})\)', b)
    groups.append({'title': t.group(1), 'start': int(s.group(1)), 'end': int(e.group(1)),
                   'subUnits': re.findall(r'"([^"]*)"', subs.group(1)), 'color': '#' + col.group(1)})
json.dump({'_license': 'Vocabulary, translations, sentences and audio: Work Chinese / Chin Chin Chinese (Myanmar Edition) by YUNG-TSAI LAI & ChinQing in Taiwan, CC BY-NC-ND 4.0. Copied verbatim, unmodified. https://github.com/lai2570/Burmese_language_app',
           'groups': groups, 'words': words}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(words), 'words', len(groups), 'groups')
