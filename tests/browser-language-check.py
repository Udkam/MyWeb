"""Focused language regression; run only after the local server is ready.

Normal visible controls + public time/read hooks. No combat state manipulation.
The only storage fixtures are a genuine UI-earned v1 save without language and
an explicitly corrupt JSON value, to verify backwards compatibility/recovery.
Usage: python tests/browser-language-check.py http://127.0.0.1:PORT/src/?test=1
"""
import json
import math
import pathlib
import re
import sys
import time

from playwright.sync_api import sync_playwright
from browser_navigation import waypoint_to, die_from_real_damage

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa' / 'language'
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4329/src/?test=1'
SAVE_KEY = 'cinder-below-v1'
REPORT = {'url': URL, 'browser_locale': 'en-US', 'checks': [], 'errors': [], 'console_errors': [], 'screenshots': [], 'scenarios': {}}
HAN = re.compile(r'[\u3400-\u9fff]')


def check(condition, name, detail=None, fatal=True):
    REPORT['checks'].append({'name': name, 'passed': bool(condition), 'detail': detail})
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)
    if not condition and fatal: raise AssertionError(name)


def read(page):
    return json.loads(page.evaluate('window.render_game_to_text()'))


def flush(page):
    page.evaluate('window.advanceTime(0)')
    return read(page)


def saved(page):
    raw = page.evaluate('(key) => localStorage.getItem(key)', SAVE_KEY)
    return json.loads(raw) if raw else None


def language(page):
    return page.locator('html').get_attribute('lang') or ''


def core(s):
    return {key: s.get(key) for key in ['seed', 'room', 'wave', 'phase', 'player', 'relics', 'stats']} | {'lifetime': s['ui']['lifetime']}


def open_page(context, name):
    context.add_init_script('''(() => {
      const original = CanvasRenderingContext2D.prototype.fillText;
      window.__qaCanvasTexts = [];
      CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
        window.__qaCanvasTexts.push(String(text));
        if (window.__qaCanvasTexts.length > 200) window.__qaCanvasTexts.shift();
        return original.call(this, text, ...args);
      };
    })();''')
    page = context.new_page()
    page.on('pageerror', lambda error: REPORT['errors'].append({'scenario': name, 'message': str(error)}))
    page.on('console', lambda msg: REPORT['console_errors'].append({'scenario': name, 'message': msg.text}) if msg.type == 'error' else None)
    page.goto(URL, wait_until='domcontentloaded')
    page.wait_for_function("typeof window.render_game_to_text === 'function' && JSON.parse(window.render_game_to_text()).ui.ready")
    return page


def capture(page, name):
    target = OUT / name
    page.screenshot(path=str(target), full_page=True)
    REPORT['screenshots'].append(str(target))


def canvas_text(page):
    page.evaluate('window.__qaCanvasTexts = []')
    flush(page)
    return page.evaluate('Array.from(new Set(window.__qaCanvasTexts))')


def toggle(page, expected, in_menu=False):
    if in_menu:
        candidates = ['#menu-language-toggle', '#setting-language', '#menu #language-toggle', '#menu [data-action="language"]']
        control = None
        for selector in candidates:
            node = page.locator(selector)
            if node.count() and node.first.is_visible(): control = node.first; break
        if control is None: raise AssertionError('The open modal needs a reachable language control; the background toggle is inert')
        if control.evaluate('(el) => el.tagName') == 'SELECT':
            options = control.locator('option').evaluate_all('(nodes) => nodes.map(el => ({value:el.value,text:el.textContent}))')
            desired = next((o['value'] for o in options if o['value'].lower().startswith(expected)), None)
            if desired is None: raise AssertionError(f'No {expected} language option: {options}')
            control.select_option(desired)
        else: control.click()
    else:
        page.locator('#language-toggle').click()
    flush(page)
    check(language(page).lower().startswith(expected), f'language switches immediately to {expected}', language(page))


def set_keys(page, held, desired):
    for key in held - desired: page.keyboard.up(key)
    for key in desired - held: page.keyboard.down(key)
    return desired


def unobstructed(s, a, b):
    steps = max(1, math.ceil(math.dist(a, b) / 8))
    for i in range(steps + 1):
        x, y = a[0] + (b[0]-a[0])*i/steps, a[1] + (b[1]-a[1])*i/steps
        for o in s['obstacles']:
            if o['x']-7 < x < o['x']+o['w']+7 and o['y']-7 < y < o['y']+o['h']+7: return False
    return True


