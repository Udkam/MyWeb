"""Anonymous production acceptance using actual browser input and real RAF time.

No private APIs, time acceleration, save injection or world mutation. State hooks
are read only; mobile gestures use Chromium's native touch input protocol.
"""
import json
import hashlib
import math
import pathlib
import time
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tests'))
from browser_navigation import waypoint_to
OUT = ROOT / '.qa' / 'production-v7'
OUT.mkdir(parents=True, exist_ok=True)
URL = (sys.argv[1] if len(sys.argv)>1 else 'https://foreseer.site/cinder-below/').rstrip('/')
REPORT = {'url': URL, 'date': '2026-10-15', 'expected_source_commit': sys.argv[2] if len(sys.argv)>2 else None, 'method': 'Anonymous browser contexts, normal RAF and mouse/keyboard/native multitouch; render_game_to_text read only', 'checks': [], 'page_errors': [], 'console_errors': [], 'resource_failures': [], 'screenshots': []}
DIST = ROOT / 'dist'


def check(condition, name, details=None):
    REPORT['checks'].append({'name': name, 'passed': bool(condition), 'details': details})
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)
    if not condition: raise AssertionError(name)


def state(page):
    return json.loads(page.evaluate('window.render_game_to_text()'))


def monitor(page, label):
    page.on('pageerror', lambda error: REPORT['page_errors'].append({'surface': label, 'error': str(error)}))
    page.on('console', lambda message: REPORT['console_errors'].append({'surface': label, 'error': message.text}) if message.type == 'error' else None)
    def failed_request(request):
        item = {'surface':label, 'url':request.url, 'failure':request.failure, 'resource_type':request.resource_type}
        if getattr(page, '_qa_closing', False) and request.failure == 'net::ERR_ABORTED':
            REPORT.setdefault('teardown_cancellations', []).append(item)
        else:
            REPORT['resource_failures'].append(item)
    page.on('requestfailed', failed_request)
    page.on('response', lambda response: REPORT['resource_failures'].append({'surface': label, 'url': response.url, 'status': response.status}) if response.status >= 400 else None)


def open_game(context, label):
    page = context.new_page(); monitor(page, label)
    response = page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    check(response.status == 200, f'{label}: anonymous public HTTP 200', {'status': response.status, 'final_url': page.url})
    page.wait_for_function("typeof window.render_game_to_text === 'function' && JSON.parse(window.render_game_to_text()).ui.ready", timeout=45000)
    check(page.title() == 'Cinder Below', f'{label}: English document title', page.title())
    check('CINDER' in page.locator('#game-title').inner_text() and 'BELOW' in page.locator('#game-title').inner_text(), f'{label}: actual title screen visible')
    check(page.locator('html').get_attribute('lang') == 'zh-CN', f'{label}: new visitor sees Chinese by default')
    art=state(page)['ui']['art']
    check(art['loaded']==art['total'] and art['total']>=91, f'{label}: all original sprite sheets load', art)
    return page


def screenshot(page, name):
    target = OUT / name
    page.screenshot(path=str(target), full_page=True)
    REPORT['screenshots'].append(str(target))


def held_keys(page, current, wanted):
    for key in current - wanted: page.keyboard.up(key)
    for key in wanted - current: page.keyboard.down(key)
    return wanted


