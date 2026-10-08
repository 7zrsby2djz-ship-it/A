"""每題的難度微調：題目裡用到幾個 TOCFL 高階／流利級的詞（兩個字以上），多一個 +0.15，最多 +0.45。
輸出 src/itemdiff.gen.js：const ITEMDIFF={題號: 微調}"""
import json, os, sys, subprocess
Z = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, os.path.dirname(__file__))
from lexprofile import segment
exam = json.loads(subprocess.check_output(['node', '-e', """
const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);
vm.runInContext(['exam_core','exam_listen','exam_read'].map(f=>fs.readFileSync('%s/src/'+f+'.js','utf8')).join('\\n')+';this.EXAM=EXAM',c);
process.stdout.write(JSON.stringify(c.EXAM));""" % Z]))
ming = json.load(open(os.path.join(Z, 'data/mingalar_content.json'), encoding='utf-8'))['questions']
texts = {it['id']: ''.join(a[1] for a in it.get('audio', [])) + it.get('text', '') for it in exam}
texts.update({q['id']: q['passage'] for q in ming})
out = {}
for k, t in texts.items():
    hard = {w for w, l in segment(t) if l in ('L4', 'L5') and len(w) >= 2}
    adj = round(min(.45, max(0, len(hard) - 1) * .15), 2)
    if adj: out[k] = adj
open(os.path.join(Z, 'src/itemdiff.gen.js'), 'w', encoding='utf-8').write('const ITEMDIFF=' + json.dumps(out) + ';\n')
print('itemdiff', len(out), 'of', len(texts))
