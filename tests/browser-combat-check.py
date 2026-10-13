"""Unmodified browser combat pilot. Only normal mouse/keyboard UI and public time hook.

No engine imports, save injection, state assignment, enemy/health mutation or hidden
completion actions. The pilot reads the same public state used for accessibility.
Run: python tests/browser-combat-check.py [URL] [attempts, max 3]
"""
import heapq
import json
import math
import pathlib
import re
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa'
OUT.mkdir(parents=True, exist_ok=True)
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4328/src/?test=1'
ATTEMPTS = min(3, max(1, int(sys.argv[2]) if len(sys.argv) > 2 else 3))
TAG = sys.argv[3] if len(sys.argv) > 3 else ''
if TAG and not re.fullmatch(r'[a-z0-9-]+', TAG): raise ValueError('Evidence tag must use lowercase letters, numbers or hyphens')
PREFIX = TAG if TAG == 'final-combat' else 'combat' + ('-' + TAG if TAG else '')
MS = 150
REPORT = {'url': URL, 'method': 'Real Chromium, unmodified game; mouse/keyboard inputs and public advanceTime only', 'attempts': [], 'page_errors': [], 'console_errors': []}


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def bounds(s, margin=18):
    return (28 + margin, s['width'] - 28 - margin, 66 + margin,
            s['height'] - (150 if s['height'] > s['width'] else 28) - margin)


def blocked(s, point, margin=17):
    x, y = point
    left, right, top, bottom = bounds(s, margin)
    if not (left <= x <= right and top <= y <= bottom):
        return True
    for o in s['obstacles']:
        near_x = min(o['x'] + o['w'], max(o['x'], x))
        near_y = min(o['y'] + o['h'], max(o['y'], y))
        if math.hypot(x - near_x, y - near_y) < margin:
            return True
    return False


def line_clear(s, a, b, margin=5):
    count = max(1, math.ceil(dist(a, b) / 8))
    return all(not blocked(s, (a[0] + (b[0] - a[0]) * i / count, a[1] + (b[1] - a[1]) * i / count), margin) for i in range(count + 1))


def path_to(s, goal):
    """Small A* with inflated obstacles; return next visible waypoint."""
    size = 26
    start_point = (s['player']['x'], s['player']['y'])
    left, right, top, bottom = bounds(s, 20)
    goal = (min(right, max(left, goal[0])), min(bottom, max(top, goal[1])))
    if line_clear(s, start_point, goal, 19):
        return goal
    def key(p): return (round(p[0] / size), round(p[1] / size))
    def point(k): return (k[0] * size, k[1] * size)
    start = key(start_point)
    goal_key = key(goal)
    if blocked(s, point(goal_key), 20):
        options = [(goal_key[0] + dx, goal_key[1] + dy) for dx in range(-5, 6) for dy in range(-5, 6)]
        options = [v for v in options if not blocked(s, point(v), 20)]
        if not options: return start_point
        goal_key = min(options, key=lambda k: dist(point(k), goal))
    queue = [(0, start)]
    cost = {start: 0}
    parent = {}
    visited = set()
    found = None
    while queue and len(visited) < 1800:
        _, current = heapq.heappop(queue)
        if current in visited: continue
        visited.add(current)
        if current == goal_key:
            found = current
            break
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
            nxt = (current[0] + dx, current[1] + dy)
            if nxt in visited or blocked(s, point(nxt), 20): continue
            origin = start_point if current == start else point(current)
            if not line_clear(s, origin, point(nxt), 19): continue
            new_cost = cost[current] + math.hypot(dx, dy)
            if new_cost < cost.get(nxt, math.inf):
                cost[nxt] = new_cost
                parent[nxt] = current
                heapq.heappush(queue, (new_cost + dist(nxt, goal_key), nxt))
    if found is None:
        return start_point
    route = [found]
    while route[-1] != start: route.append(parent[route[-1]])
    route.reverse()
    visible = start_point
    for node in route[1:]:
        if line_clear(s, start_point, point(node), 19): visible = point(node)
        else: break
    return visible


