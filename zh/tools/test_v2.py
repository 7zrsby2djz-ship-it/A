"""v2 實測（iPhone Pro 402×874）：首頁大按鈕帶著走完今天全部步驟，再看各分頁。"""
import sys, json
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
import os
STUB = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tts_stub.js')).read()
errs = []
ORDER = ['[data-a="stepgo"]', '[data-a="sknow"][data-k="1"]', '[data-a="sshow"]', '[data-a="qans"]:not([disabled])', '[data-a="scrans"]:not([disabled])', '[data-a="scrnext"]',
         '[data-a="tq"]:not([disabled])', '[data-a="tqnext"]', '[data-a="tnext"]', '[data-a="trev"]', '[data-a="tsaid"]', '[data-a="tactnext"]', '[data-a="tact"]:not(.dim):not(.bad)',
         '[data-a="pans"]:not([disabled])', '[data-a="pnext"]', '[data-a="flownext"]']
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(reduced_motion='reduce', viewport={'width': 402, 'height': 874}, device_scale_factor=3, is_mobile=True, has_touch=True)
    ctx.add_init_script(STUB); p = ctx.new_page()
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto('http://localhost:8765/index.html'); p.wait_for_timeout(400)
    p.screenshot(path=f'{OUT}/01-home.png')
    p.click('[data-a="flowstart"]'); p.wait_for_timeout(300); p.screenshot(path=f'{OUT}/02-step.png')
    seen = set(); shots = {'study': '03-study', 'quiz': '04-quiz', 'qres': '05-qres', 'talk': '06-talk', 'screen': '07-screen', 'pr': '08-listen', 'prres': '09-prres', 'alldone': '10-alldone'}
    for i in range(400):
        v = p.evaluate("NAV.sheet && NAV.sheet.v")
        if v in shots and v not in seen: seen.add(v); p.screenshot(path=f'{OUT}/{shots[v]}.png')
        if v == 'alldone' or v is None: break
        for sel in ORDER:
            el = p.query_selector(sel)
            if el:
                el.click(); p.wait_for_timeout(700 if sel.startswith('[data-a="qans"') or sel.startswith('[data-a="tq"') else 150); break
        else:
            p.wait_for_timeout(300)
    print('ended at', p.evaluate("NAV.sheet && NAV.sheet.v"), 'done', p.evaluate("JSON.stringify(S.day.done)"))
    p.click('[data-a="close"]'); p.wait_for_timeout(200); p.screenshot(path=f'{OUT}/11-home-done.png')
    for t, n in [('talk', '12-talk'), ('words', '13-words'), ('practice', '14-exam')]:
        p.click(f'[data-a="tab"][data-t="{t}"]'); p.wait_for_timeout(200); p.screenshot(path=f'{OUT}/{n}.png')
    p.click('[data-a="tab"][data-t="talk"]'); p.click('[data-a="go"][data-v="scene"][data-id="boba"]'); p.wait_for_timeout(200); p.screenshot(path=f'{OUT}/15-scene.png')
    p.click('[data-a="tab"][data-t="words"]'); p.click('[data-a="go"][data-v="book"]'); p.wait_for_timeout(150); p.screenshot(path=f'{OUT}/16-book.png')
    p.click('[data-a="go"][data-v="unit"]'); p.wait_for_timeout(150); p.screenshot(path=f'{OUT}/17-unit.png')
    p.click('[data-a="tab"][data-t="words"]'); p.click('[data-a="go"][data-v="note"]'); p.wait_for_timeout(150); p.screenshot(path=f'{OUT}/18-note.png')
    p.click('[data-a="nstudy"]') if p.query_selector('[data-a="nstudy"]') else None; p.wait_for_timeout(150); p.click('[data-a="close"]') if p.query_selector('[data-a="close"]') else None
    p.click('[data-a="tab"][data-t="practice"]'); p.click('[data-a="go"][data-v="catpick"]'); p.wait_for_timeout(150); p.screenshot(path=f'{OUT}/19-catpick.png')
    p.click('[data-a="pquick"][data-s="reading"]'); p.wait_for_timeout(300); p.screenshot(path=f'{OUT}/20-cat-read.png'); p.click('[data-a="close"]')
    p.click('[data-a="tab"][data-t="practice"]'); p.click('#prmore summary'); p.wait_for_timeout(150); p.click('[data-a="pset"][data-k="skill"][data-v="reading"]'); p.wait_for_timeout(150)
    print('details stays open', p.evaluate("document.getElementById('prmore').open")); p.screenshot(path=f'{OUT}/21-custom.png', full_page=True)
    p.click('[data-a="tab"][data-t="today"]'); p.click('[data-a="go"][data-v="me"]'); p.wait_for_timeout(150); p.screenshot(path=f'{OUT}/22-settings.png')
    p.click('[data-a="set"][data-k="my"]'); p.click('[data-a="setv"][data-k="size"][data-v="l"]'); p.wait_for_timeout(100)
    p.click('[data-a="back"]'); p.click('[data-a="tab"][data-t="words"]'); p.click('[data-a="go"][data-v="book"]'); p.click('[data-a="go"][data-v="unit"]'); p.click('[data-a="study"]'); p.wait_for_timeout(250); p.screenshot(path=f'{OUT}/23-study-large-nomy.png')
    sw = p.evaluate('document.documentElement.scrollWidth'); print('scrollWidth', sw)
    # 找畫面上殘留的中文介面字（.ui 以外、非學習內容）：列出按鈕裡沒有 .ui 的
    b.close()
print('ERRORS', errs or 'none')