def clear_first_room(page):
    before = read(page)
    page.keyboard.down('a'); page.evaluate('(ms) => window.advanceTime(ms)', 250); page.keyboard.up('a')
    moved = read(page)
    check(math.hypot(moved['player']['x']-before['player']['x'], moved['player']['y']-before['player']['y']) > 20, 'localized game still accepts actual movement')
    held = set(); firing = False
    for _ in range(270):
        s = read(page)
        if s['phase'] != 'combat': break
        p = s['player']; origin = (p['x'], p['y'])
        visible = [e for e in s['enemies'] if unobstructed(s, origin, (e['x'], e['y']))]
        target = min(visible or s['enemies'], key=lambda e: math.hypot(e['x']-p['x'],e['y']-p['y']))
        distance = math.hypot(target['x']-p['x'],target['y']-p['y'])
        desired = set()
        if not visible:
            waypoint = waypoint_to(s, (target['x'], target['y']))
            dx, dy = waypoint[0] - p['x'], waypoint[1] - p['y']
            desired = ({'d'} if dx > 6 else {'a'} if dx < -6 else set()) | ({'s'} if dy > 6 else {'w'} if dy < -6 else set())
        elif distance < 130:
            # Try short, genuinely clear retreat steps; do not hold a key into cover.
            bottom = s['height'] - (150 if s['height'] > s['width'] else 28)
            candidates = [(dx,dy) for dx,dy in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]
                if 44 <= p['x']+dx*42 <= s['width']-44 and 82 <= p['y']+dy*42 <= bottom-16
                and unobstructed(s, origin, (p['x']+dx*42,p['y']+dy*42))]
            if candidates:
                dx,dy = max(candidates,key=lambda d: math.hypot(p['x']+d[0]*42-target['x'],p['y']+d[1]*42-target['y']))
                desired = ({'d'} if dx > 0 else {'a'} if dx < 0 else set()) | ({'s'} if dy > 0 else {'w'} if dy < 0 else set())
        held = set_keys(page, held, desired)
        box = page.locator('#world').bounding_box()
        page.mouse.move(box['x']+target['x']/s['width']*box['width'],box['y']+target['y']/s['height']*box['height'])
        if not firing: page.mouse.down(); firing = True
        if p['novaCharge'] >= p['novaMax'] and distance < 130: page.keyboard.press('e')
        page.evaluate('(ms) => window.advanceTime(ms)', 150)
    set_keys(page, held, set())
    if firing: page.mouse.up()
    outcome = read(page)
    check(outcome['phase'] == 'reward' and outcome['stats']['rooms'] == 1 and outcome['stats']['kills'] >= 3, 'actual shots clear first room and show real reward', outcome['stats'])
    return outcome


