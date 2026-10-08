"""每一段對話都走到結局（含故意選錯）；限時聽力與 CAT 聽力倒數。"""
from playwright.sync_api import sync_playwright
import random
import os
STUB = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tts_stub.js')).read()
errs = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}); ctx.add_init_script(STUB); p = ctx.new_page()
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto('http://localhost:8765/index.html'); p.wait_for_timeout(300)
    vids = p.evaluate("TALK.flatMap(sc=>sc.vars.map(v=>v.id))")
    for rnd in range(2):
        for vid in vids:
            p.evaluate(f"startTalk('{vid}')")
            for step in range(120):
                if p.query_selector('.endcard'): break
                if rnd == 1 and step % 3 == 0 and p.query_selector('[data-a="trep"]:not([disabled])'):
                    p.click('[data-a="trep"]:not([disabled])'); p.wait_for_timeout(200)
                if rnd == 1 and p.query_selector('[data-a="tshow"]') and step % 2: p.click('[data-a="tshow"]')
                for sel in ['[data-a="tq"]:not([disabled])', '[data-a="tqnext"]', '[data-a="tnext"]', '[data-a="trev"]', '[data-a="tsaid"]', '[data-a="tactnext"]', '[data-a="tact"]:not(.dim):not(.bad)']:
                    els = p.query_selector_all(sel)
                    if els:
                        (random.choice(els) if rnd == 1 else els[0]).click(); p.wait_for_timeout(650 if 'tq' in sel else 120); break
            if not p.query_selector('.endcard'): errs.append('stuck ' + vid)
        print('round', rnd, 'ok')
    print('talk records', p.evaluate("Object.entries(S.talk).map(([k,v])=>k+':'+v.best).join(' ')"))
    # 限時聽力：不作答，等倒數
    p.evaluate("NAV.sheet=null;startPractice({skill:'listening',mode:'timed',count:2,level:'A2',sec:8})"); p.wait_for_timeout(300)
    p.wait_for_timeout(6000)
    st = p.evaluate("NAV.sheet && (NAV.sheet.v + ':' + (NAV.sheet.ans? NAV.sheet.ans.length : ''))"); print('timed after 6s', st)
    p.wait_for_timeout(6000); print('timed end', p.evaluate("NAV.sheet.v"), p.evaluate("NAV.sheet.src && NAV.sheet.src.ans.map(a=>a.to)"))
    p.evaluate("NAV.sheet=null;startPractice({skill:'listening',mode:'cat',count:10})")
    for i in range(10):
        p.wait_for_selector('[data-a="pans"]:not([disabled])', timeout=4000); p.click('[data-a="pans"]:not([disabled])'); p.wait_for_timeout(400)
    print('cat', p.evaluate("NAV.sheet.v"), p.evaluate("JSON.stringify(NAV.sheet.src.sections)"))
    b.close()
print('ERRORS', errs or 'none')
