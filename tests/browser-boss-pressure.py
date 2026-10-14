"""Boss-entry integration fixtures, followed by real app keyboard/mouse combat.

The save fixtures skip earlier rooms and select a legal build. They establish
boss/browser integration, not an earned full run or human difficulty acceptance.
No live state or HP is modified; only render_game_to_text / advanceTime are read.
"""
import json
import math
from pathlib import Path
import subprocess
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa/boss-pressure'
OUT.mkdir(parents=True, exist_ok=True)
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4330/src/?test=1'
REPORT = {'url': URL, 'method': __doc__, 'cases': [], 'errors': [], 'console_errors': []}


def fixture(target, room):
    source = """import {createRun,enterRoom,snapshot} from './src/engine.js';
import {createDefaultSave,exportSave} from './src/storage.js';
const [target,roomText]=process.argv.slice(1),room=Number(roomText);
for(let seed=1;seed<100;seed++){
 const s=createRun({seed});
 const relics=['seeking','split','burn','pierce','chain','nova','ricochet','cold','split','burn','seeking','nova','pierce','chain'];
 while(s.room<room){const relic=relics[s.room-1];s.relics[relic]=(s.relics[relic]||0)+1;s.stats.rooms++;s.phase='exit';enterRoom(s,'hunt');}
 if(s.bossId!==target)continue;
 const save=createDefaultSave();save.stats.runs=1;save.stats.rooms=room-1;save.stats.bestRoom=room;save.banked.rooms=room-1;save.checkpoint=snapshot(s);
 console.log(exportSave(save));break;
}"""
    data = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', source, target, str(room)], cwd=ROOT, text=True, encoding='utf-8'))
    (OUT / f'fixture-{target}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    return data


def state(page):
    return json.loads(page.evaluate('window.render_game_to_text()'))


def move_choice(s):
    p = s['player']; bottom = s['height'] - (150 if s['height'] > s['width'] else 28)
    options = []
    for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1)]:
        length = math.hypot(dx, dy) or 1; vx, vy = dx / length * 215, dy / length * 215
        score = 0
        for t in [.12, .3, .48]:
            x, y = p['x'] + vx * t, p['y'] + vy * t
            score += max(0, 38 - min(x - 28, s['width'] - 28 - x, y - 66, bottom - y)) ** 2 * 6
            for o in s['obstacles']:
                d = math.hypot(x - max(o['x'], min(o['x'] + o['w'], x)), y - max(o['y'], min(o['y'] + o['h'], y)))
                score += max(0, 32 - d) ** 2 * 8
            for b in s['bullets']:
                if b['owner'] != 'enemy': continue
                d = math.hypot(x - b['x'] - b['vx'] * t, y - b['y'] - b['vy'] * t)
                score += max(0, 45 + b['r'] - d) ** 2 * 2
            for e in s['enemies']:
                d = math.hypot(x - e['x'], y - e['y'])
                score += max(0, e['r'] + p['r'] + 28 - d) ** 2 * 4
                if e.get('aimLocked') and ('charge' in (e.get('action') or '') or 'surf' in (e.get('action') or '')):
                    advance = max(0, t - (e.get('windup') or 0)) * 440
                    d = math.hypot(x - e['x'] - math.cos(e['angle']) * advance, y - e['y'] - math.sin(e['angle']) * advance)
                    score += max(0, e['r'] + p['r'] + 30 - d) ** 2 * 4
            for h in s['hazards']:
                if h.get('remaining', 0) < t + .2:
                    score += max(0, h['radius'] + p['r'] + 20 - math.hypot(x - h['x'], y - h['y'])) ** 2 * 5
        score += math.hypot(p['x'] + vx * .4 - s['width'] / 2, p['y'] + vy * .4 - (66 + bottom) / 2) * .02
        options.append((score, dx, dy))
    return min(options)


def capture(page, name, label, s):
    file = OUT / f'browser-{name}-{label}.png'
    page.screenshot(path=str(file))
    file.with_suffix('.json').write_text(json.dumps(s, ensure_ascii=False, indent=2), encoding='utf-8')
    return str(file)