def live_flow(browser):
    context = browser.new_context(viewport={'width':1440,'height':960},locale='en-US',accept_downloads=True)
    page = open_page(context,'fresh-and-gameplay')
    check(language(page).lower().startswith('zh'), 'fresh en-US browser defaults to Chinese', language(page))
    check(HAN.search(page.locator('#play').inner_text()) is not None, 'Chinese title Play control')
    weapon_text = page.locator('#weapon-options').inner_text()
    check(HAN.search(weapon_text) is not None and 'Cinderbolt' not in weapon_text, 'weapon names default to Chinese', weapon_text)
    toggle(page,'en')
    check('Enter the rift' in page.locator('#play').inner_text(), 'English title updates without reload')
    page.reload(); page.wait_for_function("JSON.parse(window.render_game_to_text()).ui.ready")
    check(language(page).startswith('en') and 'Enter the rift' in page.locator('#play').inner_text(), 'English preference survives reload')
    toggle(page,'zh')
    page.locator('#play').click(); initial = read(page)
    check(HAN.search(page.locator('#room-banner').inner_text()) is not None, 'room banner is Chinese after starting')
    reward = clear_first_room(page)
    check(HAN.search(page.locator('#reward-title').inner_text()) is not None, 'reward heading is Chinese')
    names = page.locator('.relic-card .relic-name').all_text_contents()
    check(len(names) == 3 and all(HAN.search(text) for text in names), 'all three actual relic choices have Chinese names', names)
    capture(page,'zh-reward.png')
    stable = core(reward); choice_ids = [c['id'] for c in reward['choices']]
    stored_reward = page.evaluate('(key) => localStorage.getItem(key)', SAVE_KEY)
    toggle(page,'en'); english = read(page)
    check(core(english) == stable and [c['id'] for c in english['choices']] == choice_ids, 'reward language switch preserves world, offered choices and banked lifetime')
    toggle(page,'zh'); chinese = read(page)
    check(core(chinese) == stable, 'switching reward back does not duplicate room reward or bankProgress')
    check(page.evaluate('(key) => localStorage.getItem(key)', SAVE_KEY) == stored_reward, 'language roundtrip leaves the game save byte-for-byte unchanged')
    for width, height in [(844,390),(320,568)]:
        page.set_viewport_size({'width':width,'height':height})
        flush(page)
        boxes=geometry(page,['#language-toggle']+[f'#relic-choices button:nth-child({i})' for i in (1,2,3)])
        capture(page,f'zh-reward-{width}x{height}.png')
        check(all(b['w']>0 and b['h']>0 and b['inside'] and b['reachable'] for b in boxes), f'{width}x{height}: Chinese relic cards and language button are not clipped', boxes)
        if width > height:
            heading = page.evaluate('''() => {
              const a=document.querySelector('.reward-heading').getBoundingClientRect();
              const b=document.querySelector('#topbar').getBoundingClientRect();
              return {headingTop:a.top,topbarBottom:b.bottom};
            }''')
            check(heading['headingTop'] >= heading['topbarBottom']+2, f'{width}x{height}: Chinese reward heading clears the top HUD', heading, fatal=False)
    page.set_viewport_size({'width':1440,'height':960});flush(page)
    legacy = saved(page)
    check(legacy is not None and legacy['version'] == 1 and legacy['stats']['rooms'] >= 1, 'capture a genuine UI-earned v1 save for legacy migration')
    legacy['settings'] = {key:legacy['settings'][key] for key in ['music','sfx','reduceMotion']}
    legacy = {key:legacy[key] for key in ['version','revision','stats','settings','checkpoint','banked','unlocks'] if key in legacy}
    (OUT/'legacy-v1-earned.json').write_text(json.dumps(legacy,ensure_ascii=False,indent=2),encoding='utf-8')
    page.locator('#relic-choices button').first.click(); exit_state = flush(page)
    gate_text = canvas_text(page)
    check(exit_state['phase'] == 'exit' and len(gate_text) >= 2 and all(HAN.search(text) for text in gate_text), 'Canvas draws both exit labels in Chinese', gate_text)
    capture(page,'zh-gates.png')
    stable_exit = core(exit_state)
    toggle(page,'en'); english_exit = read(page)
    english_gate_text = canvas_text(page)
    check(core(english_exit) == stable_exit and any('HUNT' in text for text in english_gate_text) and any('REFUGE' in text for text in english_gate_text), 'Canvas exit labels switch to English without advancing the run', english_gate_text)
    toggle(page,'zh')
    # A short normal loss path exercises the localized finish screen, not a complete run.
    page.locator('#pause-button').click(); page.locator('#abandon').click(); page.locator('#play').click()
    death_evidence = die_from_real_damage(page)
    end = read(page)
    check(end['phase']=='dead','normal enemy damage reaches actual end screen',{'stats':end['stats'],'damage':death_evidence})
    check(all(HAN.search(page.locator(selector).inner_text()) for selector in ['#end-title','#end-copy','#retry']), 'end title, explanation and retry control are Chinese')
    stable_end=core(end);toggle(page,'en');check(core(read(page))==stable_end,'end-screen language switch does not bank a second result')
    toggle(page,'zh'); capture(page,'zh-death.png')
    REPORT['scenarios']['live']={'seed':initial['seed'],'first_room_stats':reward['stats'],'death_stats':end['stats'],'legacy_stats':legacy['stats']}
    context.close()
    return legacy


def compatibility_and_menu(browser,legacy):
    context=browser.new_context(viewport={'width':1280,'height':900},locale='en-US')
    context.add_init_script('if (!localStorage.getItem('+json.dumps(SAVE_KEY)+')) localStorage.setItem('+json.dumps(SAVE_KEY)+','+json.dumps(json.dumps(legacy))+');')
    page=open_page(context,'legacy-and-menu')
    check(language(page).startswith('zh'),'legacy v1 missing language also defaults to Chinese')
    loaded=read(page)
    check(loaded['ui']['lifetime']==legacy['stats'],'legacy v1 lifetime progress is unchanged',loaded['ui']['lifetime'])
    check(saved(page)['checkpoint']==legacy['checkpoint'],'legacy v1 room checkpoint is retained')
    page.locator('#resume-run').click(); resumed=read(page)
    check(resumed['seed']==legacy['checkpoint']['seed'] and resumed['room']==legacy['checkpoint']['room'],'legacy checkpoint resumes its real seed and room')
    page.locator('#pause-button').click();paused=flush(page);stable=core(paused)
    check(paused['ui']['paused'] and paused['ui']['menuOpen'],'pause menu is open before language change')
    toggle(page,'en',True);after=read(page)
    check(after['ui']['paused'] and after['ui']['menuOpen'] and core(after)==stable,'changing language inside pause keeps the menu and run paused without resetting')
    check('Music' in page.locator('#menu-body').inner_text(),'open menu content immediately becomes English')
    toggle(page,'zh',True);check(core(read(page))==stable,'pause language roundtrip preserves progress and lifetime')
    check(HAN.search(page.locator('#menu-body').inner_text()) is not None,'open menu content returns to Chinese')
    page.locator('#import-file').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'{broken'})
    page.wait_for_timeout(50)
    invalid_text=page.locator('#toast').inner_text()
    check(HAN.search(invalid_text) is not None and 'This JSON save' not in invalid_text,'invalid JSON import error is Chinese',invalid_text)
    before=saved(page)
    page.locator('#import-file').set_input_files({'name':'legacy.json','mimeType':'application/json','buffer':json.dumps(legacy).encode('utf-8')})
    page.locator('#confirm-import').wait_for(state='visible')
    confirmation=page.locator('#menu-body').inner_text()
    check(HAN.search(confirmation) is not None and HAN.search(page.locator('#cancel-import').inner_text()) is not None,'safe import confirmation and cancel are Chinese',confirmation)
    check(saved(page)['stats']==before['stats'] and saved(page)['checkpoint']==before['checkpoint'],'showing import confirmation does not apply the backup')
    page.locator('#cancel-import').click();check(saved(page)['stats']==before['stats'] and core(read(page))==stable,'cancel import preserves progress and paused run')
    REPORT['scenarios']['legacy']={'stats':loaded['ui']['lifetime'],'seed':resumed['seed'],'room':resumed['room'],'invalid_message':invalid_text,'confirmation':confirmation}
    context.close()