def movement(s, waypoint, fighting=True):
    p = s['player']; origin = (p['x'], p['y'])
    options = []
    for dx, dy in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
        length = math.hypot(dx, dy) or 1
        vx, vy = dx / length * 215, dy / length * 215
        future = (origin[0] + vx * 0.24, origin[1] + vy * 0.24)
        if not line_clear(s, origin, future, 15): continue
        score = dist(future, waypoint) * 0.65
        risk = 0
        if fighting:
            for e in s['enemies']:
                if e['phase'] == 'spawn': continue
                d = dist(future, (e['x'], e['y'])) - e['r'] - p['r']
                risk += max(0, 85 - d) ** 2 * 0.14
                warning = e.get('telegraph')
                if warning and warning['kind'] == 'line' and warning['remaining'] < 0.4:
                    direction = (math.cos(warning['angle']), math.sin(warning['angle']))
                    rel = (future[0] - e['x'], future[1] - e['y'])
                    along = rel[0] * direction[0] + rel[1] * direction[1]
                    side = abs(rel[0] * direction[1] - rel[1] * direction[0])
                    if 0 < along < warning['range'] + 40: risk += max(0, e['r'] + 35 - side) ** 2 * 0.6
            for b in s['bullets']:
                if b['owner'] != 'enemy': continue
                rx, ry = b['x'] - origin[0], b['y'] - origin[1]
                rvx, rvy = b['vx'] - vx, b['vy'] - vy
                t = min(0.42, max(0, -(rx * rvx + ry * rvy) / (rvx * rvx + rvy * rvy + 0.001)))
                separation = math.hypot(rx + rvx * t, ry + rvy * t)
                risk += max(0, 40 - separation) ** 2 * 0.65
        options.append((score + risk, dx, dy, risk))
    if not options: return 0, 0, 0
    _, dx, dy, risk = min(options)
    return dx, dy, risk


def capture(page, attempt, label, s):
    path = OUT / f'{PREFIX}-{attempt:02d}-{label}.png'
    page.screenshot(path=str(path), full_page=True)
    (OUT / f'{PREFIX}-{attempt:02d}-{label}.json').write_text(json.dumps(s, ensure_ascii=False, indent=2), encoding='utf-8')
    return str(path)