def desktop(browser):
    context = browser.new_context(viewport={'width': 1440, 'height': 960}, device_scale_factor=1)
    page = open_game(context, 'desktop')
    screenshot(page, 'desktop-title.png')
    for act in range(1,6):
        page.locator(f'#act-preview-options [data-act="{act}"]').click()
        check(state(page)['ui']['titleAct']==act, f'desktop: public act {act} preview changes')
    page.wait_for_function('JSON.parse(window.render_game_to_text()).ui.audio.musicPlaying')
    check(state(page)['ui']['mode']=='title', 'desktop: first ordinary interaction starts title music before combat')
    files = ['engine.js','monsters.js','app.js','renderer.js','input.js','storage.js','styles.css','home.css','polish.css','onboarding.js','i18n.js','field-guide.js','audio.js','rooms.js','discovery.js']
    files += [str(path.relative_to(DIST)).replace(chr(92),'/') for path in (DIST/'assets'/'music').glob('*.ogg')]
    files += [str(path.relative_to(DIST)).replace('\\','/') for path in DIST.rglob('*.json') if 'manifest' in path.name or 'asset-map' in path.name]
    REPORT['public_hashes'] = []
    for name in files:
        response = page.evaluate("""async name => {
          const response = await fetch(new URL(name, location.href));
          const bytes = await response.arrayBuffer();
          const hash = await crypto.subtle.digest('SHA-256', bytes);
          return {status:response.status, sha256:Array.from(new Uint8Array(hash), n=>n.toString(16).padStart(2,'0')).join('')};
        }""", name)
        entry = {'file':name,'http_status':response['status']}
        if response['status'] == 200:
            entry['public_sha256'] = response['sha256']
            entry['local_sha256'] = hashlib.sha256((DIST/name).read_bytes()).hexdigest()
            entry['matches'] = entry['public_sha256'] == entry['local_sha256']
        REPORT['public_hashes'].append(entry)
    check(all(item.get('matches') for item in REPORT['public_hashes']), 'desktop: anonymous static resources match canonical dist SHA256', REPORT['public_hashes'])
    page.locator('#play').click(); page.wait_for_timeout(150)
    initial = state(page); seed = initial['seed']
    check(initial['phase'] == 'combat' and initial['room'] == 1 and initial['player']['hp'] == 6, 'desktop: fresh anonymous run begins normally', {'seed': seed, 'hp': initial['player']['hp']})
    check(initial['totalRooms']==15, 'desktop: published game has five acts and fifteen rooms')
    page.locator('#pause-button').click()
    page.wait_for_timeout(120)
    before=page.evaluate('localStorage.getItem("cinder-below-v1")')
    page.locator('#menu-language-toggle').click()
    check(page.locator('html').get_attribute('lang')=='en', 'desktop: public English switch works')
    page.locator('#menu-language-toggle').click()
    check(page.locator('html').get_attribute('lang')=='zh-CN' and page.evaluate('localStorage.getItem("cinder-below-v1")')==before, 'desktop: returning to Chinese preserves progress bytes')
    page.locator('#continue').click()
    page.keyboard.down('a'); page.wait_for_timeout(350); page.keyboard.up('a')
    moved = state(page)
    displacement = math.hypot(moved['player']['x'] - initial['player']['x'], moved['player']['y'] - initial['player']['y'])
    check(displacement > 25 and moved['time'] > initial['time'], 'desktop: real WASD movement under normal RAF', {'distance': round(displacement, 2), 'simulation_delta': round(moved['time'] - initial['time'], 2)})
    page.keyboard.down('w'); page.wait_for_timeout(350); page.keyboard.up('w')
    # Aim at an actual living target, updating through real pointer movement.
    mouse_down = False
    attack_keys = set()
    for _ in range(70):
        s = state(page)
        if s['phase'] != 'combat': break
        target = min(s['enemies'], key=lambda e: math.hypot(e['x'] - s['player']['x'], e['y'] - s['player']['y']))
        box = page.locator('#world').bounding_box()
        page.mouse.move(box['x'] + target['x'] / s['width'] * box['width'], box['y'] + target['y'] / s['height'] * box['height'])
        if not mouse_down: page.mouse.down(); mouse_down = True
        point = waypoint_to(s, (target['x'], target['y']))
        dx, dy = point[0]-s['player']['x'], point[1]-s['player']['y']
        distance = math.hypot(target['x']-s['player']['x'], target['y']-s['player']['y'])
        wanted = (({'d'} if dx>7 else {'a'} if dx < -7 else set()) | ({'s'} if dy>7 else {'w'} if dy < -7 else set())) if distance > 105 else set()
        attack_keys = held_keys(page, attack_keys, wanted)
        page.wait_for_timeout(120)
        if state(page)['stats']['hits'] > 0: break
    held_keys(page, attack_keys, set())
    if mouse_down: page.mouse.up()
    attacked = state(page)
    check(attacked['stats']['shots'] > 0, 'desktop: holding mouse produces actual shots', attacked['stats'])
    check(attacked['stats']['hits'] > 0 or attacked['stats']['kills'] > 0, 'desktop: projectiles actually hit an enemy', attacked['stats'])
    check(attacked['ui']['audio']['musicPlaying'] and attacked['ui']['audio']['context'] == 'running' and attacked['ui']['audio']['position'] > .2, 'desktop: downloaded music plays after pause and resume', attacked['ui']['audio'])
    screenshot(page, 'desktop-combat.png')
    # Deliberately approach enemies with ordinary movement and stop firing, so damage
    # and the real loss/retry path are observable without setting health values.
    current_keys = set()
    deadline = time.perf_counter() + 32
    damage_before = attacked['stats']['damageTaken']
    while time.perf_counter() < deadline:
        s = state(page)
        if s['phase'] in ('dead', 'reward'): break
        enemy = min(s['enemies'], key=lambda e: math.hypot(e['x'] - s['player']['x'], e['y'] - s['player']['y']))
        waypoint = waypoint_to(s, (enemy['x'], enemy['y']))
        dx, dy = waypoint[0] - s['player']['x'], waypoint[1] - s['player']['y']
        wanted = ({'d'} if dx > 15 else {'a'} if dx < -15 else set()) | ({'s'} if dy > 15 else {'w'} if dy < -15 else set())
        current_keys = held_keys(page, current_keys, wanted)
        page.wait_for_timeout(200)
    held_keys(page, current_keys, set())
    outcome = state(page)
    check(outcome['stats']['damageTaken'] > damage_before or outcome['phase'] == 'reward', 'desktop: real damage or first-room clear observed', {'phase': outcome['phase'], 'damage': outcome['stats']['damageTaken'], 'hp': outcome['player']['hp']})
    if outcome['phase'] == 'dead':
        screenshot(page, 'desktop-death.png')
        page.locator('#retry').click(); page.wait_for_timeout(100)
        retry = state(page)
        check(retry['phase'] == 'combat' and retry['room'] == 1 and retry['player']['hp'] == 6 and retry['seed'] != seed, 'desktop: real death screen restarts a fresh run', {'old_seed': seed, 'new_seed': retry['seed'], 'hp': retry['player']['hp']})
    REPORT['desktop'] = {'seed': seed, 'movement': displacement, 'attacked': attacked['stats'], 'outcome': outcome['phase'], 'ending_stats': outcome['stats']}
    page._qa_closing = True
    context.close()