def corrupt_save(browser):
    context=browser.new_context(locale='en-US')
    context.add_init_script('localStorage.setItem('+json.dumps(SAVE_KEY)+',"{broken-v1");')
    page=open_page(context,'corrupt-save')
    s=read(page);message=page.locator('#load-message').inner_text()
    check(s['ui']['storageStatus']=='corrupt' and HAN.search(message) is not None,'existing corrupt-save warning is Chinese',message)
    toggle(page,'en');toggle(page,'zh')
    check(page.evaluate('(key)=>localStorage.getItem(key)',SAVE_KEY)=='{broken-v1','language changes do not overwrite a corrupt game save')
    context.close()


def geometry(page,selectors):
    return page.evaluate('''selectors=>selectors.map(selector=>{
      const n=document.querySelector(selector),r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {selector,x:r.x,y:r.y,w:r.width,h:r.height,inside:r.x>=-0.5&&r.y>=-0.5&&r.right<=innerWidth+0.5&&r.bottom<=innerHeight+0.5,reachable:!!hit&&(hit===n||n.contains(hit))};
    })''',selectors)


def responsive(browser):
    for width,height in [(320,844),(390,844),(844,390)]:
        context=browser.new_context(viewport={'width':width,'height':height},locale='en-US',is_mobile=True,has_touch=True)
        page=open_page(context,f'responsive-{width}x{height}')
        for lang in ['zh','en']:
            if not language(page).startswith(lang):toggle(page,lang)
            boxes=geometry(page,['#language-toggle','#audio-toggle','#fullscreen','#pause-button','#play'])
            check(all(b['w']>=44 and b['h']>=44 and b['inside'] and b['reachable'] for b in boxes),f'{width}x{height} {lang}: primary controls fit and remain reachable',boxes)
            overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth || document.body.scrollWidth>innerWidth')
            check(not overflow,f'{width}x{height} {lang}: no horizontal overflow')
        toggle(page,'zh');page.locator('#play').tap()
        boxes=geometry(page,['#language-toggle','#move-stick','#aim-stick','#dash','#nova'])
        check(all(b['w']>=44 and b['h']>=44 and b['inside'] and b['reachable'] for b in boxes),f'{width}x{height}: Chinese gameplay controls stay in viewport',boxes)
        if width in (320,844):capture(page,f'zh-{width}x{height}.png')
        context.close()


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    started=time.perf_counter()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True)
            REPORT['browser']=browser.version
            try:
                legacy=live_flow(browser)
                compatibility_and_menu(browser,legacy)
                corrupt_save(browser)
                responsive(browser)
            finally:browser.close()
    except Exception as error:
        REPORT['failure']=str(error);print('STOP '+str(error),flush=True)
    REPORT['wall_seconds']=round(time.perf_counter()-started,2)
    REPORT['passed']=not REPORT.get('failure') and all(c['passed'] for c in REPORT['checks']) and not REPORT['errors'] and not REPORT['console_errors']
    (OUT/'report.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'passed':REPORT['passed'],'checks':len(REPORT['checks']),'failure':REPORT.get('failure'),'errors':REPORT['errors'],'console_errors':REPORT['console_errors']},ensure_ascii=False),flush=True)
    return 0 if REPORT['passed'] else 1


if __name__=='__main__':raise SystemExit(main())