def run_attempt(page, index):
    started = time.perf_counter()
    page.goto(URL)
    page.wait_for_function("typeof window.render_game_to_text === 'function' && JSON.parse(window.render_game_to_text()).ui.ready")
    page.locator('#play').click()
    state = json.loads(page.evaluate('window.render_game_to_text()'))
    attempt = {'attempt': index, 'seed': state['seed'], 'weapon': state['player']['weapon'], 'rooms': [], 'waves': [], 'boss_patterns': [], 'relic_choices': [], 'screenshots': [], 'stalls': [], 'hp_events': []}
    print(f"Attempt {index}, seed {state['seed']}: real Cinderbolt run", flush=True)
    held = set()
    mouse_held = False
    last_room = 0
    last_hp = state['player']['hp']
    last_report = 0
    room_started = 0
    direction = 1 if index % 2 else -1
    captured_bosses = set()
    previous = (state['player']['x'], state['player']['y'])
    still = 0
    iterations = 0
    seen_waves = set()
    seen_patterns = set()
    while state['phase'] not in ('won', 'dead') and state['time'] < 540 and iterations < 4200:
        iterations += 1
        if state['ui']['paused']:
            page.locator('#continue').click()
            held.clear(); mouse_held = False
        if state['room'] != last_room:
            if last_room:
                attempt['rooms'][-1]['exit_time'] = state['time']
                attempt['rooms'][-1]['duration'] = round(state['time'] - room_started, 2)
            last_room = state['room']; room_started = state['time']
            attempt['rooms'].append({'room': last_room, 'route': state['route'], 'entry_time': state['time'], 'hp': state['player']['hp'], 'enemy_types': [e['type'] for e in state['enemies']]})
            print(f"  room {last_room}: hp {state['player']['hp']}, foes {len(state['enemies'])}, sim {state['time']:.1f}s", flush=True)
        wave_key = (state['room'], state.get('wave', 1))
        if wave_key not in seen_waves:
            seen_waves.add(wave_key)
            attempt['waves'].append({'room': state['room'], 'wave': state.get('wave', 1), 'waveTotal': state.get('waveTotal', 1), 'time': state['time'], 'hp': state['player']['hp']})
            if state.get('wave') == 2 and state['room'] in (2, 7): attempt['screenshots'].append(capture(page, index, f'wave-{state["room"]}-2', state))
        for enemy in state['enemies']:
            if enemy['type'] in ('sentinel', 'warden') and enemy.get('telegraph'):
                key = (state['room'], enemy['stage'], enemy['telegraph']['kind'])
                if key not in seen_patterns:
                    seen_patterns.add(key)
                    attempt['boss_patterns'].append({'room': state['room'], 'stage': enemy['stage'], 'kind': enemy['telegraph']['kind'], 'time': state['time'], 'hp': enemy['hp']})
                    if enemy['stage'] == 2: attempt['screenshots'].append(capture(page, index, f'boss-{state["room"]}-stage2-{enemy["telegraph"]["kind"]}', state))
        if state['player']['hp'] != last_hp:
            attempt['hp_events'].append({'time': state['time'], 'room': state['room'], 'before': last_hp, 'after': state['player']['hp']})
            last_hp = state['player']['hp']
        if state['phase'] == 'reward':
            for key in held: page.keyboard.up(key)
            held.clear()
            if mouse_held: page.mouse.up(); mouse_held = False
            if len(attempt['relic_choices']) in (0, 3, 6): attempt['screenshots'].append(capture(page, index, f'reward-{state["room"]}', state))
            priority = ['seeking', 'chain', 'pierce', 'burn', 'split', 'nova', 'cold', 'ricochet', 'explosive', 'blades', 'trail', 'blood']
            choices = state['choices']
            choice = min(range(len(choices)), key=lambda i: priority.index(choices[i]['id']) + state['relics'].get(choices[i]['id'], 0) * 2)
            first_reward = len(attempt['relic_choices']) == 0
            decision = {'room': state['room'], 'offered': [c['id'] for c in choices], 'selected': choices[choice]['id'], 'input': 'number-key' if first_reward else 'click'}
            previous_level = state['relics'].get(choices[choice]['id'], 0)
            attempt['relic_choices'].append(decision)
            if first_reward:
                decision['first_button_focused'] = page.locator('#relic-choices button').first.evaluate('(button) => button === document.activeElement')
                assert decision['first_button_focused'], 'First relic must be focused before numeric-key test'
                decision['key'] = str(choice + 1)
                page.keyboard.press(str(choice + 1))
            else:
                page.locator('#relic-choices button').nth(choice).click()
            state = json.loads(page.evaluate('window.render_game_to_text()'))
            assert state['phase'] == 'exit' and state['relics'].get(choices[choice]['id']) == previous_level + 1, 'Relic UI input must apply exactly the selected choice'
            continue
        p = state['player']; player = (p['x'], p['y'])
        if state['phase'] == 'exit':
            gate = next(g for g in state['gates'] if g['route'] == 'refuge')
            goal = (gate['x'], gate['y']) if gate.get('armed', True) else (gate['x'], gate['y'] + gate['r'] + p['r'] + 25)
            waypoint = path_to(state, goal)
            dx, dy, risk = movement(state, waypoint, False)
            if mouse_held: page.mouse.up(); mouse_held = False
            target = None
        else:
            enemies = state['enemies']
            visible = [e for e in enemies if line_clear(state, player, (e['x'], e['y']), 5)]
            target = min(visible or enemies, key=lambda e: dist(player, (e['x'], e['y'])))
            # Circle at firing distance, with A* to go around stone pillars.
            angle = math.atan2(player[1] - target['y'], player[0] - target['x']) + direction * 0.5
            desired = 210 if target['type'] not in ('sentinel', 'warden') else 235
            goal = (target['x'] + math.cos(angle) * desired, target['y'] + math.sin(angle) * desired)
            waypoint = path_to(state, goal)
            dx, dy, risk = movement(state, waypoint)
            box = page.locator('#world').bounding_box()
            page.mouse.move(box['x'] + target['x'] / state['width'] * box['width'], box['y'] + target['y'] / state['height'] * box['height'])
            if not mouse_held:
                page.mouse.down(); mouse_held = True
            nearest = min(dist(player, (e['x'], e['y'])) for e in enemies)
            hostile_near = sum(b['owner'] == 'enemy' and dist(player, (b['x'], b['y'])) < 130 for b in state['bullets'])
            if p['novaCharge'] >= p['novaMax'] and (nearest < 130 + state['relics'].get('nova', 0) * 35 or hostile_near >= 3):
                page.keyboard.press('e')
            if p['dashCooldown'] <= 0 and (risk > 110 or nearest < 65):
                page.keyboard.press('Space')
            if state['room'] in (4, 8) and state['room'] not in captured_bosses and any(e.get('telegraph') for e in enemies if e['type'] in ('sentinel', 'warden')):
                captured_bosses.add(state['room'])
                attempt['screenshots'].append(capture(page, index, f'boss-{state["room"]}', state))
        desired_keys = ({'d'} if dx > 0 else {'a'} if dx < 0 else set()) | ({'s'} if dy > 0 else {'w'} if dy < 0 else set())
        for key in held - desired_keys: page.keyboard.up(key)
        for key in desired_keys - held: page.keyboard.down(key)
        held = desired_keys
        state = json.loads(page.evaluate('(ms) => window.advanceTime(ms)', MS))
        current = (state['player']['x'], state['player']['y'])
        still = still + MS / 1000 if dist(previous, current) < 1 else 0
        previous = current
        if still > 1.5:
            direction *= -1; still = 0
            attempt['stalls'].append({'time': state['time'], 'room': state['room'], 'position': current})
        if state['time'] - last_report > 30:
            last_report = state['time']
            print(f"    sim {state['time']:.0f}s: room {state['room']}, hp {state['player']['hp']}, kills {state['stats']['kills']}", flush=True)
    for key in held: page.keyboard.up(key)
    if mouse_held: page.mouse.up()
    attempt['screenshots'].append(capture(page, index, state['phase'], state))
    attempt.update({'outcome': state['phase'], 'final_room': state['room'], 'simulation_seconds': state['time'], 'wall_seconds': round(time.perf_counter() - started, 2), 'stats': state['stats'], 'final_hp': state['player']['hp'], 'bosses_seen': sorted(captured_bosses), 'final_state': state})
    print(f"Attempt {index}: {state['phase']}, room {state['room']}, simulated {state['time']:.1f}s, wall {attempt['wall_seconds']}s", flush=True)
    return attempt


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    REPORT['browser'] = browser.version
    for attempt_index in range(1, ATTEMPTS + 1):
        context = browser.new_context(viewport={'width': 1440, 'height': 960}, device_scale_factor=1)
        page = context.new_page()
        page.on('pageerror', lambda error: REPORT['page_errors'].append(str(error)))
        page.on('console', lambda msg: REPORT['console_errors'].append(msg.text) if msg.type == 'error' else None)
        try:
            result = run_attempt(page, attempt_index)
            REPORT['attempts'].append(result)
        except Exception as error:
            REPORT['attempts'].append({'attempt': attempt_index, 'outcome': 'test-error', 'error': str(error)})
            page.screenshot(path=str(OUT / f'{PREFIX}-{attempt_index:02d}-test-error.png'), full_page=True)
            print(f'Attempt {attempt_index} test error: {error}', flush=True)
        (OUT / f'{PREFIX}-report.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2), encoding='utf-8')
        context.close()
        if REPORT['attempts'][-1].get('outcome') == 'won': break
    browser.close()
REPORT['passed'] = any(a.get('outcome') == 'won' for a in REPORT['attempts']) and not REPORT['page_errors'] and not REPORT['console_errors']
(OUT / f'{PREFIX}-report.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'passed': REPORT['passed'], 'attempts': len(REPORT['attempts']), 'outcomes': [a['outcome'] for a in REPORT['attempts']], 'page_errors': REPORT['page_errors'], 'console_errors': REPORT['console_errors']}, ensure_ascii=False), flush=True)
sys.exit(0 if REPORT['passed'] else 1)