def geometries(page, selectors):
    return page.evaluate("""selectors => selectors.map(selector => {
      const node=document.querySelector(selector),r=node.getBoundingClientRect();
      const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {selector,x:r.x,y:r.y,width:r.width,height:r.height,reachable:!!hit&&(hit===node||node.contains(hit)),inside:r.x>=0&&r.y>=0&&r.right<=innerWidth+0.5&&r.bottom<=innerHeight+0.5};
    })""", selectors)


def mobile(browser, width, touch_test):
    context = browser.new_context(viewport={'width': width, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    page = open_game(context, f'mobile-{width}')
    page.locator('#play').tap(); page.wait_for_timeout(120)
    boxes = geometries(page, ['#move-stick', '#aim-stick', '#dash', '#nova', '#pause-button', '#audio-toggle', '#fullscreen', '#language-toggle'])
    check(all(b['width'] >= 44 and b['height'] >= 44 and b['inside'] and b['reachable'] for b in boxes), f'mobile-{width}: sticks and buttons have reachable 44px targets', boxes)
    overflow = page.evaluate('({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth})')
    check(overflow['document'] <= width and overflow['body'] <= width, f'mobile-{width}: no horizontal overflow', overflow)
    data = {'width': width, 'geometry': boxes, 'overflow': overflow}
    if touch_test:
        cdp = context.new_cdp_session(page)
        move = boxes[0]; aim = boxes[1]
        centers = [(move['x'] + move['width']/2, move['y'] + move['height']/2), (aim['x'] + aim['width']/2, aim['y'] + aim['height']/2)]
        def point(i, x, y): return {'id': i, 'x': x, 'y': y, 'radiusX': 5, 'radiusY': 5, 'force': 1}
        before = state(page)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [point(i+1, *pos) for i, pos in enumerate(centers)]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [point(1, centers[0][0]-28, centers[0][1]-20), point(2, centers[1][0], centers[1][1]-34)]})
        page.wait_for_timeout(450)
        during = state(page)
        moved = math.hypot(during['player']['x']-before['player']['x'], during['player']['y']-before['player']['y'])
        check(moved > 20 and during['stats']['shots'] > before['stats']['shots'], 'mobile-390: simultaneous native two-finger move and fire', {'distance': round(moved,2), 'shots_before':before['stats']['shots'], 'shots_after':during['stats']['shots'], 'input':during['ui']['input']})
        screenshot(page, 'mobile-390-dual-stick.png')
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[]})
        page.wait_for_timeout(80); released = state(page)
        check(all(abs(v) < 0.01 for v in released['ui']['input']['move'].values()) and all(abs(v) < 0.01 for v in released['ui']['input']['aimStick'].values()), 'mobile-390: releasing both fingers clears held movement and fire')
        page.locator('#dash').tap(); page.wait_for_timeout(70); dash = state(page)
        check(dash['player']['dashCooldown'] > 0, 'mobile-390: dedicated Dash button activates', dash['player']['dashCooldown'])
        page.locator('#nova').tap(); page.wait_for_timeout(70); nova = state(page)
        check(nova['player']['novaCharge'] < 20, 'mobile-390: dedicated Nova button consumes charge', nova['player']['novaCharge'])
        data['touch'] = {'distance':moved,'shots':during['stats']['shots']-before['stats']['shots'],'dash_cooldown':dash['player']['dashCooldown'],'nova_charge':nova['player']['novaCharge']}
        cdp.detach()
    else:
        screenshot(page, f'mobile-{width}-controls.png')
    REPORT.setdefault('mobile',[]).append(data)
    page._qa_closing = True
    context.close()


