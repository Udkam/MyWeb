"""Record Cutlass Wake with wall-clock browser input and its normal RAF loop.

Uses an existing server; never starts one, advances game time, or writes game state.
Recordings are browser video without system audio, not a human playtest claim.

Example action JSON (times are seconds after the loaded title is captured)::

  {
    "label": "short-script-smoke",
    "viewport": {"width": 1280, "height": 720},
    "hasTouch": false, "isMobile": false, "deviceScaleFactor": 1,
    "timeline": [
      {"at": 0.5, "type": "click", "selector": "[data-command=primary]"},
      {"at": 0.9, "type": "keyDown", "key": "d"},
      {"at": 1.3, "type": "keyPress", "key": "Space", "holdMs": 70},
      {"at": 1.7, "type": "keyUp", "key": "d"},
      {"at": 2.0, "type": "keyPress", "key": "j", "holdMs": 70}
    ],
    "stop": {"afterSeconds": 3, "requireResult": false}
  }

Touch actions merge persistent fingers by id, so two fingers remain genuinely down:
  {"at": 1, "type": "touchStart", "points": [
    {"id": 1, "selector": "[data-action=right]"}]}
  {"at": 1.2, "type": "touchStart", "points": [
    {"id": 2, "selector": "[data-action=jump]"}]}
  {"at": 1.35, "type": "touchEnd", "ids": [2]}
  {"at": 1.8, "type": "touchEnd", "ids": [1]}

Other types: touchMove(points with existing ids), touchCancel, screenshot(name),
resize(width,height), keyPress(key,holdMs), click(selector OR x,y).
Point selectors use visible element centers; x/y are CSS viewport coordinates.
stop defaults: onModes=[dead,victory,complete], afterResultSeconds=1.5,
requireResult=true. afterSeconds is the hard wall-clock cap, never an alleged
player duration. --ui-only disables all optional debug reads for production QA.
Optional afterResultTimeline uses the same actions with at measured from the
first visible result. It can click the real restart button and run a short replay;
stop.afterResultSeconds must leave enough time for these post-result inputs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import sync_playwright


READ_UI = """(readDebug) => {
  const q = s => document.querySelector(s);
  const visible = el => !!el && el.getClientRects().length > 0 && !el.hidden
    && getComputedStyle(el).visibility !== 'hidden';
  const text = s => visible(q(s)) ? q(s).textContent.trim() : null;
  const rect = el => { if (!el) return null; const r=el.getBoundingClientRect();
    return {x:r.x,y:r.y,width:r.width,height:r.height}; };
  const rawTimer = text('.wake-encounter-time');
  const timerMatch = rawTimer?.match(/^(\\d+):(\\d{2})$/);
  const hp=q('.wake-health');
  const ui = {
    mode:q('.wake-shell')?.dataset.mode ?? null,
    timerText:rawTimer,
    elapsedSeconds:timerMatch ? +timerMatch[1]*60 + +timerMatch[2] : null,
    health:hp ? {current:Number(hp.getAttribute('aria-valuenow')),
      maximum:Number(hp.getAttribute('aria-valuemax'))} : null,
    title:text('.wake-card-title'), resultNote:text('.wake-card-note'),
    cue:text('.wake-cue'),
    settingsOpen:visible(q('.wake-settings')),
    portraitOverlay:visible(q('.wake-portrait')),
    context:q('[data-action=interact]')?.dataset.context ?? null,
    contextVisible:visible(q('[data-action=interact]')),
    contextText:text('[data-action=interact]'),
    guardPressureVisible:visible(q('.wake-guard-state')),
    guardPressureLabel:q('.wake-guard-state')?.getAttribute('aria-label') ?? null,
    primaryVisible:visible(q('[data-command=primary]')),
    primaryText:text('[data-command=primary]'),
  };
  let debug=null,debugReadError=null;
  if (readDebug && typeof window.render_game_to_text === 'function') {
    try { const s=JSON.parse(window.render_game_to_text());
      debug={source:'render_game_to_text',modelTimeMs:s.time ?? null,
        tick:s.tick ?? null,paused:s.paused ?? null,mode:s.mode ?? null};
    } catch(e) { debugReadError=String(e); }
  }
  return {
    browserPerformanceMs:performance.now(),
    visibility:document.visibilityState,focused:document.hasFocus(),
    viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,
      screenWidth:screen.width,screenHeight:screen.height,
      visualWidth:visualViewport?.width ?? null,visualHeight:visualViewport?.height ?? null},
    document:{width:document.documentElement.scrollWidth,
      height:document.documentElement.scrollHeight,
      overflowX:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,
      overflowY:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)-innerHeight},
    stage:rect(q('.wake-stage')),
    canvas:q('canvas') ? {width:q('canvas').width,height:q('canvas').height,
      rect:rect(q('canvas'))} : null,
    visibleButtons:[...document.querySelectorAll('button')].filter(visible).map(el=>({
      name:el.getAttribute('aria-label') || el.textContent.trim(),
      action:el.dataset.action ?? null,command:el.dataset.command ?? null,
      disabled:el.disabled,rect:rect(el)})),
    diagnosticAvailability:{cw:typeof window.__cw !== 'undefined',
      renderGameToText:typeof window.render_game_to_text === 'function',
      advanceTime:typeof window.advanceTime === 'function'},
    ui,debug,debugReadError
  };
}"""


def finite_number(value, label, minimum=0):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < minimum:
        raise ValueError(f'{label} must be a finite number >= {minimum}.')
    return value


def load_plan(path: Path):
    plan = json.loads(path.read_text(encoding='utf-8-sig'))
    viewport = plan.get('viewport', {'width': 1280, 'height': 720})
    for axis in ('width', 'height'):
        if not isinstance(viewport.get(axis), int) or not 1 <= viewport[axis] <= 7680:
            raise ValueError(f'viewport.{axis} must be an integer in 1..7680.')
    finite_number(plan.get('deviceScaleFactor', 1), 'deviceScaleFactor', 0.1)
    stop = plan.setdefault('stop', {})
    finite_number(stop['afterSeconds'], 'stop.afterSeconds', 0.1)
    finite_number(stop.setdefault('afterResultSeconds', 1.5), 'stop.afterResultSeconds')
    stop.setdefault('onModes', ['dead', 'victory', 'complete'])
    stop.setdefault('requireResult', True)
    if not isinstance(stop['onModes'], list) or not all(isinstance(x, str) for x in stop['onModes']):
        raise ValueError('stop.onModes must be a list of strings.')
    timeline = plan['timeline']
    if not isinstance(timeline, list) or not timeline:
        raise ValueError('timeline must contain ordinary browser input actions.')
    supported = {'click', 'keyDown', 'keyUp', 'keyPress', 'touchStart', 'touchMove', 'touchEnd',
                 'touchCancel', 'screenshot', 'resize'}
    previous = -1
    has_input = False
    for index, event in enumerate(timeline):
        at = finite_number(event['at'], f'timeline[{index}].at')
        if at < previous or at > stop['afterSeconds']:
            raise ValueError('Timeline must be chronological and inside stop.afterSeconds.')
        previous = at
        if event.get('type') not in supported:
            raise ValueError(f'Unsupported input type: {event.get("type")}')
        has_input |= event['type'] not in {'screenshot', 'resize'}
        if event['type'] == 'keyPress':
            finite_number(event.get('holdMs', 70), 'holdMs')
    if not has_input:
        raise ValueError('Screenshots or idle waits alone do not constitute an input trajectory.')
    previous = -1
    for index, event in enumerate(plan.get('afterResultTimeline', [])):
        at = finite_number(event['at'], f'afterResultTimeline[{index}].at')
        if at < previous or at > stop['afterResultSeconds']:
            raise ValueError('afterResultTimeline must be chronological and inside afterResultSeconds.')
        previous = at
        if event.get('type') not in supported:
            raise ValueError(f'Unsupported post-result input type: {event.get("type")}')
        if event['type'] == 'keyPress':
            finite_number(event.get('holdMs', 70), 'holdMs')
    interval = finite_number(plan.get('sampleEverySeconds', 0.5), 'sampleEverySeconds', 0.1)
    return plan, viewport, interval


def probe_video(source: Path):
    ffprobe = shutil.which('ffprobe')
    if not ffprobe:
        return {'available': False, 'reason': 'ffprobe is not on PATH.'}
    run = subprocess.run([ffprobe, '-v', 'error', '-show_entries',
        'format=duration:stream=codec_name,width,height,avg_frame_rate', '-of', 'json', str(source)],
        capture_output=True, text=True, encoding='utf-8', errors='replace')
    return {'available': run.returncode == 0,
            'data': json.loads(run.stdout) if run.returncode == 0 else None,
            'note': 'Video includes navigation/loading/title capture before the action timeline. Container duration is not player completion time.'}


def transcode(source: Path, output: Path):
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        return {'success': False, 'reason': 'ffmpeg is not on PATH; original browser video retained.'}
    command = [ffmpeg, '-nostdin', '-n', '-i', str(source), '-c:v', 'libx264', '-crf', '18',
               '-pix_fmt', 'yuv420p', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
               '-movflags', '+faststart', '-an', str(output)]
    run = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace')
    (output.parent / 'ffmpeg.log').write_text(run.stderr, encoding='utf-8')
    return {'success': run.returncode == 0, 'exitCode': run.returncode,
            'file': str(output) if output.exists() else None,
            'originalPreserved': source.exists(), 'systemAudioCaptured': False,
            'metadata': probe_video(output) if run.returncode == 0 else None}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--url', default='http://127.0.0.1:5176/')
    parser.add_argument('--actions', type=Path, required=True, help='UTF-8 JSON trajectory; see description.')
    parser.add_argument('--output', type=Path, help='New evidence directory below this project .qa.')
    parser.add_argument('--ui-only', action='store_true', help='Read visible DOM only, with no debug hook calls.')
    parser.add_argument('--headed', action='store_true', help='Show the task-owned Chromium recording window.')
    parser.add_argument('--mp4', action='store_true', help='Also transcode with installed FFmpeg; preserve original.')
    args = parser.parse_args()
    parsed = urlsplit(args.url)
    if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
        parser.error('--url must be an explicit HTTP(S) target.')
    if 'manual' in parse_qs(parsed.query, keep_blank_values=True):
        parser.error('Real-time recording refuses any manual query parameter.')
    root = Path(__file__).resolve().parents[1]
    actions_file = args.actions.resolve()
    try:
        plan, viewport, sample_interval = load_plan(actions_file)
    except (ValueError, KeyError, OSError) as error:
        parser.error(str(error))
    output = (root / (args.output or Path('.qa/playtest') / datetime.now().strftime('realtime-%Y%m%d-%H%M%S'))).resolve()
    if not output.is_relative_to((root / '.qa').resolve()):
        parser.error('--output must be below this project .qa directory.')
    if output.exists() and any(output.iterdir()):
        parser.error('Use a new or empty output directory; previous evidence is preserved.')
    output.mkdir(parents=True, exist_ok=True)
    shutil.copy2(actions_file, output / 'actions.json')
    report = {
        'schemaVersion': 1, 'checkedAtUtc': datetime.now(timezone.utc).isoformat(),
        'label': plan.get('label'), 'url': args.url,
        'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'inputPlan': {'file': str(actions_file), 'sha256': hashlib.sha256(actions_file.read_bytes()).hexdigest(),
                      'scheduledCapSeconds': plan['stop']['afterSeconds'], 'eventCount': len(plan['timeline']),
                      'afterResultEventCount': len(plan.get('afterResultTimeline', []))},
        'clock': 'Real wall clock and the application normal RAF; no manual query, advanceTime, or actor-state writes.',
        'uiOnly': args.ui_only, 'requestedViewport': viewport,
        'context': {key: plan.get(key, default) for key, default in
                    [('hasTouch', False), ('isMobile', False), ('deviceScaleFactor', 1)]},
        'console': [], 'pageErrors': [], 'failedRequests': [], 'blockedVisitRequests': [],
        'samples': [], 'actions': [], 'screenshots': [], 'error': None,
        'limitations': [
            'Scripted input is not a human participant or an estimate of human completion time.',
            'Mobile is Chromium/CDP emulation, not a physical phone.',
            'Playwright browser video contains no system audio; audio quality and synchronization need separate listening.',
            'UI timer has whole-second precision; exact model elapsed is unavailable in production without a read-only diagnostic.',
            'A completed recording does not establish art approval or all combat mechanics.',
        ],
    }
    stop = plan['stop']
    timeline = plan['timeline']
    held_keys: set[str] = set()
    fingers: dict[int, dict] = {}
    video = None
    origin = None
    result_at = None
    result_mode = None
    page = None
    browser = None
    context = None
    cdp = None

    with sync_playwright() as pw:
        try:
            browser = pw.chromium.launch(headless=not args.headed)
            context = browser.new_context(viewport=viewport, screen=viewport,
                record_video_dir=str(output / 'original-video'), record_video_size=viewport,
                device_scale_factor=report['context']['deviceScaleFactor'],
                is_mobile=report['context']['isMobile'], has_touch=report['context']['hasTouch'])

            def block_visits(route):
                if urlsplit(route.request.url).path.startswith('/api/visits'):
                    report['blockedVisitRequests'].append(route.request.url)
                    route.abort()
                else:
                    route.continue_()

            # Installed before the first navigation, including all production targets.
            context.route('**/*', block_visits)
            page = context.new_page()
            video = page.video
            page.on('console', lambda message: report['console'].append({
                'type': message.type, 'text': message.text,
                'wallSeconds': round(time.perf_counter() - origin, 6) if origin else None}))
            page.on('pageerror', lambda error: report['pageErrors'].append(str(error)))
            page.on('requestfailed', lambda request: report['failedRequests'].append({
                'url': request.url, 'failure': request.failure,
                'intentionalVisitBlock': urlsplit(request.url).path.startswith('/api/visits')}))
            navigation_start = time.perf_counter()
            page.goto(args.url, wait_until='networkidle', timeout=30000)
            page.wait_for_selector('.wake-shell[data-mode]', timeout=15000)
            page.wait_for_selector('canvas', timeout=15000)
            page.bring_to_front()
            report['navigationWallSeconds'] = time.perf_counter() - navigation_start
            cdp = context.new_cdp_session(page)
            if report['context']['hasTouch']:
                cdp.send('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 10})

            def snap(name):
                path = output / name
                page.screenshot(path=str(path), full_page=False)
                report['screenshots'].append(str(path))

            def sample():
                snapshot = page.evaluate(READ_UI, not args.ui_only)
                snapshot['wallSeconds'] = round(time.perf_counter() - origin, 6)
                report['samples'].append(snapshot)
                return snapshot

            initial = page.evaluate(READ_UI, not args.ui_only)
            report['initial'] = initial
            report['titleCaptured'] = initial['ui']['mode'] in {'title', 'ready', 'menu'}
            snap('00-title.png')
            if not report['titleCaptured']:
                raise RuntimeError('Loaded state is not the title; full title-to-result flow cannot be claimed.')
            origin = time.perf_counter()
            sample()
            next_sample = sample_interval
            event_index = 0
            started_playing_at = None

            def touch_point(point):
                finger_id = point['id']
                if not isinstance(finger_id, int) or finger_id < 0:
                    raise ValueError('Touch ids must be nonnegative integers.')
                if 'selector' in point:
                    element = page.locator(point['selector']).first
                    element.wait_for(state='visible', timeout=2500)
                    box = element.bounding_box()
                    if not box:
                        raise RuntimeError(f'Touch target has no visible rectangle: {point["selector"]}')
                    x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
                else:
                    x, y = point['x'], point['y']
                return {'id': finger_id, 'x': x, 'y': y, 'radiusX': 4, 'radiusY': 4, 'force': 1}

            def touch(kind, changed_points=None):
                cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints':
                    list(fingers.values()) if changed_points is None else changed_points})

            def release_inputs():
                for key in list(held_keys):
                    page.keyboard.up(key)
                    held_keys.discard(key)
                if fingers:
                    fingers.clear()
                    touch('touchEnd')

            def apply(event):
                kind = event['type']
                if kind == 'keyDown':
                    page.keyboard.down(event['key']); held_keys.add(event['key'])
                elif kind == 'keyUp':
                    page.keyboard.up(event['key']); held_keys.discard(event['key'])
                elif kind == 'keyPress':
                    page.keyboard.press(event['key'], delay=event.get('holdMs', 70))
                elif kind == 'click':
                    if 'selector' in event:
                        page.locator(event['selector']).first.click(timeout=2500)
                    else:
                        page.mouse.click(event['x'], event['y'])
                elif kind in {'touchStart', 'touchMove'}:
                    if not report['context']['hasTouch']:
                        raise ValueError('Touch input requires plan.hasTouch=true.')
                    for point in event['points']:
                        if kind == 'touchMove' and point['id'] not in fingers:
                            raise ValueError('touchMove references an inactive finger.')
                        if kind == 'touchStart' and point['id'] in fingers:
                            raise ValueError('touchStart repeats an active id; use touchMove.')
                        fingers[point['id']] = touch_point(point)
                    touch(kind)
                elif kind == 'touchEnd':
                    ended = []
                    for finger_id in event['ids']:
                        if finger_id not in fingers:
                            raise ValueError('touchEnd references an inactive finger.')
                        ended.append(fingers[finger_id])
                        del fingers[finger_id]
                    # CDP's nonempty touchEnd list contains the fingers being released,
                    # whereas touchStart/touchMove carry currently active points.
                    # An empty touchEnd list releases ALL fingers, so skip an empty ids set.
                    if ended:
                        touch(kind, ended)
                elif kind == 'touchCancel':
                    fingers.clear(); touch(kind)
                elif kind == 'resize':
                    page.set_viewport_size({'width': event['width'], 'height': event['height']})
                elif kind == 'screenshot':
                    name = Path(event.get('name', f'event-{event_index:03d}.png')).name
                    if not name.endswith('.png'):
                        raise ValueError('Screenshot names must end in .png.')
                    snap(name)

            while True:
                now = time.perf_counter() - origin
                if result_at is not None and now >= result_at + stop['afterResultSeconds']:
                    report['stopReason'] = 'result-visible'
                    break
                if now >= stop['afterSeconds']:
                    report['stopReason'] = 'wall-clock-cap'
                    break
                if event_index < len(timeline) and now >= timeline[event_index]['at']:
                    event = timeline[event_index]
                    actual_start = time.perf_counter() - origin
                    entry = {'index': event_index, 'planned': event, 'actualStartSeconds': actual_start,
                             'lateSeconds': actual_start - event['at']}
                    report['actions'].append(entry)
                    apply(event)
                    entry['actualEndSeconds'] = time.perf_counter() - origin
                    entry['activeTouchIds'] = list(fingers)
                    entry['heldUiActions'] = page.locator('[data-action].is-held').evaluate_all(
                        'buttons=>buttons.map(button=>button.dataset.action)')
                    event_index += 1
                    continue
                if now >= next_sample:
                    current = sample()
                    mode = current['ui']['mode']
                    if started_playing_at is None and mode == 'playing':
                        started_playing_at = current['wallSeconds']
                        report['firstPlayingWallSeconds'] = started_playing_at
                    if result_at is None and started_playing_at is not None and mode in stop['onModes']:
                        result_at, result_mode = current['wallSeconds'], mode
                        report['resultSnapshot'] = current
                        snap('80-result.png')
                        release_inputs()
                        report['skippedPreResultEvents'] = len(timeline) - event_index
                        timeline = timeline[:event_index] + [
                            {**event, 'at': result_at + event['at'],
                             'resultRelativeAt': event['at'], 'phase': 'afterResult'}
                            for event in plan.get('afterResultTimeline', [])]
                    next_sample += sample_interval
                    if next_sample < now:
                        next_sample = now + sample_interval
                    continue
                next_due = min(next_sample, stop['afterSeconds'])
                if result_at is not None:
                    next_due = min(next_due, result_at + stop['afterResultSeconds'])
                if event_index < len(timeline):
                    next_due = min(next_due, timeline[event_index]['at'])
                page.wait_for_timeout(max(1, min(50, (next_due - now) * 1000)))

            release_inputs()
            sample()
            snap('99-final.png')
            report['wallElapsedSeconds'] = time.perf_counter() - origin
            report['result'] = {'observed': result_at is not None, 'mode': result_mode,
                                'wallSeconds': result_at, 'required': stop['requireResult']}
            report['unexecutedScheduledEvents'] = len(timeline) - event_index
        except Exception as error:
            report['error'] = f'{type(error).__name__}: {error}'
            if page and not page.is_closed():
                try:
                    page.screenshot(path=str(output / 'error.png'), full_page=False)
                except Exception:
                    pass
        finally:
            if context:
                context.close()  # Finalizes the original WebM before reading its path.
            if video:
                try:
                    report['originalVideo'] = str(Path(video.path()).resolve())
                except Exception as error:
                    report['videoError'] = str(error)
            if browser:
                browser.close()

    samples = report['samples']
    report['noScrollAllSamples'] = bool(samples) and all(
        s['document']['overflowX'] <= 0 and s['document']['overflowY'] <= 0 for s in samples)
    report['consoleErrors'] = [item for item in report['console'] if item['type'] == 'error']
    report['unexpectedFailedRequests'] = [item for item in report['failedRequests'] if not item['intentionalVisitBlock']]
    report['allSamplesVisibleAndFocused'] = bool(samples) and all(
        s['visibility'] == 'visible' and s['focused'] for s in samples)
    debug_times = [(s['wallSeconds'], s['debug']['modelTimeMs']) for s in samples
                   if s.get('debug') and isinstance(s['debug'].get('modelTimeMs'), (int, float))]
    report['modelElapsed'] = {
        'available': bool(debug_times), 'source': 'read-only render_game_to_text' if debug_times else None,
        'firstMs': debug_times[0][1] if debug_times else None,
        'lastMs': debug_times[-1][1] if debug_times else None,
        'deltaMs': debug_times[-1][1] - debug_times[0][1] if debug_times else None,
        'note': ('Pauses, title/result time and fixed-step accumulation can make model and wall deltas differ.'
                 if debug_times else 'Exact model elapsed is unavailable in UI-only or production mode; use the visible whole-second timer without inventing millisecond precision.')}
    report['modelElapsed']['timerResets'] = [
        {'wallSeconds': current[0], 'previousMs': previous[1], 'currentMs': current[1]}
        for previous, current in zip(debug_times, debug_times[1:]) if current[1] < previous[1]]
    ui_times = [s['ui']['elapsedSeconds'] for s in samples if s['ui']['elapsedSeconds'] is not None]
    report['uiElapsed'] = {'firstSeconds': ui_times[0] if ui_times else None,
                           'lastSeconds': ui_times[-1] if ui_times else None,
                           'precisionSeconds': 1}
    inputs = [a for a in report['actions'] if a['planned']['type'] not in {'screenshot', 'resize'}]
    report['inputTiming'] = {'executedEvents': len(inputs),
        'firstWallSeconds': inputs[0]['actualStartSeconds'] if inputs else None,
        'lastWallSeconds': inputs[-1].get('actualEndSeconds', inputs[-1]['actualStartSeconds']) if inputs else None,
        'maximumLatenessSeconds': max((a['lateSeconds'] for a in inputs), default=None)}
    result_ok = not stop['requireResult'] or report.get('result', {}).get('observed', False)
    report['completeTitleInputResultFlow'] = bool(report.get('titleCaptured') and inputs
        and report.get('result', {}).get('observed') and report.get('firstPlayingWallSeconds') is not None)
    report['restartedAfterResult'] = bool(result_at is not None and any(
        s['wallSeconds'] > result_at and s['ui']['mode'] == 'playing' for s in samples))
    report['passed'] = bool(not report['error'] and report.get('originalVideo') and result_ok
        and report['noScrollAllSamples'] and not report['pageErrors'] and not report['consoleErrors']
        and not report['unexpectedFailedRequests'] and report['allSamplesVisibleAndFocused'])
    if args.mp4 and report.get('originalVideo'):
        report['mp4'] = transcode(Path(report['originalVideo']), output / 'playtest.mp4')
    if report.get('originalVideo'):
        report['originalVideoMetadata'] = probe_video(Path(report['originalVideo']))
    (output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({key: report.get(key) for key in ['passed', 'label', 'error', 'wallElapsedSeconds',
        'result', 'completeTitleInputResultFlow', 'modelElapsed', 'uiElapsed', 'originalVideo', 'mp4']},
        ensure_ascii=False, indent=2))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
