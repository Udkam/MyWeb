"""Record ordinary real-RAF play, using read-only diagnostics to choose browser inputs.

This is an adaptive automated route, not a human playtest. No advanceTime, manual
clock query, model writes, actor injection or edited footage is used. Run only
against the existing local development server after its owner confirms readiness.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

from playwright.sync_api import sync_playwright


READ = """() => ({game:JSON.parse(window.render_game_to_text()),
  focused:document.hasFocus(),visibility:document.visibilityState,
  mode:document.querySelector('.wake-shell')?.dataset.mode,
  overflowX:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,
  overflowY:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)-innerHeight})"""
KEYS = {'left': 'a', 'right': 'd', 'jump': 'Space', 'attack': 'j',
        'guard': 'k', 'dodge': 'Shift', 'interact': 'e'}
FINGER_IDS = {action: i + 1 for i, action in enumerate(KEYS)}


class RouteRecorder:
    def __init__(self, page, cdp, report, output, touch, max_seconds):
        self.page, self.cdp, self.report, self.output = page, cdp, report, output
        self.touch, self.max_seconds = touch, max_seconds
        self.origin = time.perf_counter()
        self.held = set()
        self.fingers = {}
        self.last = None
        self.last_sample = -1
        self.last_event_id = 0
        self.last_dodge_time = -1e9
        self.phase = 'title'

    def wall(self):
        return time.perf_counter() - self.origin

    def observe(self, allow_result=False):
        read = self.page.evaluate(READ)
        self.last = read['game']
        now = self.wall()
        if now >= self.max_seconds:
            raise RuntimeError(f'Actual wall-clock cap reached during {self.phase}.')
        if read['visibility'] != 'visible' or not read['focused']:
            raise RuntimeError('Page lost visibility/focus; automatic pause is preserved.')
        for event in self.last.get('log', []):
            if event['id'] > self.last_event_id:
                self.report['events'].append({**event, 'observedWallSeconds': now, 'phase': self.phase})
                self.last_event_id = event['id']
                if event['type'] == 'dodge' and event['actor'] == 'hero':
                    self.last_dodge_time = event['time']
        if now - self.last_sample >= 0.08:
            self.report['samples'].append({'wallSeconds': now, 'phase': self.phase,
                'focused': read['focused'], 'visibility': read['visibility'],
                'overflowX': read['overflowX'], 'overflowY': read['overflowY'],
                'mode': read['mode'], 'tick': self.last['tick'], 'modelTimeMs': self.last['time'],
                'hero': self.last['hero'], 'enemies': self.last['enemies'],
                'cannon': self.last['cannon'], 'contextAction': self.last['contextAction'],
                'encounter': self.last['encounter']})
            self.last_sample = now
        if not allow_result and self.last.get('mode') in {'dead', 'paused', 'complete'}:
            raise RuntimeError(f"Unexpected mode {self.last['mode']} during {self.phase}.")
        return self.last

    def set_phase(self, name):
        self.phase = name
        state = self.observe(allow_result=name in {'title', 'result'})
        self.report['phases'].append({'name': name, 'wallSeconds': self.wall(),
            'modelTimeMs': state['time'], 'tick': state['tick']})

    def set_action(self, action, down):
        if (action in self.held) == down:
            return
        entry = {'wallStartSeconds': self.wall(), 'phase': self.phase,
                 'action': action, 'down': down, 'method': 'CDP touch' if self.touch else 'Playwright keyboard',
                 'observedTickBefore': self.last['tick'] if self.last else None,
                 'observedModelTimeBeforeMs': self.last['time'] if self.last else None}
        if self.touch:
            if down:
                rect = self.page.locator(f'[data-action={action}]').bounding_box()
                if not rect or rect['width'] < 44 or rect['height'] < 44:
                    raise RuntimeError(f'Touch target {action} missing or smaller than 44px: {rect}')
                point = {'id': FINGER_IDS[action], 'x': rect['x'] + rect['width'] / 2,
                         'y': rect['y'] + rect['height'] / 2, 'radiusX': 4, 'radiusY': 4, 'force': 1}
                self.fingers[action] = point
                self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': list(self.fingers.values())})
                entry['point'] = point
            else:
                released = self.fingers.pop(action)
                # CDP requires the changed/released finger here, not the remaining fingers.
                self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [released]})
                entry['releasedFingerId'] = released['id']
        else:
            (self.page.keyboard.down if down else self.page.keyboard.up)(KEYS[action])
            entry['key'] = KEYS[action]
        if down:
            self.held.add(action)
        else:
            self.held.discard(action)
        entry['wallEndSeconds'] = self.wall()
        entry['heldActionsAfter'] = sorted(self.held)
        self.report['inputs'].append(entry)

    def move(self, direction):
        self.set_action('left', direction < 0)
        self.set_action('right', direction > 0)

    def tap(self, action):
        self.set_action(action, False)
        self.set_action(action, True)
        # Real wall time lets ordinary RAF consume the key edge; simulation time is never advanced here.
        self.page.wait_for_timeout(35)
        self.set_action(action, False)

    def release(self):
        for action in list(self.held):
            self.set_action(action, False)

    def until(self, condition, control=None, seconds=12, allow_complete=False):
        end = self.wall() + seconds
        previous_tick = -1
        while True:
            state = self.observe(allow_result=allow_complete)
            if state.get('mode') in {'dead', 'paused'}:
                raise RuntimeError(f"Mode {state['mode']} stopped ordinary play during {self.phase}.")
            if condition(state):
                return state
            if state.get('mode') == 'complete' and allow_complete:
                return state
            if self.wall() > end:
                h, s = state['hero'], state['enemies'][0]
                raise RuntimeError(f"Phase {self.phase} timed out: hero=({h['x']:.1f},{h['y']:.1f},{h['action']},{h['hp']}HP), "
                    f"sword=({s['x']:.1f},{s['y']:.1f},{s['action']},{s['hp']}HP), context={state['contextAction']['kind']}")
            if control and state['tick'] != previous_tick:
                control(state)
                previous_tick = state['tick']
            self.page.wait_for_timeout(8)

    @staticmethod
    def available(state):
        h = state['hero']
        return h['grounded'] and h['action'] not in {'hurt', 'hurtRecover', 'dodge'} and not h['attack']

    def right_to(self, goal, cannon_route):
        def control(s):
            self.move(1)
            h, sword = s['hero'], s['enemies'][0]
            near = sword['hp'] > 0 and 0 < sword['x'] - h['x'] < (90 if cannon_route else 65)
            jump = (125 <= h['x'] <= 160) or (398 <= h['x'] <= 431) or (near and h['y'] < 255)
            if self.available(s) and jump:
                self.tap('jump')
            elif self.available(s) and h['y'] == 255 and near and s['time'] - self.last_dodge_time >= 800:
                self.tap('dodge')
        state = self.until(lambda s: s['hero']['x'] >= goal, control, seconds=15, allow_complete=True)
        self.move(0)
        return state

    def face(self, direction):
        self.move(direction)
        self.until(lambda s: s['hero']['facing'] == direction, seconds=2)
        self.move(0)

    def sword_parry(self):
        self.set_phase('read-sword-and-parry')
        self.set_action('guard', False)
        def position(s):
            gap = s['enemies'][0]['x'] - s['hero']['x']
            self.move(-math.copysign(1, gap) if abs(gap) < 46 else math.copysign(1, gap) if abs(gap) > 53 else 0)
        self.until(lambda s: 46 <= abs(s['enemies'][0]['x'] - s['hero']['x']) <= 53, position, seconds=10)
        self.move(0)
        self.face(1 if self.last['enemies'][0]['x'] > self.last['hero']['x'] else -1)
        for attempt in range(4):
            self.until(lambda s: s['enemies'][0]['action'] == 'windup'
                and 405 <= s['enemies'][0]['actionTime'] <= 500 and self.available(s)
                and s['time'] >= s['hero']['parryReadyAt'], seconds=8)
            pressure_before = self.last['hero']['guardPressure']
            self.set_action('guard', True)
            self.until(lambda s: bool(s['hero']['opportunity']) or s['hero']['guardPressure'] > pressure_before
                or s['hero']['action'] in {'hurt', 'hurtRecover'}, seconds=2)
            self.set_action('guard', False)
            if self.last['hero']['opportunity'] and self.last['hero']['opportunity']['source'] == 'parry':
                return
            self.report['notes'].append(f'Ordinary defense/recovery instead of parry on attempt {attempt + 1}.')
        raise RuntimeError('Four normal guard attempts failed to produce a real parry.')

    def shove(self):
        self.set_phase('target-bound-palm-shove')
        self.until(lambda s: s['contextAction']['kind'] == 'shove', seconds=0.8)
        self.tap('interact')
        self.until(lambda s: 'shove' in s['encounter']['routeFlags'], seconds=1)
        self.until(lambda s: not s['hero']['attack'], seconds=2)

    def reload_pursuit(self):
        self.set_phase('interrupt-reload-and-pursue')
        def approach(s):
            gap = s['enemies'][1]['x'] - s['hero']['x']
            self.move(math.copysign(1, gap) if abs(gap) > 43 else 0)
        self.until(lambda s: s['enemies'][1]['action'] == 'reload' and s['enemies'][1]['actionTime'] < 1300
            and abs(s['enemies'][1]['x'] - s['hero']['x']) <= 48 and self.available(s), approach, seconds=12)
        self.move(0)
        self.face(1 if self.last['enemies'][1]['x'] > self.last['hero']['x'] else -1)
        self.tap('attack')
        self.until(lambda s: bool(s['hero']['opportunity']) and s['hero']['opportunity']['source'] == 'reloadInterrupt', seconds=1)
        self.until(lambda s: bool(s['hero']['attack']) and s['hero']['attack']['cancelOpen'], seconds=1)
        self.tap('attack')
        self.until(lambda s: s['enemies'][1]['hp'] <= 0, seconds=2)

    def cannon_first(self):
        self.set_phase('cross-crate-to-deck')
        self.right_to(350, True)
        self.until(lambda s: s['hero']['grounded'] and s['hero']['y'] == 255, seconds=3)
        self.sword_parry()
        self.shove()
        self.set_phase('take-upper-route')
        self.right_to(450, True)
        self.until(lambda s: s['hero']['grounded'] and s['hero']['y'] == 207, seconds=3)
        self.until(lambda s: s['enemies'][1]['x'] - s['hero']['x'] <= 48 and self.available(s), lambda s: self.move(1), seconds=5)
        self.set_phase('dodge-past-musketeer')
        self.move(1)
        self.tap('dodge')
        self.until(lambda s: s['hero']['x'] > s['enemies'][1]['x'] + 24, seconds=3)
        self.right_to(605, True)
        self.until(lambda s: s['hero']['grounded'], seconds=3)
        self.set_phase('cannon-fuse-and-friendly-fire')
        for shot in range(3):
            if self.last['enemies'][0]['hp'] <= 0:
                break
            self.until(lambda s: s['cannon']['action'] == 'idle' and s['contextAction']['kind'] == 'cannon' and self.available(s), seconds=5)
            self.tap('interact')
            self.until(lambda s: s['cannon']['action'] == 'recovery', seconds=2)
            self.until(lambda s: s['enemies'][0]['hp'] <= 0 or not any(p['kind'] == 'cannon' for p in s['projectiles']), seconds=2)
        if self.last['enemies'][0]['hp'] > 0:
            raise RuntimeError('Three ordinary cannon shots did not defeat the sword.')
        self.set_phase('return-to-gun-platform')
        def left_jump(s):
            self.move(-1)
            if self.available(s) and s['hero']['y'] == 255 and s['hero']['x'] >= 548:
                self.tap('jump')
        self.until(lambda s: s['hero']['x'] <= 535, left_jump, seconds=6)
        self.move(0)
        self.until(lambda s: s['hero']['grounded'] and s['hero']['y'] == 207, seconds=3)
        self.reload_pursuit()

    def remote_first(self):
        self.set_phase('upper-route-to-musketeer')
        self.right_to(450, False)
        self.until(lambda s: s['hero']['grounded'] and s['hero']['y'] == 207, seconds=3)
        self.reload_pursuit()
        self.set_phase('return-to-sword')
        def left(s):
            self.move(-1)
            if s['hero']['grounded'] and s['hero']['x'] - s['enemies'][0]['x'] < 85:
                self.tap('jump')
        self.until(lambda s: s['hero']['x'] <= 390, left, seconds=8)
        self.move(0)
        self.until(lambda s: s['hero']['grounded'] and s['hero']['y'] == 255, seconds=3)
        for _ in range(2):
            if self.last['enemies'][0]['hp'] <= 0:
                break
            self.sword_parry()
            self.set_phase('earned-sword-pursuit')
            self.tap('attack')
            self.until(lambda s: not s['hero']['attack'], seconds=2)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:5176/')
    parser.add_argument('--route', choices=['cannon-first', 'remote-first'], default='cannon-first')
    parser.add_argument('--touch', action='store_true')
    parser.add_argument('--headed', action='store_true')
    parser.add_argument('--mp4', action='store_true')
    parser.add_argument('--max-seconds', type=float, default=90)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    url = urlsplit(args.url)
    if url.hostname not in {'127.0.0.1', 'localhost'} or url.scheme not in {'http', 'https'} or 'manual' in parse_qs(url.query, keep_blank_values=True):
        parser.error('Use the existing local development server without any manual query parameter.')
    root = Path(__file__).resolve().parents[1]
    output = (args.output or root / '.qa/playtest' / f"adaptive-{args.route}-{'touch' if args.touch else 'desktop'}-{datetime.now():%Y%m%d-%H%M%S}").resolve()
    if not output.is_relative_to((root / '.qa/playtest').resolve()) or output.exists():
        parser.error('Output must be a new directory under this project .qa/playtest.')
    output.mkdir(parents=True)
    viewport = {'width': 844, 'height': 390} if args.touch else {'width': 1280, 'height': 720}
    report = {'schemaVersion': 1, 'route': args.route, 'checkedAtUtc': datetime.now(timezone.utc).isoformat(),
        'url': args.url, 'viewport': viewport, 'touch': args.touch, 'deviceScaleFactor': 3 if args.touch else 1,
        'readOnlyDiagnostic': 'render_game_to_text: current pose, action/phase, context, events and model clock',
        'clock': 'Actual wall clock and normal application RAF; no advanceTime, manual clock or state writes.',
        'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'inputs': [], 'samples': [], 'events': [], 'phases': [], 'notes': [], 'console': [],
        'pageErrors': [], 'failedRequests': [], 'blockedVisitRequests': [], 'error': None,
        'limitations': ['Adaptive automated input uses read-only diagnostics and is not a human participant.',
            'Browser video is continuous, unedited and silent; no listening/quality claim.',
            'Touch is Chromium/CDP emulation, not a physical phone.',
            'Measured route duration is not padded to the 45–90 second first-player target.']}
    driver = None
    video = None
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not args.headed)
        context = browser.new_context(viewport=viewport, screen=viewport, has_touch=args.touch, is_mobile=args.touch,
            device_scale_factor=report['deviceScaleFactor'], record_video_dir=str(output / 'original-video'), record_video_size=viewport)
        def route_request(route):
            if urlsplit(route.request.url).path.startswith('/api/visits'):
                report['blockedVisitRequests'].append(route.request.url)
                route.abort()
            else:
                route.continue_()
        context.route('**/*', route_request)
        page = context.new_page()
        video = page.video
        page.on('console', lambda message: report['console'].append({'type': message.type, 'text': message.text}))
        page.on('pageerror', lambda error: report['pageErrors'].append(str(error)))
        page.on('requestfailed', lambda request: report['failedRequests'].append({'url': request.url, 'failure': request.failure}))
        try:
            page.goto(args.url, wait_until='networkidle', timeout=30000)
            page.wait_for_function("typeof window.render_game_to_text === 'function' && document.querySelector('.wake-shell')?.dataset.mode === 'title'", timeout=15000)
            page.bring_to_front()
            cdp = context.new_cdp_session(page)
            if args.touch:
                cdp.send('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 10})
            driver = RouteRecorder(page, cdp, report, output, args.touch, args.max_seconds)
            driver.observe(allow_result=True)
            page.screenshot(path=str(output / '00-title.png'))
            report['titleCaptured'] = True
            report['startClickWallSeconds'] = driver.wall()
            page.locator('[data-command=primary]').click()
            driver.until(lambda s: s['mode'] == 'playing', seconds=3)
            report['firstPlayingWallSeconds'] = driver.wall()
            if args.route == 'cannon-first':
                driver.cannon_first()
            else:
                driver.remote_first()
            driver.set_phase('reach-open-exit')
            driver.right_to(606, args.route == 'cannon-first')
            final = driver.until(lambda s: s['mode'] == 'complete', lambda s: driver.move(1), seconds=4, allow_complete=True)
            driver.release()
            report['completeWallSeconds'] = driver.wall()
            report['playingWallSeconds'] = report['completeWallSeconds'] - report['firstPlayingWallSeconds']
            report['final'] = final
            report['requiredFlags'] = ['parry', 'shove', 'cannon', 'reloadInterrupt'] if args.route == 'cannon-first' else ['parry', 'reloadInterrupt']
            report['missingFlags'] = sorted(set(report['requiredFlags']) - set(final['encounter']['routeFlags']))
            driver.set_phase('result')
            page.wait_for_timeout(1500)
        except Exception as error:
            report['error'] = f'{type(error).__name__}: {error}'
        finally:
            if driver:
                try:
                    driver.release()
                    report['lastRead'] = driver.observe(allow_result=True)
                    report['wallSeconds'] = driver.wall()
                except Exception as error:
                    report['cleanupReadError'] = str(error)
            page.screenshot(path=str(output / '99-final.png'))
            context.close()
            report['originalVideo'] = str(Path(video.path()).resolve()) if video else None
            browser.close()
    report['consoleErrors'] = [message for message in report['console'] if message['type'] == 'error']
    report['noScrollAllSamples'] = bool(report['samples']) and all(s['overflowX'] <= 0 and s['overflowY'] <= 0 for s in report['samples'])
    report['passed'] = bool(not report['error'] and report.get('final', {}).get('mode') == 'complete'
        and not report.get('missingFlags') and report['noScrollAllSamples'] and not report['consoleErrors']
        and not report['pageErrors'] and not report['failedRequests'])
    if args.mp4 and report['originalVideo'] and shutil.which('ffmpeg'):
        command = ['ffmpeg', '-nostdin', '-n', '-i', report['originalVideo'], '-c:v', 'libx264', '-crf', '18',
            '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', str(output / 'playtest.mp4')]
        converted = subprocess.run(command, capture_output=True, text=True, encoding='utf-8')
        report['mp4'] = str(output / 'playtest.mp4') if converted.returncode == 0 else None
        if converted.returncode:
            (output / 'ffmpeg.log').write_text(converted.stderr, encoding='utf-8')
    (output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({key: report.get(key) for key in ['passed', 'route', 'touch', 'error', 'playingWallSeconds',
        'missingFlags', 'originalVideo', 'mp4']}, ensure_ascii=False, indent=2))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
