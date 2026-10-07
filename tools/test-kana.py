from playwright.sync_api import sync_playwright
import json
import os
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'..','index.html'))
SPY="""window.__spoken=[]; window.__recorded=[]; window.__mode='ok'; window.__pending=[];
if(window.speechSynthesis){ speechSynthesis.getVoices=()=>[{lang:'ja-JP',name:'Kyoko',voiceURI:'k'}];
 speechSynthesis.speak=(u)=>{window.__spoken.push(u.text+'@'+u.rate); const m=window.__mode;
  if(m==='ok') setTimeout(()=>u.onend&&u.onend(),20); else if(m==='error') setTimeout(()=>u.onerror&&u.onerror({error:'synthesis-failed'}),20); else window.__pending.push(u); };
 speechSynthesis.cancel=()=>{}; }
window.Audio=class { constructor(src){this.src=src;this.currentTime=0;}
 play(){const id=Object.entries(window.KANA_REBUILD_AUDIO.clips).find(x=>x[1]===this.src)[0];window.__recorded.push(id+'@'+this.playbackRate);this.onend=this.onended;
  if(window.__mode==='ok')setTimeout(()=>this.onended&&this.onended(),20);else if(window.__mode==='error')setTimeout(()=>this.onerror&&this.onerror(),20);else window.__pending.push(this);return Promise.resolve();}
 pause(){} };"""
