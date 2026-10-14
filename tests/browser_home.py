"""Home, first-run guide and motion lifecycle acceptance in real Chromium.

Homepage/start/resume/guide checks use ordinary UI actions and fresh storage.
The isolated unlocked-weapon case installs an explicit save fixture before load;
it is not evidence of earning those unlocks through combat. The time hook only
advances ordinary keyboard/mouse input; tests never write the running world.
"""
import json
from pathlib import Path
import sys
import time
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa/home-refresh'
OUT.mkdir(parents=True, exist_ok=True)
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4328/src/'
SAVE_KEY = 'cinder-below-v1'
REPORT = {'url': BASE, 'checks': [], 'errors': [], 'console_errors': [], 'screenshots': [],
          'scope': 'Normal application navigation, real input onboarding and read-only motion counters. Only the unlocked-weapon scenario uses a declared preloaded save fixture.'}


def url(manual=False):
    parts = urlsplit(BASE)
    query = dict(parse_qsl(parts.query))
    query.pop('test', None)
    if manual:
        query['test'] = '1'
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def check(ok, name, detail=None):
    REPORT['checks'].append({'name': name, 'passed': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name, flush=True)
    if not ok:
        raise AssertionError(name)


def state(page):
    return json.loads(page.evaluate('window.render_game_to_text()'))


def open_page(browser, name, width=1440, height=960, mobile=False, manual=True, fixture=None):
    context = browser.new_context(viewport={'width': width, 'height': height},
                                  locale='en-US', is_mobile=mobile, has_touch=mobile,
                                  device_scale_factor=1)
    if fixture is not None:
        context.add_init_script('localStorage.setItem(' + json.dumps(SAVE_KEY) + ',' + json.dumps(json.dumps(fixture)) + ');')
    page = context.new_page()
    page.on('pageerror', lambda error: REPORT['errors'].append({'case': name, 'message': str(error)}))
    page.on('console', lambda message: REPORT['console_errors'].append({'case': name, 'message': message.text}) if message.type == 'error' else None)
    page.goto(url(manual), wait_until='domcontentloaded')
    page.wait_for_function('typeof window.render_game_to_text === "function" && JSON.parse(window.render_game_to_text()).ui.ready')
    page.wait_for_timeout(750)
    return context, page


def screenshot(page, name):
    path = OUT / (name + '.png')
    page.screenshot(path=str(path))
    REPORT['screenshots'].append(str(path.relative_to(ROOT)))


def language(page, lang):
    if not state(page)['ui']['language'].startswith(lang):
        page.locator('#language-toggle').click()
        page.wait_for_function('(lang)=>JSON.parse(window.render_game_to_text()).ui.language.startsWith(lang)', arg=lang)
        page.wait_for_timeout(120)


def geometry(page, selector):
    return page.locator(selector).evaluate('''node => {
      const r=node.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {x:r.x,y:r.y,w:r.width,h:r.height,
        inside:r.x>=-.5&&r.y>=-.5&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5,
        reachable:!!hit&&(hit===node||node.contains(hit)),
        visible:!node.hidden&&getComputedStyle(node).visibility!=='hidden'};
    }''')


def reachable(page, selector, case):
    before = geometry(page, selector)
    page.locator(selector).scroll_into_view_if_needed()
    page.wait_for_timeout(120)
    box = geometry(page, selector)
    check(box['visible'] and box['inside'] and box['reachable'] and box['h'] >= 44,
          case + ': ' + selector + ' is visible and reachable with a 44px target', {'initial': before, 'afterScroll': box})


def no_overflow(page, case):
    data = page.evaluate('''() => {
      const home=document.querySelector('#title-screen');
      return {viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,
              homeScroll:home.scrollWidth,homeClient:home.clientWidth};
    }''')
    check(data['document'] <= data['viewport'] + 1 and data['body'] <= data['viewport'] + 1 and data['homeScroll'] <= data['homeClient'] + 1,
          case + ': no horizontal overflow', data)


def return_title(page):
    page.locator('#pause-button').click()
    page.locator('#abandon').click()
    page.wait_for_function("JSON.parse(window.render_game_to_text()).ui.mode==='title'")
    page.wait_for_timeout(650)


def responsive(browser):
    for width, height in [(1440, 960), (390, 844), (320, 568), (844, 390)]:
        for lang in ['zh', 'en']:
            case = f'{width}x{height}-{lang}'
            context, page = open_page(browser, case, width, height, width != 1440)
            language(page, lang)
            no_overflow(page, case)
            check(page.locator('.home-loop > div').count() == 3, case + ': concise three-step guidance is present')
            reachable(page, '#play', case)
            tools = {selector: geometry(page, selector) for selector in ['#language-toggle', '#audio-toggle', '#fullscreen', '#pause-button']}
            check(all(box['inside'] and box['reachable'] and box['w'] >= 44 and box['h'] >= 44 for box in tools.values()),
                  case + ': persistent tools retain accessible hit targets', tools)
            screenshot(page, case + '-new')
            page.locator('#play').click()
            page.wait_for_function("JSON.parse(window.render_game_to_text()).ui.mode==='playing'")
            original = state(page)
            return_title(page)
            page.wait_for_selector('#resume-run', state='visible')
            no_overflow(page, case + '-resume')
            reachable(page, '#resume-run', case)
            reachable(page, '#play', case + '-with-checkpoint')
            screenshot(page, case + '-resume')
            page.locator('#resume-run').click()
            page.wait_for_function("JSON.parse(window.render_game_to_text()).ui.mode==='playing'")
            resumed = state(page)
            check(resumed['seed'] == original['seed'] and resumed['room'] == original['room'] and resumed['player']['weapon'] == original['player']['weapon'],
                  case + ': Continue opens the existing checkpoint instead of a new run')
            check(page.locator('#first-run-guide').is_hidden() and not resumed['ui'].get('guide'),
                  case + ': Continue does not repeat first-run guidance', resumed['ui'].get('guide'))
            context.close()


def weapon_choices(browser):
    fixture = {'version': 1, 'revision': 0,
               'stats': {'runs': 2, 'wins': 0, 'kills': 50, 'rooms': 10, 'embers': 80, 'bestRoom': 8},
               'settings': {'music': False, 'sfx': False, 'reduceMotion': False},
               'checkpoint': None, 'banked': {'kills': 0, 'rooms': 0, 'embers': 0},
               'unlocks': ['cinder', 'scatter', 'needle']}
    context, page = open_page(browser, 'declared-unlocked-weapon-fixture', fixture=fixture)
    check(state(page)['ui']['unlockedWeapons'] == ['cinder', 'scatter', 'needle'], 'declared weapon fixture exposes the three legitimately supported loadouts')
    for lang in ['zh', 'en']:
        language(page, lang)
        for index, weapon in enumerate(['cinder', 'scatter', 'needle']):
            page.locator('.weapon-choice').nth(index).click()
            selected = page.locator('.weapon-choice[aria-pressed=true]')
            description = selected.get_attribute('title')
            detail = page.locator('#weapon-detail').inner_text()
            check(selected.count() == 1 and state(page)['ui']['selectedWeapon'] == weapon and description and description in detail,
                  f'{lang} {weapon}: selected weapon and visible description agree', {'description': description, 'detail': detail})
            page.locator('#play').click()
            page.wait_for_function("JSON.parse(window.render_game_to_text()).ui.mode==='playing'")
            check(state(page)['player']['weapon'] == weapon, f'{lang} {weapon}: the chosen loadout is used in the actual run')
            return_title(page)
    context.close()


def first_run(browser):
    context, page = open_page(browser, 'real-input-first-run')
    page.locator('#play').click()
    page.wait_for_selector('#first-run-guide', state='visible')
    check(state(page)['ui']['guide']['stepId'] == 'move', 'first fresh run begins with movement guidance')
    # Try real movement keys; a procedural wall can block the first direction.
    for key in ['d', 's', 'a', 'w']:
        page.keyboard.down(key)
        page.evaluate('window.advanceTime(450)')
        page.keyboard.up(key)
        if state(page)['ui']['guide']['stepId'] != 'move':
            break
    check(state(page)['ui']['guide']['stepId'] == 'shoot', 'actual WASD movement advances the first guide step', state(page)['ui']['guide'])
    box = page.locator('#world').bounding_box()
    page.mouse.move(box['x'] + box['width'] * .8, box['y'] + box['height'] * .45)
    page.mouse.down()
    page.evaluate('window.advanceTime(160)')
    page.mouse.up()
    check(state(page)['stats']['shots'] > 0 and state(page)['ui']['guide']['stepId'] == 'dash', 'actual held mouse fire advances the shooting step')
    screenshot(page, 'first-run-dash-guide')
    page.keyboard.down('Space')
    page.evaluate('window.advanceTime(60)')
    page.keyboard.up('Space')
    page.evaluate('window.advanceTime(40)')
    completed = state(page)
    check(completed['ui']['guide']['complete'] and page.locator('#first-run-guide').is_hidden(), 'an actual Space dash completes and dismisses the nonblocking guide', completed['ui']['guide'])
    check(completed['player']['dashCooldown'] > 0, 'guide completion corresponds to a real dash cooldown')
    return_title(page)
    page.locator('#resume-run').click()
    page.wait_for_function("JSON.parse(window.render_game_to_text()).ui.mode==='playing'")
    check(page.locator('#first-run-guide').is_hidden() and not state(page)['ui'].get('guide'), 'resuming the demonstrated run does not restart onboarding')
    context.close()


def motion_lifecycle(browser):
    context, page = open_page(browser, 'real-time-motion', manual=False)
    first = state(page)['ui']['motion']
    page.wait_for_timeout(450)
    second = state(page)['ui']['motion']
    check(not first['reduced'] and second['animating'] and second['drawCount'] > first['drawCount'] and second['titleTime'] > first['titleTime'],
          'normal title uses a genuinely advancing preview clock and draw loop', {'before': first, 'after': second})
    screenshot(page, 'desktop-animated-title')
    page.locator('#pause-button').click()
    page.wait_for_timeout(250)
    first = state(page)['ui']['motion']
    page.wait_for_timeout(450)
    second = state(page)['ui']['motion']
    check(not second['animating'] and second['drawCount'] == first['drawCount'] and second['titleTime'] == first['titleTime'],
          'paused title stops both its preview clock and repeated canvas drawing', {'before': first, 'after': second})
    page.locator('#setting-motion').check()
    page.locator('#continue').click()
    page.wait_for_timeout(250)
    first = state(page)['ui']['motion']
    page.wait_for_timeout(450)
    second = state(page)['ui']['motion']
    css = page.evaluate("({flag:document.body.dataset.reduceMotion,heading:getComputedStyle(document.querySelector('.title-heading')).animationName,button:getComputedStyle(document.querySelector('#play'),'::after').animationName})")
    check(second['reduced'] and not second['animating'] and second['drawCount'] == first['drawCount'] and second['titleTime'] == first['titleTime'],
          'manual Reduce effects makes the title truly static without repeated drawing', {'before': first, 'after': second})
    check(css['flag'] == 'true' and css['heading'] == 'none' and css['button'] == 'none', 'manual motion preference also disables CSS reveals and button sheen', css)
    page.locator('#pause-button').click()
    page.locator('#setting-motion').uncheck()
    page.locator('#continue').click()
    page.wait_for_timeout(350)
    check(state(page)['ui']['motion']['animating'] and not state(page)['ui']['motion']['reduced'], 'turning manual reduction off wakes the title animation')
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_timeout(250)
    first = state(page)['ui']['motion']
    page.wait_for_timeout(450)
    second = state(page)['ui']['motion']
    check(second['reduced'] and not second['animating'] and second['drawCount'] == first['drawCount'], 'changing the OS motion preference immediately stops title redraws', {'before': first, 'after': second})
    check(page.evaluate("getComputedStyle(document.querySelector('#play'),'::after').animationName") == 'none', 'OS motion reduction disables CSS decoration')
    page.emulate_media(reduced_motion='no-preference')
    page.wait_for_timeout(350)
    check(state(page)['ui']['motion']['animating'], 'restoring the OS preference resumes the title')
    context.close()


started = time.perf_counter()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        REPORT['browser'] = browser.version
        try:
            responsive(browser)
            weapon_choices(browser)
            first_run(browser)
            motion_lifecycle(browser)
        finally:
            browser.close()
except Exception as error:
    REPORT['failure'] = str(error)
    print('STOP ' + str(error), flush=True)
REPORT['wall_seconds'] = round(time.perf_counter() - started, 2)
REPORT['passed'] = not REPORT.get('failure') and all(row['passed'] for row in REPORT['checks']) and not REPORT['errors'] and not REPORT['console_errors']
(OUT/'report.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'passed': REPORT['passed'], 'checks': len(REPORT['checks']), 'failure': REPORT.get('failure'), 'errors': REPORT['errors'], 'console_errors': REPORT['console_errors']}, ensure_ascii=False), flush=True)
sys.exit(0 if REPORT['passed'] else 1)
