"""聽讀實測：學習（聽力題組）、限時閱讀、CAT 聽力與閱讀、完整模擬考、弱點練習。"""
import sys, json, random
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
import os
STUB = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tts_stub.js')).read()
errs = []
def answer_all(p, n, right_ratio=0.6, shots=None):
    for i in range(n):
        p.wait_for_selector('[data-a="pans"]:not([disabled]), [data-a="pnextsec"], .stat', timeout=8000)
        if p.query_selector('.stat') and not p.query_selector('[data-a="pans"]'): return i
        if p.query_selector('[data-a="pnextsec"]'): return i
        # 用正確答案的機率控制
        ok = random.random() < right_ratio
        k = p.evaluate("(()=>{const s=NAV.sheet;const q=s.cur.qs[s.qi];return q.a})()")
        if not ok: k = (k + 1) % 4
        p.click(f'[data-a="pans"][data-k="{k}"]'); p.wait_for_timeout(120)
        if shots and i in shots: p.screenshot(path=f'{OUT}/{shots[i]}.png')
        if p.query_selector('[data-a="pnext"]'): p.click('[data-a="pnext"]'); p.wait_for_timeout(120)
    return n
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(reduced_motion='reduce', viewport={'width': 390, 'height': 844}, device_scale_factor=2); ctx.add_init_script(STUB); p = ctx.new_page()
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto('http://localhost:8765/index.html'); p.wait_for_timeout(300)
    p.click('[data-a="tab"][data-t="practice"]'); p.wait_for_timeout(200); p.screenshot(path=f'{OUT}/e01-home.png')
    p.evaluate("NAV.prMore=true;render()")
    # 學習・聽力・長對話
    p.click('[data-a="pset"][data-k="type"][data-v="mono"]'); p.click('[data-a="pstart"]'); p.wait_for_timeout(600); p.screenshot(path=f'{OUT}/e02-listen-mono.png')
    answer_all(p, 3, 0.5, {0: 'e03-listen-fb'})
    p.click('[data-a="close"]'); p.evaluate("NAV.prMore=true;render()")
    # 限時・閱讀・段落
    p.click('[data-a="pset"][data-k="skill"][data-v="reading"]'); p.click('[data-a="pset"][data-k="mode"][data-v="timed"]'); p.click('[data-a="pset"][data-k="type"][data-v="para"]'); p.click('[data-a="pset"][data-k="count"][data-v="5"]')
    p.click('[data-a="pstart"]'); p.wait_for_timeout(300); p.screenshot(path=f'{OUT}/e04-para.png')
    answer_all(p, 6); p.wait_for_timeout(300); p.screenshot(path=f'{OUT}/e05-para-res.png')
    p.click('[data-a="close"]'); p.evaluate("NAV.prMore=true;render()")
    # 選詞填空 & 閱讀理解 (學習)
    p.click('[data-a="pset"][data-k="mode"][data-v="guided"]'); p.click('[data-a="pset"][data-k="type"][data-v="text"]'); p.click('[data-a="pstart"]'); p.wait_for_timeout(300); p.screenshot(path=f'{OUT}/e06-text.png')
    p.click('[data-a="close"]'); p.evaluate("NAV.prMore=true;render()")
    p.click('[data-a="pset"][data-k="type"][data-v="cloze"]'); p.click('[data-a="pstart"]'); p.wait_for_timeout(300); p.screenshot(path=f'{OUT}/e07-cloze.png')
    p.click('[data-a="close"]'); p.evaluate("NAV.prMore=true;render()")
    # CAT 聽力 20
    for skill, ratio in [('listening', .75), ('reading', .45)]:
        p.click(f'[data-a="pset"][data-k="skill"][data-v="{skill}"]'); p.click('[data-a="pset"][data-k="mode"][data-v="cat"]'); p.click('[data-a="pset"][data-k="count"][data-v="20"]')
        p.click('[data-a="pstart"]'); p.wait_for_timeout(400)
        if skill == 'listening': p.screenshot(path=f'{OUT}/e08-cat-listen.png')
        answer_all(p, 24, ratio)
        p.wait_for_timeout(300)
        print(skill, 'cat ->', p.evaluate("NAV.sheet.v"), p.evaluate("NAV.sheet.src && NAV.sheet.src.ans.length"), p.evaluate("JSON.stringify(NAV.sheet.src.sections)"),
              'b path', p.evaluate("NAV.sheet.src.ans.map(a=>a.b.toFixed(1)).join(' ')"))
        p.screenshot(path=f'{OUT}/e09-cat-res-{skill}.png'); p.screenshot(path=f'{OUT}/e09-cat-res-{skill}-full.png', full_page=True)
        p.click('[data-a="close"]'); p.wait_for_timeout(100); p.evaluate("NAV.prMore=true;render()")
    # 模擬考
    p.click('[data-a="pset"][data-k="mode"][data-v="mock"]'); p.click('[data-a="pstart"]'); p.wait_for_timeout(400)
    n1 = answer_all(p, 25, .6); print('mock listening answered', n1)
    p.screenshot(path=f'{OUT}/e10-mock-break.png')
    p.click('[data-a="pnextsec"]'); p.wait_for_timeout(300); p.screenshot(path=f'{OUT}/e11-mock-read.png')
    n2 = answer_all(p, 25, .6); print('mock reading answered', n2)
    p.wait_for_timeout(300); p.screenshot(path=f'{OUT}/e12-mock-res.png')
    print('mock types', p.evaluate("JSON.stringify(NAV.sheet.src.ans.reduce((m,a)=>{m[a.skill+':'+a.type]=(m[a.skill+':'+a.type]||0)+1;return m},{}))"))
    if p.query_selector('[data-a="pweak"]'):
        p.click('[data-a="pweak"]'); p.wait_for_timeout(400); print('weak practice', p.evaluate("NAV.sheet.mode+' '+NAV.sheet.type"))
        p.click('[data-a="close"]'); p.evaluate("NAV.prMore=true;render()")
    p.click('[data-a="tab"][data-t="practice"]'); p.wait_for_timeout(200); p.screenshot(path=f'{OUT}/e13-home-after.png')
    print('cat stored', p.evaluate("JSON.stringify(S.cat)"))
    sw = p.evaluate('document.documentElement.scrollWidth'); print('scrollWidth', sw)
    b.close()
print('ERRORS', errs or 'none')