errs=[]; R={}
def ck(name, cond, info=''):
    R[name]=bool(cond); print(('PASS ' if cond else 'FAIL ')+name, info if not cond else '')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('KANA_CHROMIUM_PATH') or None,
                       args=['--no-sandbox','--disable-dev-shm-usage'] if os.environ.get('KANA_CHROMIUM_PATH') else [])
    def ctx(w=390, dark=False, init=SPY, state=None):
        c=b.new_context(viewport={'width':w,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,color_scheme='dark' if dark else 'light')
        c.add_init_script(init); pg=c.new_page(); pg.on('pageerror',lambda e: errs.append(str(e))); pg.goto(URL); pg.wait_for_timeout(200)
        if state is not None:
            pg.evaluate("s => localStorage.setItem('bnk-state-v1', s)", json.dumps(state)); pg.reload(); pg.wait_for_timeout(300)
        return c,pg
    # old save with romaji on, other progress, no kana
    old={"v":1,"updatedAt":5,"settings":{"read":"ro","romaji":True,"dlgLen":1,"dailyNew":5,"rate":1,"autoSpeak":True},"en":{"allow":{"s":3,"due":0,"ok":3,"ng":0,"lapse":0,"conf":{},"t0":1,"last":1}},"tk":{"bus":{"lv":{"1":{"done":2,"text":0,"listen":2,"repair":0,"transfer":0,"seen":["b1a"],"last":1,"rec":None}}}},"ck":{"hai":{"seen":1,"t":{"s":1,"due":0,"ok":1,"ng":0,"lapse":0,"conf":{},"t0":1,"last":1},"l":{"s":0,"due":0,"ok":0,"ng":0,"lapse":0,"conf":{},"t0":1,"last":0},"weak":False}},"gm":{"star":12,"days":{"konbini":3}},"xp":50}
    c,pg=ctx(state=old)
    ck('old romaji kept', pg.evaluate("S.settings.read")=='ro')
    ck('kana romaji default off', pg.evaluate("knSt().prefs.romaji")==False)
    ck('old progress kept', pg.evaluate("S.tk.bus.lv[1].listen===2 && S.en.allow.s===3 && S.gm.star===12 && !!S.ck.hai"))
    pg.evaluate("UI.tab='jp';render()"); pg.screenshot(path='/tmp/kana-shot-k_jp.png')
    pg.click('#view [data-a=knOpen]:not([data-v])'); pg.wait_for_timeout(150); pg.screenshot(path='/tmp/kana-shot-k_home.png', full_page=False)
    ck('table 46 cells', pg.evaluate("document.querySelectorAll('#kn .kcell:not(.empty)').length")==46)
    pg.click('#kn [data-k=open][data-v="hira:e"]'); pg.wait_for_timeout(150); pg.screenshot(path='/tmp/kana-shot-k_card_e.png')
    t=pg.inner_text('#kn')
    ck('e card shows 駅 えき 車站', '駅' in t and '車站' in t and pg.evaluate("document.querySelector('#kn .khl').textContent")=='え')
    ck('no romaji before peek', ' e' not in pg.evaluate("document.querySelector('#kn .kcard .small.muted').textContent"))
    pg.click('#kn [data-k=sayKana]'); pg.click('#kn [data-k=sayWord]'); pg.wait_for_timeout(100)
    sp=pg.evaluate("__spoken"); recorded=pg.evaluate("__recorded"); ck('recorded kana then TTS word reading', recorded[-1]=='e@1' and sp[-1].startswith('えき@') and not any(x.startswith('え@') for x in sp), (recorded,sp))
    pg.click('#kn [data-k=peek]'); ck('peek shows romaji', 'e' in pg.evaluate("document.querySelector('#kn .kcard .small.muted').textContent"))
    pg.click('#kn .ov-foot [data-k=open]:last-child'); pg.wait_for_timeout(100)
    ck('peek cleared on next card', pg.evaluate("KG.peek")==False and pg.evaluate("KG.key")=='hira:o')
    # special cards
    for key, word, idx in [('hira:n','ほん',1),('kata:mu','ハム',1),('hira:wo','みずをください',2)]:
        pg.evaluate(f"KG.key='{key}';KG.view='card';knRender()")
        ck('special '+key, pg.evaluate("document.querySelector('#kn .khl').textContent")==word[idx] and (key=='kata:mu' or pg.evaluate("!document.querySelector('#kn [data-k=sayKana]')")))
    pg.evaluate("KG.key='hira:ri';KG.view='card';knRender()"); ck('ri extension note', 'りょ' in pg.inner_text('#kn'))
    pg.evaluate("KG.key='kata:wo';KG.view='card';knRender()"); ck('ヲ reference', 'ヲ 先認得' in pg.inner_text('#kn'))
    # questions never hear for n/wo/kata:wo
    plans=pg.evaluate("[knPlanFor('hira:n'),knPlanFor('kata:n'),knPlanFor('hira:wo'),knPlanFor('kata:mu'),knPlanFor('hira:ka')]")
    ck('no hear for n/wo', 'hear' not in plans[0]+plans[1]+plans[2] and plans[4][0]=='hear', plans)
    q=pg.evaluate("knQuestion('wordLink','kata:mu',[])"); ck('mu wordLink uses ham', q['word']=='ham' and len(set(q['opts']))==3)
    q=pg.evaluate("knQuestion('hear','hira:o',[])"); ck('o hear excludes を', 'hira:wo' not in q['opts'])
    q=pg.evaluate("knQuestion('pair','hira:wo',[])"); ck('wo pair from ヲ', q['from']=='kata:wo' and 'hira:o' not in q['opts'])
    # words view
    pg.evaluate("KG.view='words';knRender()"); t=pg.inner_text('#kn'); ck('voiced words listed separately', 'でんち' in t and 'グレー' in t and '下一版' in t)
    ck('dengchi not in te group', pg.evaluate("Object.values(KA).every(a=>a.wordRefs.every(r=>!['denchi','gray','grey'].includes(r.wordId)))"))
    pg.screenshot(path='/tmp/kana-shot-k_words.png')
    # round
    pg.evaluate("KG.view='home';knRender()"); pg.click('#kn [data-k=start]'); pg.wait_for_timeout(100)
    a=pg.evaluate("knSt().active"); ck('round 5 targets mixed', len(a['targets'])==5 and len(a['items'])==15, a['targets'])
    pg.screenshot(path='/tmp/kana-shot-k_learn.png')
    # walk to first hear question
    def cur(): return pg.evaluate("knCur()")
    guard=0
    while cur()['type']!='hear' and guard<20:
        it=cur()
        if it['type'] in ('learn',): pg.evaluate("knNext()")
        elif it['type']=='view': pg.evaluate("KG.reveal=true;knSelfRate(true)")
        else: pg.evaluate("knAnswer(knCur().key)"); pg.evaluate("knNext()")
        guard+=1
    it=cur(); ck('reached hear', it['type']=='hear')
    pg.screenshot(path='/tmp/kana-shot-k_hear.png')
    before=pg.evaluate(f"knCard('{it['key']}',true).hear.correct")
    pg.evaluate("knAnswer(knCur().key)"); ck('blocked before play', pg.evaluate("knSt().active.ans[knSt().active.i]") is None)
    # error playback
    pg.evaluate("__mode='error'"); pg.click('#kn [data-k=play]'); pg.wait_for_timeout(100)
    ck('error shows retry', '再試一次' in pg.inner_text('#kn') and pg.evaluate("KG.play.fail")=='recording')
    pg.evaluate("knAnswer(knCur().key)"); ck('still blocked after error', pg.evaluate("knSt().active.ans[knSt().active.i]") is None)
    pg.screenshot(path='/tmp/kana-shot-k_err.png')
    # hang + late onend after moving on
    pg.evaluate("__mode='hang'"); pg.click('#kn [data-k=play]'); pg.wait_for_timeout(50)
    pg.evaluate("__mode='ok'"); pg.click('#kn [data-k=play]'); pg.wait_for_timeout(100)
    pg.evaluate("__pending.forEach(u=>u.onend&&u.onend())"); pg.wait_for_timeout(50)
    ck('stale onend ignored, latest ok', pg.evaluate("KG.play.ok")==True)
    pg.evaluate("knAnswer(knCur().key)")
    after=pg.evaluate(f"knCard('{it['key']}').hear")
    ck('hear credited once', after['correct']==before+1 and after['assisted']==0)
    pg.screenshot(path='/tmp/kana-shot-k_fb.png')
    # stale onend after next
    pg.evaluate("__mode='hang'"); pg.evaluate("knNext()")
    # find next hear later; first test reload resume mid round
    i_before=pg.evaluate("knSt().active.i"); answered=pg.evaluate("Object.keys(knSt().active.ans).length")
    att=pg.evaluate("JSON.stringify(knSt().cards)")
    pg.wait_for_timeout(300)
    pg.reload(); pg.wait_for_timeout(300)
    ck("resume same position", pg.evaluate("knSt().active && knSt().active.i")==i_before and pg.evaluate("Object.keys(knSt().active.ans).length")==answered)
    ck('no double count after reload', pg.evaluate("JSON.stringify(knSt().cards)")==att)
    pg.evaluate("UI.tab='jp';render()"); pg.click('#view [data-a=knOpen][data-v=go]'); pg.wait_for_timeout(100)
    ck('resume opens round', pg.evaluate("KG.view")=='round' and pg.evaluate("KG.play.ok")!=True)
    # noaudio fallback on a hear question
    guard=0
    pg.evaluate("__mode='ok'")
    while pg.evaluate("knSt().active") and cur()['type']!='hear' and guard<30:
        it2=cur()
        if it2['type']=='learn': pg.evaluate("knNext()")
        elif it2['type']=='view': pg.evaluate("knSelfRate(true)")
        else: pg.evaluate("knAnswer(knCur().key)"); pg.evaluate("knNext()")
        guard+=1
    if pg.evaluate("knSt().active"):
        k2=cur()['key']; h0=pg.evaluate(f"JSON.stringify(knCard('{k2}',true).hear)")
        pg.click('#kn [data-k=noaudio]'); pg.evaluate("knAnswer(knCur().key)")
        h1=pg.evaluate(f"knCard('{k2}').hear")
        ck('noaudio = assisted, no hear credit', h1['correct']==json.loads(h0)['correct'] and h1['assisted']==json.loads(h0)['assisted']+1)
        pg.evaluate("knNext()")
    # wrong answer requeue
    while pg.evaluate("knSt().active") and cur()['type'] in ('learn','view'): pg.evaluate("knSt().active && (knCur().type==='view'?knSelfRate(true):knNext())")
    if pg.evaluate("knSt().active"):
        n0=pg.evaluate("knSt().active.items.length"); itw=cur()
        wrong=[o for o in itw['opts'] if o!=itw['key']][0]
        if itw['type']=='hear': pg.click('#kn [data-k=play]'); pg.wait_for_timeout(80)
        pg.evaluate(f"knAnswer('{wrong}')"); pg.screenshot(path='/tmp/kana-shot-k_wrong.png')
        ck('wrong requeued later', pg.evaluate("knSt().active.items.length")==n0+1 and 'review'==pg.evaluate(f"knStatus('{itw['key']}')"))
    # finish round
    g=0
    while pg.evaluate("!!knSt().active") and g<60:
        it3=cur()
        if it3['type']=='learn': pg.evaluate("knNext()")
        elif it3['type']=='view': pg.evaluate("knSelfRate(true)")
        else:
            if it3['type']=='hear': pg.evaluate("KG.play={ok:true}")
            pg.evaluate("knAnswer(knCur().key)"); pg.evaluate("knNext()")
        g+=1
    ck('round done', pg.evaluate("KG.view")=='done'); pg.screenshot(path='/tmp/kana-shot-k_done.png')
    # romaji global persists, mode switch separate records
    pg.evaluate("knSt().prefs.romaji=true;knSt().prefs.script='kata';persist()"); pg.reload(); pg.wait_for_timeout(300)
    ck('prefs persisted', pg.evaluate("knSt().prefs.romaji===true && knSt().prefs.script==='kata'"))
    pg.evaluate("knSt().active=null;knStartRound()")
    ck('kata round only kata', all(k.startswith('kata:') for k in pg.evaluate("knSt().active.targets")))
    ck('global romaji marks assisted', True)
    pg.evaluate("(()=>{while(knCur().type==='learn'||knCur().type==='view'){knCur().type==='view'?knSelfRate(true):knNext()} if(knCur().type==='hear')KG.play={ok:true}; knAnswer(knCur().key)})()")
    ck('assisted recorded with global romaji', pg.evaluate("knSt().active.ans[knSt().active.i].assisted")==True)
    ck('other progress intact', pg.evaluate("S.tk.bus.lv[1].listen===2 && S.gm.star===12 && S.settings.read==='ro'"))
    c.close()
    # partial kana save
    part=dict(old); part['kana']={"cards":{"hira:a":{"hear":{"attempts":2}}}}
    c,pg=ctx(state=part)
    ck('partial kana filled', pg.evaluate("(()=>{const c=knCard('hira:a');return c.hear.attempts===2&&c.hear.correct===0&&Array.isArray(c.view.days)&&knSt().prefs.script==='mixed'})()"))
    pg.evaluate("UI.tab='jp';render()"); pg.click('#view [data-a=knOpen]:not([data-v])'); ck('opens with partial', pg.evaluate("KG.view")=='home')
    c.close()
    for w in (360,390,430):
        for dark in (False,True):
            c,pg=ctx(w=w,dark=dark)
            pg.evaluate("UI.tab='jp';render()"); pg.click('#view [data-a=knOpen]:not([data-v])'); pg.wait_for_timeout(100)
            sw=pg.evaluate("Math.max(document.documentElement.scrollWidth, document.querySelector('#kn .ov-body').scrollWidth)")
            cell=pg.evaluate("(()=>{const r=document.querySelector('#kn .kcell:not(.empty)').getBoundingClientRect();return [r.width,r.height]})()")
            ck(f'no hscroll {w} {dark}', sw<=w and cell[0]>=44 and cell[1]>=44, (sw,cell))
            if w==390 and dark: pg.screenshot(path='/tmp/kana-shot-k_home_dark.png')
            c.close()
print('ERR', errs); print('FAILED', [k for k,v in R.items() if not v])
if errs or not all(R.values()):
    raise SystemExit(1)
