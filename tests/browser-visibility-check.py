"""Visibility-handler regression with an explicit browser-event fixture.

The fixture overrides document.hidden and dispatches visibilitychange; it does
not emulate a real OS tab switch or mutate the world. Combat uses real input.
"""
import json
import math
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_navigation import state, advance, waypoint_to

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa/home-refresh/visibility'
OUT.mkdir(parents=True, exist_ok=True)
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4328/src/'
checks, errors = [], []

def check(ok, name):
    checks.append({'name': name, 'passed': bool(ok)})
    print(('PASS ' if ok else 'FAIL ') + name, flush=True)
    if not ok: raise AssertionError(name)

def visibility(page, hidden):
    page.evaluate('''hidden => {
      Object.defineProperty(document, 'hidden', {configurable:true, get:()=>hidden});
      document.dispatchEvent(new Event('visibilitychange'));
    }''', hidden)
    page.wait_for_timeout(180)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440, 'height':960})
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    try:
        page.goto(URL)
        page.wait_for_function('window.render_game_to_text && JSON.parse(window.render_game_to_text()).ui.ready')
        visibility(page, True)
        before = state(page)['ui']['motion']
        page.wait_for_timeout(300)
        after = state(page)['ui']['motion']
        check(not after['animating'] and before['drawCount'] == after['drawCount'], 'hidden title stops repeated rendering')
        visibility(page, False)
        check(state(page)['ui']['motion']['animating'], 'visible title wakes rendering')
        page.locator('#play').click()
        page.locator('#dismiss-guide').click()
        check(page.locator('#first-run-guide').is_hidden() and state(page)['ui']['guide']['dismissed'], 'guide can be dismissed without stopping combat')
        visibility(page, True)
        before = state(page)
        page.wait_for_timeout(250)
        check(before['ui']['paused'] and before['time'] == state(page)['time'], 'hidden combat opens pause and freezes the world')
        visibility(page, False)
        check(state(page)['ui']['paused'], 'returning to combat still requires explicit continue')
        page.locator('#continue').click()
        advance(page, 0)
        page.keyboard.press('Escape')
        page.locator('#abandon').click()
        seed = state(page)['ui']['lifetime']['runs']
        check(page.evaluate("document.activeElement.id") == 'resume-run', 'return to title focuses Continue when a checkpoint exists')
        page.locator('body').click(position={'x':600,'y':80})
        page.keyboard.press('Enter')
        check(state(page)['ui']['mode'] == 'playing' and state(page)['ui']['lifetime']['runs'] == seed, 'default Enter continues instead of overwriting the checkpoint')
        check(not state(page)['ui']['guide'], 'continued game does not repeat the first-run guide')
        held = set()
        for _ in range(380):
            s = state(page)
            if s['phase'] != 'combat': break
            enemy = min(s['enemies'], key=lambda e: math.hypot(e['x']-s['player']['x'], e['y']-s['player']['y']))
            box = page.locator('#world').bounding_box()
            page.mouse.move(enemy['x']/s['width']*box['width'], enemy['y']/s['height']*box['height'])
            if not held: page.mouse.down()
            target = waypoint_to(s, (enemy['x'], enemy['y']))
            dx, dy = target[0]-s['player']['x'], target[1]-s['player']['y']
            distance = math.hypot(enemy['x']-s['player']['x'], enemy['y']-s['player']['y'])
            wanted = (({'d'} if dx>8 else {'a'} if dx < -8 else set()) | ({'s'} if dy>8 else {'w'} if dy < -8 else set())) if distance > 150 else set()
            for key in held-wanted: page.keyboard.up(key)
            for key in wanted-held: page.keyboard.down(key)
            held = wanted
            advance(page, 90)
        for key in held: page.keyboard.up(key)
        page.mouse.up()
        check(state(page)['ui']['mode'] == 'reward', 'real input clears the first room to reach rewards')
        visibility(page, True)
        check(state(page)['ui']['audio']['context'] == 'suspended', 'hidden reward suspends audio')
        visibility(page, False)
        page.wait_for_function("JSON.parse(window.render_game_to_text()).ui.audio.context === 'running'")
        check(state(page)['ui']['audio']['musicPlaying'], 'visible reward restores the recording')
        page.locator('#relic-choices button').first.click()
        page.wait_for_timeout(200)
        s = state(page)
        check(s['phase'] == 'exit' and s['ui']['audio']['musicPlaying'] and s['ui']['audio']['context'] == 'running', 'choosing a relic retains music and live audio effects')
        check(not errors, 'no page errors')
    finally:
        (OUT/'report.json').write_text(json.dumps({'checks':checks,'errors':errors,'method':'Explicit visibility event fixture plus real keyboard/mouse input; no world writes'}, ensure_ascii=False, indent=2), encoding='utf-8')
        browser.close()
