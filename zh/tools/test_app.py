"""瀏覽器實測（iPhone 390×844）：走過今天、單字、測驗、對話、聽讀、介面字、設定。
用法：先在 zh/ 開 http.server 8765，再 python3 tools/test_app.py <截圖資料夾>"""
import sys, json, time
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
STUB = """
(() => {
  const voices=[{name:'Mei-Jia',lang:'zh-TW',voiceURI:'mj',localService:true,default:true}];
  const ss={speaking:false,pending:false,paused:false,getVoices:()=>voices,cancel(){this._c&&clearTimeout(this._c)},resume(){},pause(){},addEventListener(){},removeEventListener(){},
    speak(u){window.__spoken=(window.__spoken||[]);window.__spoken.push(u.text);setTimeout(()=>u.onstart&&u.onstart(),10);this._c=setTimeout(()=>u.onend&&u.onend(),60);}};
  Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
  HTMLMediaElement.prototype.play=function(){const el=this;setTimeout(()=>el.onended&&el.onended(),30);return Promise.resolve()};
})();
"""
errors = []
def shot(p, name): p.screenshot(path=f'{OUT}/{name}.png', full_page=False)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for scheme in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, color_scheme=scheme)
        ctx.add_init_script(STUB)
        p = ctx.new_page()
        p.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
        p.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        p.goto('http://localhost:8765/index.html'); p.wait_for_timeout(400)
        shot(p, f'{scheme}-01-first')
        if scheme == 'dark':
            p.click('[data-t="t2"]'); p.wait_for_timeout(200); shot(p, 'dark-02-today'); ctx.close(); continue
        p.click('[data-t="scene"]'); p.wait_for_timeout(200); shot(p, '02-today')
        # 新字 → 學習 → 測驗
        p.click('[data-a="task"][data-t="new"]'); p.wait_for_timeout(300); shot(p, '03-study')
        for i in range(5):
            p.click('[data-a="sknow"][data-k="1"]'); p.wait_for_timeout(120)
        p.wait_for_timeout(200); shot(p, '04-quiz')
        for i in range(5):
            p.click('[data-a="qans"][data-k="0"]'); p.wait_for_timeout(1500)
        shot(p, '05-quizres')
        p.click('[data-a="close"]'); p.wait_for_timeout(200)
        # 對話
        p.click('[data-a="task"][data-t="talk"]'); p.wait_for_timeout(500); shot(p, '06-talk')
        steps = 0
        while steps < 80:
            steps += 1
            if p.query_selector('.endcard'): break
            # 依序嘗試
            for sel in ['[data-a="tq"]:not([disabled])', '[data-a="tqnext"]', '[data-a="tnext"]', '[data-a="trev"]', '[data-a="tsaid"]', '[data-a="tactnext"]', '[data-a="tact"]:not(.dim):not(.bad)']:
                el = p.query_selector(sel)
                if el:
                    if sel.startswith('[data-a="tq"]'):
                        # 選第一個選項（可能錯，就走錯的流程）
                        pass
                    el.click(); p.wait_for_timeout(700); break
            if steps == 3: shot(p, '07-talk-q')
        shot(p, '08-talk-end')
        assert p.query_selector('.endcard'), 'talk did not reach end'
        p.click('.endcard ~ .btns [data-a="close"]'); p.wait_for_timeout(200)
        # 介面字
        p.click('[data-a="task"][data-t="ui"]'); p.wait_for_timeout(300); shot(p, '09-uiword')
        for i in range(3): p.click('[data-a="sknow"][data-k="1"]'); p.wait_for_timeout(150)
        shot(p, '10-screen')
        for i in range(3):
            p.click('[data-a="scrans"][data-k="0"]'); p.wait_for_timeout(200)
            if i == 0: shot(p, '11-screen-fb')
            p.click('[data-a="scrnext"]'); p.wait_for_timeout(200)
        p.click('[data-a="close"]'); p.wait_for_timeout(200)
        # 聽力 5 題
        p.click('[data-a="task"][data-t="listen"]'); p.wait_for_timeout(600); shot(p, '12-listen')
        for i in range(5):
            p.wait_for_selector('[data-a="pans"]:not([disabled])', timeout=5000)
            p.click('[data-a="pans"]:not([disabled])'); p.wait_for_timeout(250)
            if i == 0: shot(p, '13-listen-fb')
            p.click('[data-a="pnext"]'); p.wait_for_timeout(500)
            if p.query_selector('.stat'): break
        shot(p, '14-prres')
        p.click('[data-a="close"]'); p.wait_for_timeout(200); shot(p, '15-today-done')
        # CAT 閱讀
        p.click('[data-a="tab"][data-t="practice"]'); p.wait_for_timeout(200); shot(p, '16-practice')
        p.click('[data-a="pset"][data-k="skill"][data-v="reading"]'); p.click('[data-a="pset"][data-k="mode"][data-v="cat"]'); p.click('[data-a="pset"][data-k="count"][data-v="10"]')
        p.click('[data-a="pstart"]'); p.wait_for_timeout(300); shot(p, '17-cat')
        for i in range(10): p.wait_for_selector('[data-a="pans"]:not([disabled])', timeout=5000); p.click('[data-a="pans"]:not([disabled])'); p.wait_for_timeout(250)
        shot(p, '18-cat-res')
        p.click('[data-a="close"]')
        # 單字頁
        p.click('[data-a="tab"][data-t="words"]'); p.wait_for_timeout(200); shot(p, '19-words')
        p.click('[data-a="go"][data-v="book"]'); p.wait_for_timeout(200); shot(p, '20-book')
        p.click('[data-a="go"][data-v="unit"]'); p.wait_for_timeout(200); shot(p, '21-unit')
        p.click('[data-a="wtab"]') if p.query_selector('[data-a="wtab"]') else None
        p.click('[data-a="back"]'); p.click('[data-a="back"]'); p.wait_for_timeout(100)
        p.click('[data-a="wtab"][data-t="ui"]'); p.wait_for_timeout(200); shot(p, '22-ui')
        p.click('[data-a="go"][data-v="uigroup"]'); p.wait_for_timeout(200); shot(p, '23-uigroup')
        # 對話列表與情境頁
        p.click('[data-a="tab"][data-t="talk"]'); p.wait_for_timeout(200); shot(p, '24-talklist')
        p.click('[data-a="go"][data-v="scene"][data-id="boba"]'); p.wait_for_timeout(200); shot(p, '25-scene')
        # 我的、設定：關緬文與注音
        p.click('[data-a="tab"][data-t="me"]'); p.wait_for_timeout(200); shot(p, '26-me')
        p.click('[data-a="set"][data-k="my"]'); p.click('[data-a="set"][data-k="zy"]'); p.wait_for_timeout(100)
        p.click('[data-a="tab"][data-t="words"]'); p.click('[data-a="wtab"][data-t="scene"]'); p.click('[data-a="go"][data-v="book"]'); p.click('[data-a="go"][data-v="unit"]'); p.click('[data-a="study"]'); p.wait_for_timeout(300); shot(p, '27-study-nomy')
        p.click('.my-reveal'); p.wait_for_timeout(100); shot(p, '28-reveal')
        # 橫向捲動檢查
        sw = p.evaluate('document.documentElement.scrollWidth'); 
        if sw > 391: errors.append('horizontal scroll ' + str(sw))
        st = p.evaluate("JSON.parse(localStorage.getItem('mingbai-zh-v1'))")
        print('done tasks', st['day']['done'], 'words', len(st['w']), 'talk', list(st['talk'].keys()), 'sessions', len(st['sessions']))
        ctx.close()
    b.close()
print('ERRORS:', json.dumps(errors, ensure_ascii=False, indent=1) if errors else 'none')
