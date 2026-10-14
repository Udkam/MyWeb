"""Geometry integration using a fresh, seeded room-one checkpoint, then real inputs.

This is a labelled entry fixture, not a full run or touch-hardware acceptance.
"""
import json
import math
from pathlib import Path
import subprocess
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa' / 'maps'
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4328/src/?test=1'
REPORT = {'url': URL, 'evidence': 'Fresh room-one seed fixture followed by real keyboard input; mobile viewport emulation.', 'checks': [], 'errors': [], 'console_errors': [], 'screenshots': []}

def check(ok, name):
    REPORT['checks'].append({'name': name, 'passed': bool(ok)})
    print(('PASS ' if ok else 'FAIL ') + name, flush=True)
    if not ok:
        raise AssertionError(name)

def state(page):
    return json.loads(page.evaluate('window.render_game_to_text()'))

def advance(page, ms):
    page.evaluate('(ms) => window.advanceTime(ms)', ms)
    return state(page)

def fixture():
    source = """import {createRun,snapshot} from './src/engine.js';
import {createDefaultSave,exportSave} from './src/storage.js';
let s;for(let seed=1;seed<1000;seed++){const c=createRun({seed});if(c.layout==='chasm-loop'){s=c;break;}}
const save=createDefaultSave();save.stats.runs=1;save.stats.bestRoom=1;save.checkpoint=snapshot(s);console.log(exportSave(save));"""
    data = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', source], cwd=ROOT, text=True, encoding='utf-8'))
    (OUT / 'room-one-entry-fixture.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    return data

def move_to(page, x, y):
    held = set()
    try:
        for _ in range(100):
            s = state(page)
            if math.hypot(s['player']['x'] - x, s['player']['y'] - y) < 12:
                return s
            if s['phase'] != 'combat':
                raise AssertionError('Run left combat during movement: ' + s['phase'])
            dx, dy = x - s['player']['x'], y - s['player']['y']
            keys = ({'d'} if dx > 8 else {'a'} if dx < -8 else set()) | ({'s'} if dy > 8 else {'w'} if dy < -8 else set())
            for k in held - keys:
                page.keyboard.up(k)
            for k in keys - held:
                page.keyboard.down(k)
            held = keys
            advance(page, 50)
        raise AssertionError('Movement did not reach waypoint')
    finally:
        for k in held:
            page.keyboard.up(k)
        advance(page, 0)

def run(browser, mobile, save):
    name = 'portrait' if mobile else 'desktop'
    context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 960}, is_mobile=mobile, has_touch=mobile)
    context.add_init_script('localStorage.setItem("cinder-below-v1",' + json.dumps(json.dumps(save)) + ');')
    page = context.new_page()
    page.on('pageerror', lambda e: REPORT['errors'].append(str(e)))
    page.on('console', lambda m: REPORT['console_errors'].append(m.text) if m.type == 'error' else None)
    page.goto(URL, wait_until='domcontentloaded')
    page.wait_for_function("typeof window.render_game_to_text==='function' && JSON.parse(window.render_game_to_text()).ui.ready")
    page.locator('#resume-run').click()
    s = advance(page, 0)
    check(s['mapVersion'] == 2 and s['layout'] == 'chasm-loop', name + ': UI resumes new-map checkpoint')
    check(s['ui']['art']['loaded'] == s['ui']['art']['total'] and not s['ui']['art']['failed'], name + ': all downloaded art loads')
    pit = next(o for o in s['obstacles'] if o['kind'] == 'pit')
    page.keyboard.down('w')
    s = advance(page, 1800)
    page.keyboard.up('w')
    check(abs(s['player']['y'] - (pit['y'] + pit['h'] + s['player']['r'])) < 3, name + ': visible pit actually blocks movement')
    check(s['player']['hp'] > 0, name + ': collision leaves the run playable')
    x = pit['x'] + pit['w'] + 38
    move_to(page, x, s['player']['y'])
    move_to(page, x, pit['y'] - 38)
    s = move_to(page, s['width'] / 2, pit['y'] - 38)
    check(s['player']['y'] < pit['y'], name + ': real input follows right bridge around the pit')
    screenshot = OUT / (name + '-pit-route.png')
    page.screenshot(path=str(screenshot), full_page=True)
    REPORT['screenshots'].append(str(screenshot))
    if mobile:
        page.set_viewport_size({'width': 844, 'height': 390})
        page.wait_for_timeout(100)
        s = advance(page, 0)
        check(s['layout'] == 'chasm-loop' and s['mapVersion'] == 2, 'rotation keeps the same architecture and map version')
        check(all(math.hypot(s['player']['x'] - max(o['x'], min(o['x'] + o['w'], s['player']['x'])), s['player']['y'] - max(o['y'], min(o['y'] + o['h'], s['player']['y']))) >= s['player']['r'] - .02 for o in s['obstacles']), 'rotation resolves the player outside terrain')
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'landscape has no horizontal page overflow')
        screenshot = OUT / 'landscape-rotation.png'
        page.screenshot(path=str(screenshot), full_page=True)
        REPORT['screenshots'].append(str(screenshot))
    context.close()

OUT.mkdir(parents=True, exist_ok=True)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        save = fixture()
        for mobile in [False, True]:
            run(browser, mobile, save)
        browser.close()
    check(not REPORT['errors'] and not REPORT['console_errors'], 'no browser page or console errors')
finally:
    (OUT / 'report.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2), encoding='utf-8')