started = time.perf_counter()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        REPORT['browser'] = browser.version
        try:
            desktop(browser)
            mobile(browser,390,True)
            mobile(browser,320,False)
        finally:
            browser.close()
except Exception as error:
    REPORT['failure'] = str(error)
    print('STOP: '+str(error),flush=True)
REPORT['wall_seconds'] = round(time.perf_counter()-started,2)
# Chromium may abort a media range fetch on pause/preload changes. Preserve each
# cancellation separately only after the exact recording's hash and actual
# post-resume playback have both passed; all other failures remain blocking.
playback_ok = any(c['name']=='desktop: downloaded music plays after pause and resume' and c['passed'] for c in REPORT['checks'])
verified = {URL+'/'+h['file'] for h in REPORT.get('public_hashes',[]) if h.get('matches')}
canceled = [r for r in REPORT['resource_failures'] if playback_ok and r.get('resource_type')=='media' and r['failure']=='net::ERR_ABORTED' and r['url'] in verified]
REPORT['verified_media_cancellations'] = canceled
REPORT['resource_failures'] = [r for r in REPORT['resource_failures'] if r not in canceled]
REPORT['passed'] = not REPORT.get('failure') and all(c['passed'] for c in REPORT['checks']) and not REPORT['page_errors'] and not REPORT['console_errors'] and not REPORT['resource_failures']
(OUT/'report.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'passed':REPORT['passed'],'checks':len(REPORT['checks']),'wall_seconds':REPORT['wall_seconds'],'failure':REPORT.get('failure'),'page_errors':REPORT['page_errors'],'console_errors':REPORT['console_errors'],'resource_failures':REPORT['resource_failures']},ensure_ascii=False),flush=True)
raise SystemExit(0 if REPORT['passed'] else 1)