def run(browser, target, room, viewport):
    save = fixture(target, room)
    name = f'{target}-{viewport[0]}'
    context = browser.new_context(viewport={'width': viewport[0], 'height': viewport[1]}, device_scale_factor=1)
    context.add_init_script('localStorage.setItem("cinder-below-v1",' + json.dumps(json.dumps(save)) + ');')
    page = context.new_page()
    page.on('pageerror', lambda e: REPORT['errors'].append(str(e)))
    page.on('console', lambda m: REPORT['console_errors'].append(m.text) if m.type == 'error' else None)
    page.goto(URL)
    page.wait_for_function("typeof window.render_game_to_text==='function'&&JSON.parse(window.render_game_to_text()).ui.ready")
    page.locator('#resume-run').click()
    s = state(page)
    assert s['bossId'] == target and s['room'] == room and s['mapVersion'] == 3
    result = {'name': name, 'seed': s['seed'], 'viewport': viewport, 'entry_fixture': True,
              'actions': [], 'stages': [], 'screenshots': [], 'hits': [], 'locks': 0, 'maxBullets': 0}
    actions = set(); stages = set(); captured = set(); held = set(); old_hp = s['player']['hp']
    for i in range(500):
        if s['phase'] != 'combat': break
        boss = next((e for e in s['enemies'] if e['type'] == target), None)
        if not boss: break
        actions.add(boss.get('action')); stages.add(boss['stage'])
        if boss.get('aimLocked'): result['locks'] += 1
        if boss['phase'] == 'windup' and 'windup' not in captured:
            captured.add('windup'); result['screenshots'].append(capture(page, name, 'windup', s))
        if boss['stage'] >= 2 and 'phase2' not in captured:
            captured.add('phase2'); result['screenshots'].append(capture(page, name, 'phase2', s))
        hostile = sum(b['owner'] == 'enemy' for b in s['bullets'])
        if hostile >= 12 and 'pressure' not in captured:
            captured.add('pressure'); result['screenshots'].append(capture(page, name, 'pressure', s))
        result['maxBullets'] = max(result['maxBullets'], len(s['bullets']))
        if s['player']['hp'] != old_hp:
            result['hits'].append({'time': s['time'], 'hp': s['player']['hp']}); old_hp = s['player']['hp']
        risk, dx, dy = move_choice(s)
        keys = ({'d'} if dx > 0 else {'a'} if dx < 0 else set()) | ({'s'} if dy > 0 else {'w'} if dy < 0 else set())
        for key in held - keys: page.keyboard.up(key)
        for key in keys - held: page.keyboard.down(key)
        held = keys
        box = page.locator('#world').bounding_box()
        page.mouse.move(box['x'] + boss['x'] / s['width'] * box['width'], box['y'] + boss['y'] / s['height'] * box['height'])
        page.mouse.down()
        if risk > 600 and s['player']['dashCooldown'] <= 0: page.keyboard.down('Space')
        close = sum(b['owner'] == 'enemy' and math.hypot(b['x'] - s['player']['x'], b['y'] - s['player']['y']) < 130 for b in s['bullets'])
        if close >= 3 and s['player']['novaCharge'] >= 100: page.keyboard.down('e')
        s = json.loads(page.evaluate('(ms)=>window.advanceTime(ms)', 100))
        page.keyboard.up('Space'); page.keyboard.up('e')
    for key in held: page.keyboard.up(key)
    page.mouse.up()
    if s['player']['hp'] != old_hp: result['hits'].append({'time': s['time'], 'hp': s['player']['hp']})
    result.update({'actions': sorted(a for a in actions if a), 'stages': sorted(stages), 'phase': s['phase'], 'hp': s['player']['hp'], 'simulation_seconds': s['time'], 'bossRemaining': any(e['type'] == target for e in s['enemies'])})
    result['screenshots'].append(capture(page, name, 'end', s))
    result['passed'] = result['locks'] > 0 and len(result['actions']) >= (1 if target == 'kiln' else 2) and 2 in result['stages'] and result['maxBullets'] <= 150
    REPORT['cases'].append(result)
    (OUT / 'browser-report.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k != 'screenshots'}, ensure_ascii=False), flush=True)
    context.close()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for case in [('sentinel', 3, (1440, 960)), ('kiln', 9, (390, 844)), ('chronarch', 15, (1440, 960))]:
        run(browser, *case)
    browser.close()
REPORT['passed'] = all(c['passed'] for c in REPORT['cases']) and not REPORT['errors'] and not REPORT['console_errors']
(OUT / 'browser-report.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'passed': REPORT['passed'], 'cases': len(REPORT['cases']), 'errors': REPORT['errors'], 'console_errors': REPORT['console_errors']}), flush=True)
sys.exit(0 if REPORT['passed'] else 1)
