"""Actual trusted first interactions; no autoplay override or audio fixtures."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.qa/repair-entry'
OUT.mkdir(parents=True,exist_ok=True)
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4330/src/'
checks=[];errors=[]
def state(p):return json.loads(p.evaluate('window.render_game_to_text()'))
def check(ok,name):
    checks.append({'name':name,'passed':bool(ok)})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)
    if not ok:raise AssertionError(name)
def opened(browser,size=(1440,960),mobile=False):
    context=browser.new_context(viewport={'width':size[0],'height':size[1]},has_touch=mobile,is_mobile=mobile)
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL);page.wait_for_function('window.render_game_to_text && JSON.parse(window.render_game_to_text()).ui.ready')
    page.wait_for_timeout(650)
    return context,page
def playing(p):p.wait_for_function('JSON.parse(window.render_game_to_text()).ui.audio.musicPlaying',timeout=15000)
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    try:
        c,p=opened(browser)
        check(not state(p)['ui']['audio']['musicPlaying'],'fresh visit clearly waits for user interaction')
        check(p.locator('#music-start-label').inner_text()=='点击开启音乐','visible homepage sound prompt')
        check(p.locator('#audio-toggle').get_attribute('aria-label')=='开启声音','toolbar reflects actual unstarted audio')
        p.locator('#audio-toggle').click();playing(p)
        s=state(p)
        check(s['ui']['mode']=='title' and s['ui']['audio']['cue']=='whispers','first toolbar click plays title music without starting combat')
        check(json.loads(p.evaluate('localStorage.getItem("cinder-below-v1")') or '{}').get('settings',{}).get('music',True),'first toolbar click does not mute the default setting')
        p.locator('#music-start').click();p.wait_for_timeout(200)
        check(not state(p)['ui']['audio']['musicPlaying'],'music button can intentionally mute music')
        p.locator('#act-preview-options [data-act="3"]').click();p.wait_for_timeout(150)
        check(not state(p)['ui']['audio']['musicPlaying'],'preview selection respects deliberate mute')
        p.locator('#music-start').click();playing(p)
        check(state(p)['ui']['audio']['musicPlaying'],'explicit button restarts music')
        for act in range(1,6):
            p.locator(f'#act-preview-options [data-act="{act}"]').click()
            check(state(p)['ui']['titleAct']==act and p.locator(f'#act-preview-options [data-act="{act}"]').get_attribute('aria-pressed')=='true',f'act {act} preview selection')
        p.screenshot(path=str(OUT/'desktop.png'));c.close()
        c,p=opened(browser)
        p.locator('#weapon-options [data-weapon="cinder"]').click();playing(p)
        check(state(p)['ui']['mode']=='title','choosing a loadout starts atmosphere before Play')
        p.locator('#play').click();p.wait_for_function("JSON.parse(window.render_game_to_text()).ui.audio.cue==='catacombs'")
        check(state(p)['ui']['audio']['musicPlaying'],'Play changes to combat music')
        p.locator('#pause-button').click();p.wait_for_timeout(150)
        check(not state(p)['ui']['audio']['musicPlaying'],'pause stops the first-interaction music')
        p.locator('#continue').click();playing(p)
        check(state(p)['ui']['audio']['musicPlaying'],'continue restores the score')
        c.close()
        c,p=opened(browser,(390,844),True)
        p.locator('#weapon-options [data-weapon="cinder"]').tap();playing(p)
        check(state(p)['ui']['mode']=='title' and state(p)['ui']['audio']['musicPlaying'],'native touch starts title music')
        p.screenshot(path=str(OUT/'mobile.png'));c.close()
        c,p=opened(browser)
        p.keyboard.press('m');playing(p)
        check(state(p)['ui']['audio']['musicPlaying'],'first M press enables rather than mutes sound')
        c.close()
        for width,height in [(2048,1152),(320,568),(844,390)]:
            c,p=opened(browser,(width,height),width<900)
            check(p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'no overflow '+str((width,height)))
            p.screenshot(path=str(OUT/f'{width}x{height}.png'));c.close()
        check(not errors,'no browser page errors')
    finally:
        (OUT/'report.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
        browser.close()
