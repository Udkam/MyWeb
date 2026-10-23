"""Local action-study controls QA; only real UI input plus public clock/readback hooks.

Reuses an already running dev server. Does not alter actor data or launch services.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright


AUDIO_PROBE = r"""(() => {
  window.__cwMediaProbe = [];
  const original = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function(...args) {
    const media = this;
    const item = {resource: media.currentSrc || media.src, promise: 'pending', maxTime: 0,
      playing: false, ended: false, paused: media.paused, duration: null, error: null};
    window.__cwMediaProbe.push(item);
    const sample = () => {
      item.maxTime = Math.max(item.maxTime, media.currentTime || 0);
      item.paused = media.paused; item.ended = media.ended;
      item.duration = Number.isFinite(media.duration) ? media.duration : null;
      if (media.error) item.error = {code: media.error.code, message: media.error.message};
    };
    media.addEventListener('playing', () => { item.playing = true; sample(); });
    for (const event of ['timeupdate', 'ended', 'error', 'pause']) media.addEventListener(event, sample);
    for (const delay of [50, 150, 350, 700]) setTimeout(sample, delay);
    try {
      return Promise.resolve(original.apply(media, args)).then(value => {
        item.promise = 'resolved'; sample(); return value;
      }, error => {
        item.promise = 'rejected'; item.error = {name: error.name, message: error.message};
        sample(); throw error;
      });
    } catch (error) {
      item.promise = 'threw'; item.error = {name: error.name, message: error.message};
      throw error;
    }
  };
})();"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:5176/?manual=1')
    parser.add_argument('--output', default='.qa/art-review/controls-verification.json')
    args = parser.parse_args()
    if not args.url.startswith(('http://127.0.0.1:5176/', 'http://localhost:5176/')):
        raise SystemExit('This check is restricted to the existing local server on port 5176.')
    root = Path(__file__).resolve().parents[1]
    output = root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    report = {
        'checkedAtUtc': datetime.now(timezone.utc).isoformat(),
        'url': args.url, 'scope': 'Local controls; no actor-state injection; no production navigation',
        'checks': {}, 'screenshots': [], 'pageErrors': [], 'audioResources': [],
        'limitations': ['Browser media playback is verified; no human listening/timbre judgement is claimed.',
                        'Mobile is Chromium emulation with CDP multi-touch, not physical-device acceptance.',
                        'An initial pass recorded one transient Framebuffer Unsupported error; focused fullscreen and rotation probes did not reproduce it.'],
    }

    def record(name, passed, details):
        report['checks'][name] = {'passed': bool(passed), 'details': details}
        print(json.dumps({'check': name, 'passed': bool(passed)}, ensure_ascii=False), flush=True)

    def state(page):
        return page.evaluate('JSON.parse(window.render_game_to_text())')

    def advance(page, ticks=1):
        page.evaluate('(n) => window.advanceTime(n * 1000 / 60)', ticks)

    def screenshot(page, name):
        path = output.parent / name
        page.screenshot(path=str(path), full_page=False)
        report['screenshots'].append(str(path.relative_to(root)))

    def no_scroll(page):
        return page.evaluate("""() => ({viewport:[innerWidth,innerHeight], dpr:devicePixelRatio,
          overflowX:document.documentElement.scrollWidth-innerWidth,
          overflowY:document.documentElement.scrollHeight-innerHeight})""")

    def hit_areas(page):
        return page.locator('button').evaluate_all("""buttons => buttons.map(b => {
          const r=b.getBoundingClientRect(); const s=getComputedStyle(b);
          return {name:b.getAttribute('aria-label')||b.textContent,command:b.dataset.command||b.dataset.action,
            width:r.width,height:r.height,visible:r.width>0&&r.height>0&&s.visibility!=='hidden'};
        }).filter(b=>b.visible)""")

    def navigate(context, page):
        # Installed before every context's first navigation, including local probes.
        context.route('**/api/visits*', lambda route: route.abort())
        page.on('pageerror', lambda error: report['pageErrors'].append(str(error)))
        page.on('response', lambda response: report['audioResources'].append(
            {'url': response.url, 'status': response.status}) if '/assets/audio/' in response.url else None)
        page.goto(args.url, wait_until='networkidle')
        page.wait_for_function("window.render_game_to_text && document.querySelector('canvas')")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        report['browserVersion'] = browser.version
        desktop_context = browser.new_context(viewport={'width': 1280, 'height': 720})
        desktop_context.add_init_script(AUDIO_PROBE)
        desktop = desktop_context.new_page()
        navigate(desktop_context, desktop)
        initial = state(desktop)
        record('defaultChinese', initial['locale'] == 'zh' and desktop.locator('.wake-shell').get_attribute('lang') == 'zh-CN',
               {'locale': initial['locale'], 'startText': desktop.locator('[data-command=primary]').inner_text()})
        desktop.locator('[data-command=language]').click()
        desktop.reload(wait_until='networkidle')
        desktop.wait_for_function('window.render_game_to_text')
        english = state(desktop)
        record('englishPersistsAfterRefresh', english['locale'] == 'en',
               {'locale': english['locale'], 'startText': desktop.locator('[data-command=primary]').inner_text()})
        desktop.locator('[data-command=language]').click()
        desktop.reload(wait_until='networkidle')
        desktop.wait_for_function('window.render_game_to_text')
        record('chinesePersistsAfterRefresh', state(desktop)['locale'] == 'zh', {'locale': state(desktop)['locale']})
        desktop.locator('[data-command=primary]').click()
        desktop.keyboard.down('KeyD')
        advance(desktop, 10)
        desktop.keyboard.up('KeyD')
        desktop.locator('[data-command=pause]').click()
        paused = state(desktop)
        advance(desktop, 60)
        frozen = state(desktop)
        desktop.locator('[data-command=primary]').click()
        advance(desktop, 5)
        resumed = state(desktop)
        record('pauseAndExplicitContinue', paused['mode'] == 'paused' and frozen['tick'] == paused['tick']
               and resumed['tick'] == paused['tick'] + 5 and resumed['mode'] == 'playing',
               {'pausedTick': paused['tick'], 'frozenTick': frozen['tick'], 'resumedTick': resumed['tick']})
        fullscreen = {'enabled': desktop.evaluate('document.fullscreenEnabled')}
        desktop.locator('[data-command=fullscreen]').click()
        desktop.wait_for_timeout(120)
        fullscreen['entered'] = desktop.evaluate('Boolean(document.fullscreenElement)')
        if fullscreen['entered']:
            desktop.locator('[data-command=fullscreen]').click()
            desktop.wait_for_timeout(120)
        fullscreen['exited'] = not desktop.evaluate('Boolean(document.fullscreenElement)')
        record('fullscreenAttempt', fullscreen['entered'] and fullscreen['exited'], fullscreen)
        if not fullscreen['entered']:
            report['limitations'].append('Fullscreen was requested through its real button but headless did not enter it.')

        # Reproduce a real route from the restart button, then use friendly fire to change HP.
        desktop.locator('[data-command=restart]').click()
        desktop.keyboard.down('KeyD'); advance(desktop, 20)
        desktop.keyboard.down('Space'); advance(desktop); desktop.keyboard.up('Space')
        for _ in range(65):
            advance(desktop)
            s = state(desktop)
            if s['hero']['grounded'] and s['hero']['x'] > 170: break
        desktop.keyboard.up('KeyD')
        for _ in range(100):
            s = state(desktop)
            if s['enemies'][0]['action'] == 'windup' and s['enemies'][0]['actionTime'] >= 410: break
            advance(desktop)
        desktop.keyboard.down('KeyK')
        for _ in range(12):
            advance(desktop)
            if any(event['type'] == 'parry' for event in state(desktop)['log']): break
        desktop.keyboard.up('KeyK')
        desktop.keyboard.down('KeyD'); desktop.keyboard.down('KeyJ'); advance(desktop)
        desktop.keyboard.up('KeyJ'); desktop.keyboard.up('KeyD'); advance(desktop, 28)
        desktop.keyboard.down('KeyD')
        for _ in range(40):
            s = state(desktop)
            if s['enemies'][0]['x'] - s['hero']['x'] <= 40: break
            advance(desktop)
        desktop.keyboard.down('ShiftLeft'); advance(desktop); desktop.keyboard.up('ShiftLeft'); advance(desktop, 18)
        for _ in range(180):
            if state(desktop)['hero']['x'] >= 602: break
            advance(desktop)
        desktop.keyboard.up('KeyD')
        desktop.keyboard.down('KeyE'); advance(desktop); desktop.keyboard.up('KeyE'); advance(desktop, 65)
        desktop.keyboard.down('KeyA'); advance(desktop, 17); desktop.keyboard.up('KeyA')
        for _ in range(100):
            if state(desktop)['cannon']['action'] == 'idle': break
            advance(desktop)
        desktop.keyboard.down('KeyE'); advance(desktop); desktop.keyboard.up('KeyE'); advance(desktop, 28)
        changed = state(desktop)
        desktop.locator('[data-command=restart]').click()
        restored = state(desktop)
        restored_ok = restored['tick'] == 0 and restored['hero']['hp'] == 6 and restored['hero']['maxHp'] == 6
        restored_ok = restored_ok and restored['hero']['x'] == 86 and restored['hero']['y'] == 255
        restored_ok = restored_ok and [enemy['hp'] for enemy in restored['enemies']] == [3, 2]
        restored_ok = restored_ok and not restored['projectiles'] and restored['cannon']['action'] == 'idle'
        record('restartRestoresScene', restored_ok and changed['hero']['hp'] < 6 and changed['enemies'][0]['hp'] == 0,
               {'before': {'hp': changed['hero']['hp'], 'enemyHp': [enemy['hp'] for enemy in changed['enemies']],
                           'tick': changed['tick']},
                'after': {'hp': restored['hero']['hp'], 'maxHp': restored['hero']['maxHp'],
                          'position': [restored['hero']['x'], restored['hero']['y']],
                          'enemyHp': [enemy['hp'] for enemy in restored['enemies']], 'tick': restored['tick']}})

        desktop.keyboard.down('KeyJ'); advance(desktop); desktop.keyboard.up('KeyJ')
        desktop.wait_for_timeout(800)
        media = desktop.evaluate('window.__cwMediaProbe')
        played = [item for item in media if item['promise'] == 'resolved' and item['playing'] and item['maxTime'] > 0]
        record('browserAudioPlayback', bool(played), {'calls': media, 'verifiedPlayingCount': len(played),
               'claim': 'play Promise + playing event + playback time progression; not a listening assessment'})
        desktop.locator('[data-command=mute]').click()
        count_before = len(desktop.evaluate('window.__cwMediaProbe'))
        advance(desktop, 26)
        desktop.keyboard.down('KeyJ'); advance(desktop); desktop.keyboard.up('KeyJ')
        desktop.wait_for_timeout(100)
        record('muteStopsNewPlayback', len(desktop.evaluate('window.__cwMediaProbe')) == count_before,
               {'beforePlayCalls': count_before, 'afterPlayCalls': len(desktop.evaluate('window.__cwMediaProbe'))})
        desktop_areas = hit_areas(desktop)
        desktop_scroll = no_scroll(desktop)
        record('desktopHitAreasAndNoScroll', all(area['width'] >= 43.99 and area['height'] >= 43.99 for area in desktop_areas)
               and desktop_scroll['overflowX'] <= 0 and desktop_scroll['overflowY'] <= 0,
               {'areas': desktop_areas, 'layout': desktop_scroll})
        screenshot(desktop, 'controls-desktop.png')
        desktop_context.close()

        mobile_context = browser.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=3,
                                             is_mobile=True, has_touch=True)
        mobile = mobile_context.new_page()
        navigate(mobile_context, mobile)
        mobile.locator('[data-command=primary]').tap()
        cdp = mobile_context.new_cdp_session(mobile)

        def point(action, identifier, dx=0):
            box = mobile.locator(f'[data-action={action}]').bounding_box()
            return {'id': identifier, 'x': box['x'] + box['width'] / 2 + dx,
                    'y': box['y'] + box['height'] / 2, 'radiusX': 5, 'radiusY': 5, 'force': 1}

        def touch(event, points):
            cdp.send('Input.dispatchTouchEvent', {'type': event, 'touchPoints': points})

        right, jump = point('right', 1), point('jump', 2)
        touch('touchStart', [right]); advance(mobile, 8)
        first = state(mobile)
        touch('touchStart', [right, jump]); advance(mobile)
        jumped = state(mobile)
        # Chromium's partial touchEnd list identifies the released finger(s).
        touch('touchEnd', [jump]); advance(mobile, 8)
        moving_jump = state(mobile)
        right_held = mobile.locator('[data-action=right]').evaluate("b=>b.classList.contains('is-held')")
        screenshot(mobile, 'controls-phone-landscape.png')
        touch('touchEnd', []); advance(mobile, 3)
        released = state(mobile)
        record('touchMoveAndJumpWithoutReleasingMove', jumped['hero']['y'] < 255 and moving_jump['hero']['x'] > jumped['hero']['x']
               and moving_jump['hero']['vx'] > 0 and right_held,
               {'movedX': first['hero']['x'], 'jumped': [jumped['hero']['x'], jumped['hero']['y']],
                'continued': [moving_jump['hero']['x'], moving_jump['hero']['y']], 'rightHeldAfterJumpRelease': right_held})
        record('touchReleaseLeavesNoInput', released['hero']['vx'] == 0 and mobile.locator('.is-held').count() == 0,
               {'vx': released['hero']['vx'], 'heldButtons': mobile.locator('.is-held').count()})

        mobile.locator('[data-command=restart]').tap()
        right_a, right_b = point('right', 3, -8), point('right', 4, 8)
        touch('touchStart', [right_a, right_b]); advance(mobile, 2)
        both = state(mobile)
        touch('touchEnd', [right_a]); advance(mobile, 4)
        one = state(mobile)
        one_held = mobile.locator('[data-action=right]').evaluate("b=>b.classList.contains('is-held')")
        touch('touchEnd', []); advance(mobile, 2)
        none = state(mobile)
        record('sameActionMultiFingerRelease', one['hero']['x'] > both['hero']['x'] and one_held
               and none['hero']['vx'] == 0 and mobile.locator('.is-held').count() == 0,
               {'twoFingerX': both['hero']['x'], 'oneFingerX': one['hero']['x'],
                'heldWithOneFinger': one_held, 'releasedVx': none['hero']['vx']})

        areas = hit_areas(mobile)
        layout = no_scroll(mobile)
        record('phoneLandscapeHitAreasAndNoScroll', all(area['width'] >= 43.99 and area['height'] >= 43.99 for area in areas)
               and layout['overflowX'] <= 0 and layout['overflowY'] <= 0,
               {'areas': areas, 'layout': layout})

        right = point('right', 5)
        touch('touchStart', [right]); advance(mobile, 3)
        before_rotation = state(mobile)
        mobile.set_viewport_size({'width': 390, 'height': 844})
        mobile.wait_for_timeout(160)
        portrait = state(mobile)
        advance(mobile, 30)
        portrait_frozen = state(mobile)
        portrait_layout = no_scroll(mobile)
        screenshot(mobile, 'controls-phone-portrait.png')
        mobile.set_viewport_size({'width': 844, 'height': 390})
        mobile.wait_for_timeout(160)
        returned = state(mobile)
        advance(mobile, 15)
        landscape_frozen = state(mobile)
        touch('touchEnd', [])
        mobile.locator('[data-command=primary]').tap()
        advance(mobile, 5)
        explicit_resume = state(mobile)
        record('rotationPausesAndRequiresContinue', portrait['mode'] == 'paused' and portrait_frozen['tick'] == portrait['tick']
               and returned['mode'] == 'paused' and landscape_frozen['tick'] == returned['tick']
               and explicit_resume['mode'] == 'playing' and explicit_resume['hero']['vx'] == 0
               and portrait_layout['overflowX'] <= 0 and portrait_layout['overflowY'] <= 0,
               {'beforeTick': before_rotation['tick'], 'portraitTick': portrait['tick'],
                'portraitFrozenTick': portrait_frozen['tick'], 'returnedMode': returned['mode'],
                'returnedTick': returned['tick'], 'landscapeFrozenTick': landscape_frozen['tick'],
                'resumedTick': explicit_resume['tick'], 'resumedVx': explicit_resume['hero']['vx'],
                'portraitLayout': portrait_layout})
        mobile_context.close()
        browser.close()

    report['passed'] = all(check['passed'] for check in report['checks'].values()) and not report['pageErrors']
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'passed': report['passed'], 'checks': len(report['checks']),
                      'failures': [name for name, check in report['checks'].items() if not check['passed']],
                      'pageErrors': report['pageErrors'], 'report': str(output)}, ensure_ascii=False), flush=True)
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
