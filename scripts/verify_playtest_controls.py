"""Verify the encounter UI through real browser controls on an existing local server.

No actor state is injected. Manual time advances the same development game clock.
Mobile uses Chromium/CDP multi-touch emulation; it is not a physical-device test.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse

from playwright.sync_api import sync_playwright

from verify_controls import AUDIO_PROBE


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:5176/?manual=1')
    parser.add_argument('--output', default='.qa/playtest/controls.json')
    args = parser.parse_args()
    parsed = urlparse(args.url)
    if parsed.scheme != 'http' or parsed.hostname not in ('127.0.0.1', 'localhost'):
        raise SystemExit('Only an existing loopback HTTP server is permitted.')
    root = Path(__file__).resolve().parents[1]
    output = (root / args.output).resolve()
    if not output.is_relative_to(root / '.qa'):
        raise SystemExit('Write verification evidence only beneath this project .qa directory.')
    output.parent.mkdir(parents=True, exist_ok=True)
    report = {
        'checkedAtUtc': datetime.now(timezone.utc).isoformat(),
        'url': args.url,
        'scope': 'Encounter UI; actual buttons/keyboard/CDP touch, no actor-state injection',
        'checks': {}, 'screenshots': [], 'pageErrors': [], 'audioResources': [],
        'limitations': [
            'Chromium mobile emulation; no physical phone acceptance.',
            'Media promise/events/time progression can establish playback, not human listening quality.',
            'This controls pass does not establish full combat, route, animation or art acceptance.',
            'Canvas device-pixel scale is measured per viewport/DPR; the 640 and 960 modes need not both be integer-scaled.',
        ],
    }

    def record(name, passed, detail):
        report['checks'][name] = {'passed': bool(passed), 'detail': detail}
        print(json.dumps({'check': name, 'passed': bool(passed)}, ensure_ascii=False), flush=True)

    def state(page):
        return page.evaluate('JSON.parse(window.render_game_to_text())')

    def advance(page, ticks=1):
        page.evaluate('(n) => window.advanceTime(n * 1000 / 60)', ticks)

    def screenshot(page, name):
        path = output.parent / name
        page.screenshot(path=str(path), full_page=False)
        report['screenshots'].append(str(path.relative_to(root)))

    def layout(page):
        return page.evaluate("""() => ({viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,
          overflowX:document.documentElement.scrollWidth-innerWidth,
          overflowY:document.documentElement.scrollHeight-innerHeight,
          stage:(()=>{const r=document.querySelector('.wake-stage').getBoundingClientRect();
            return {width:r.width,height:r.height,x:r.x,y:r.y}})(),
          canvas:(()=>{const c=document.querySelector('canvas');if(!c)return null;
            const r=c.getBoundingClientRect();return {width:c.width,height:c.height,
              css:{width:r.width,height:r.height,x:r.x,y:r.y}}})(),
          canvasPixelScale:(()=>{const c=document.querySelector('canvas');if(!c)return null;
            const r=c.getBoundingClientRect(),s=document.querySelector('.wake-stage');
            const x=r.width*devicePixelRatio/c.width,y=r.height*devicePixelRatio/c.height;
            return {cssX:r.width/c.width,cssY:r.height/c.height,deviceX:x,deviceY:y,
              integerDeviceX:Math.abs(x-Math.round(x))<0.001,
              integerDeviceY:Math.abs(y-Math.round(y))<0.001,
              stageReportedCanvasPixelScale:Number(s.dataset.canvasPixelScale),
              stageReportedWorldPixelScale:Number(s.dataset.pixelScale)}})(),
          buttons:[...document.querySelectorAll('button')].map(b=>{
            const r=b.getBoundingClientRect();return {name:b.getAttribute('aria-label')||b.textContent,
              action:b.dataset.action,command:b.dataset.command,width:r.width,height:r.height,
              visible:b.getClientRects().length>0&&getComputedStyle(b).visibility!=='hidden'}
          }).filter(b=>b.visible)})""")

    def layout_passes(info):
        return info['overflowX'] <= 0 and info['overflowY'] <= 0 and all(
            b['width'] >= 43.99 and b['height'] >= 43.99 for b in info['buttons'])

    def compare_display_modes(page, touch=False):
        """Compare sampling density while the same settings overlay stays open."""
        available = page.locator('[data-display]').first.is_visible()
        result = {'available': available, 'cssTolerancePx': 0.5}
        if not available:
            result['passed'] = False
            return result

        def select(width):
            button = page.locator(f'[data-display="{width}"]')
            button.tap() if touch else button.click()
            page.wait_for_function('(w)=>{const c=document.querySelector("canvas");'
                                   'return c.width===w&&c.height===w*360/640}', arg=width)
            # Let ResizeObserver and browser layout settle; this does not advance game time.
            page.wait_for_timeout(80)
            info = layout(page)
            info['selected'] = button.get_attribute('aria-pressed')
            return info

        result['mode640'] = select(640)
        result['mode960'] = select(960)
        result['restored640'] = select(640)
        result['stageDelta640To960'] = {
            key: result['mode960']['stage'][key] - result['mode640']['stage'][key]
            for key in ('width', 'height', 'x', 'y')}
        result['stageDelta640ToRestored640'] = {
            key: result['restored640']['stage'][key] - result['mode640']['stage'][key]
            for key in ('width', 'height', 'x', 'y')}
        result['sameStage'] = all(abs(delta) <= 0.5 for values in
            (result['stageDelta640To960'], result['stageDelta640ToRestored640'])
            for delta in values.values())
        result['correctCanvasDimensions'] = all(
            [result[name]['canvas']['width'], result[name]['canvas']['height']] == dimensions
            for name, dimensions in [('mode640', [640, 360]), ('mode960', [960, 540]),
                                     ('restored640', [640, 360])])
        result['canvasScaleReportMatchesMeasured'] = all(
            abs(result[name]['canvasPixelScale']['deviceX']
                - result[name]['canvasPixelScale']['stageReportedCanvasPixelScale']) <= 0.001
            and abs(result[name]['canvasPixelScale']['deviceY']
                - result[name]['canvasPixelScale']['stageReportedCanvasPixelScale']) <= 0.001
            for name in ('mode640', 'mode960', 'restored640'))
        result['passed'] = result['sameStage'] and result['correctCanvasDimensions'] \
            and result['canvasScaleReportMatchesMeasured'] \
            and all(result[name]['selected'] == 'true' for name in ('mode640', 'mode960', 'restored640'))
        return result

    def context_ui(page):
        return page.evaluate("""() => {const b=document.querySelector('[data-action=interact]');
          return {visible:!b.hidden,label:b.textContent,kind:b.dataset.context,target:b.dataset.target,
            pressureVisible:!document.querySelector('.wake-guard-state').hidden}}""")

    def navigate(context, page, url=None):
        # Installed before first navigation. No production site is visited by this script.
        context.route('**/api/visits*', lambda route: route.abort())
        page.on('pageerror', lambda error: report['pageErrors'].append(str(error)))
        page.on('response', lambda response: report['audioResources'].append(
            {'url': response.url, 'status': response.status}) if '/assets/audio/' in response.url else None)
        page.goto(url or args.url, wait_until='networkidle')
        page.wait_for_function('window.render_game_to_text && window.advanceTime && document.querySelector("canvas")')

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        report['browserVersion'] = browser.version
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        context.add_init_script(AUDIO_PROBE)
        page = context.new_page()
        navigate(context, page)
        initial = state(page)
        record('defaultChineseAndEncounterStart', initial['locale'] == 'zh'
               and page.locator('.wake-shell').get_attribute('lang') == 'zh-CN'
               and '遭遇' in page.locator('[data-command=primary]').inner_text(),
               {'locale': initial['locale'], 'start': page.locator('[data-command=primary]').inner_text()})
        page.locator('[data-command=language]').click()
        page.reload(wait_until='networkidle')
        page.wait_for_function('window.render_game_to_text')
        record('languagePersists', state(page)['locale'] == 'en', {'locale': state(page)['locale']})
        page.locator('[data-command=language]').click()
        page.locator('[data-command=primary]').click()
        advance(page, 2)

        page.locator('[data-command=settings]').click()
        paused = state(page)
        advance(page, 35)
        frozen = state(page)
        settings_layout = layout(page)
        effects_button = page.locator('[data-command=effects]')
        effects = {'available': effects_button.is_visible()}
        if effects['available']:
            effects['before'] = effects_button.get_attribute('aria-pressed')
            effects_button.click()
            effects['after'] = effects_button.get_attribute('aria-pressed')
            effects['changed'] = effects['before'] != effects['after']
        display = compare_display_modes(page)
        record('desktopDisplayResolutionKeepsStage', display['passed'], display)
        screenshot(page, 'settings-desktop.png')
        page.locator('[data-command=close-settings]').click()
        closed = state(page)
        advance(page, 10)
        still_paused = state(page)
        page.locator('[data-command=primary]').click()
        advance(page, 3)
        resumed = state(page)
        record('settingsPauseAndExplicitResume', paused['mode'] == 'paused'
               and frozen['tick'] == paused['tick'] and closed['mode'] == 'paused'
               and still_paused['tick'] == closed['tick'] and resumed['mode'] == 'playing'
               and resumed['tick'] == closed['tick'] + 3,
               {'pausedTick': paused['tick'], 'frozenTick': frozen['tick'], 'closedMode': closed['mode'],
                'continuedTick': resumed['tick']})
        record('settingsControlsAndHitAreas', effects.get('changed', not effects['available'])
               and layout_passes(settings_layout), {'effects': effects, 'display': display, 'layout': settings_layout})

        # A real attack gesture must reach the audio system after Begin's user gesture.
        page.keyboard.press('KeyJ')
        advance(page, 1)
        page.wait_for_timeout(750)
        media = page.evaluate('window.__cwMediaProbe')
        playing = [m for m in media if m['promise'] == 'resolved' and m['playing'] and m['maxTime'] > 0]
        record('gestureUnlockedAudioPlayback', bool(playing), {'calls': media, 'playingCount': len(playing)})
        page.locator('.wake-tools [data-command=mute]').click()
        calls_before = len(page.evaluate('window.__cwMediaProbe'))
        advance(page, 45)
        page.keyboard.press('KeyJ')
        advance(page, 1)
        page.wait_for_timeout(150)
        record('muteStopsNewPlayback', calls_before == len(page.evaluate('window.__cwMediaProbe')),
               {'before': calls_before, 'after': len(page.evaluate('window.__cwMediaProbe'))})

        page.locator('[data-command=restart]').click()
        restarted = state(page)
        record('restartReturnsPlayableScene', restarted['mode'] == 'playing' and restarted['tick'] == 0
               and restarted['hero']['hp'] == restarted['hero']['maxHp'],
               {'mode': restarted['mode'], 'tick': restarted['tick'], 'hp': restarted['hero']['hp']})
        context_state = context_ui(page)
        kind = restarted.get('contextAction', {}).get('kind', 'none')
        record('contextLabelMatchesCurrentAction', context_state['kind'] == kind
               and context_state['visible'] == (kind != 'none'), {'modelKind': kind, 'ui': context_state})
        record('pressureHiddenAtZero', not context_state['pressureVisible'], context_state)
        desktop_layout = layout(page)
        record('desktopViewportAndTargets', layout_passes(desktop_layout), desktop_layout)
        screenshot(page, 'controls-desktop.png')
        page.set_viewport_size({'width': 500, 'height': 300})
        page.wait_for_timeout(120)
        small_layout = layout(page)
        small_stage = small_layout['stage']
        small_scale = small_layout['canvasPixelScale']
        small_ratio = small_stage['width'] / small_stage['height']
        record('smallDesktopViewportKeepsAspect',
               abs(small_ratio - 16 / 9) <= 0.001
               and small_stage['x'] >= -0.5 and small_stage['y'] >= -0.5
               and small_stage['x'] + small_stage['width'] <= 500.5
               and small_stage['y'] + small_stage['height'] <= 300.5
               and abs(small_scale['deviceX'] - small_scale['deviceY']) <= 0.001
               and abs(small_scale['deviceX'] - small_scale['stageReportedCanvasPixelScale']) <= 0.001
               and [small_layout['canvas']['width'], small_layout['canvas']['height']] == [640, 360]
               and small_layout['overflowX'] <= 0 and small_layout['overflowY'] <= 0,
               {'layout': small_layout, 'stageAspectRatio': small_ratio,
                'fractionalScaleAllowedWhenBelowOneDevicePixelMultiple': True})
        screenshot(page, 'controls-desktop-small.png')
        page.set_viewport_size({'width': 1280, 'height': 720})
        context.close()

        mobile_context = browser.new_context(viewport={'width': 844, 'height': 390},
                                             device_scale_factor=3, is_mobile=True, has_touch=True)
        mobile = mobile_context.new_page()
        navigate(mobile_context, mobile)
        mobile.locator('[data-command=primary]').tap()
        cdp = mobile_context.new_cdp_session(mobile)

        mobile.locator('[data-command=settings]').tap()
        mobile_display = compare_display_modes(mobile, touch=True)
        record('mobileLandscapeDisplayResolutionKeepsStage', mobile_display['passed'], mobile_display)
        screenshot(mobile, 'settings-phone-landscape.png')
        mobile.locator('[data-command=close-settings]').tap()
        mobile.locator('[data-command=primary]').tap()

        def point(action, identifier, dx=0):
            box = mobile.locator(f'[data-action={action}]').bounding_box()
            return {'id': identifier, 'x': box['x'] + box['width'] / 2 + dx,
                    'y': box['y'] + box['height'] / 2, 'radiusX': 5, 'radiusY': 5, 'force': 1}

        def touch(kind, points):
            cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': points})

        before = state(mobile)
        right, jump = point('right', 1), point('jump', 2)
        touch('touchStart', [right]); advance(mobile, 6)
        touch('touchStart', [right, jump]); advance(mobile, 1)
        jumped = state(mobile)
        touch('touchEnd', [jump]); advance(mobile, 6)
        moving = state(mobile)
        held = mobile.locator('[data-action=right]').evaluate("b=>b.classList.contains('is-held')")
        touch('touchEnd', []); advance(mobile, 2)
        released = state(mobile)
        record('genuineMultiTouchMoveAndJump', jumped['hero']['y'] < before['hero']['y']
               and moving['hero']['x'] > jumped['hero']['x'] and held
               and released['hero']['vx'] == 0 and mobile.locator('.is-held').count() == 0,
               {'before': [before['hero']['x'], before['hero']['y']],
                'jumped': [jumped['hero']['x'], jumped['hero']['y']],
                'continuedX': moving['hero']['x'], 'heldAfterJumpRelease': held, 'releasedVx': released['hero']['vx']})
        mobile.locator('[data-command=restart]').tap()
        a, b = point('right', 3, -8), point('right', 4, 8)
        touch('touchStart', [a, b]); advance(mobile, 2)
        both = state(mobile)
        touch('touchEnd', [a]); advance(mobile, 3)
        one = state(mobile)
        one_held = mobile.locator('[data-action=right]').evaluate("b=>b.classList.contains('is-held')")
        touch('touchCancel', []); advance(mobile, 2)
        canceled = state(mobile)
        record('sameActionReferenceCountAndCancel', one['hero']['x'] > both['hero']['x'] and one_held
               and canceled['hero']['vx'] == 0 and mobile.locator('.is-held').count() == 0,
               {'oneHeld': one_held, 'canceledVx': canceled['hero']['vx']})

        mobile_layout = layout(mobile)
        cue = mobile.locator('.wake-cue').inner_text()
        record('mobileViewportReadableControls', layout_passes(mobile_layout)
               and mobile_layout['stage']['width'] / 844 >= 0.70
               and 'K' not in cue and '+ J' not in cue,
               {'layout': mobile_layout, 'cue': cue, 'worldWidthShare': mobile_layout['stage']['width'] / 844})
        screenshot(mobile, 'controls-phone-landscape.png')

        touch('touchStart', [point('right', 5)]); advance(mobile, 2)
        mobile.set_viewport_size({'width': 390, 'height': 844})
        mobile.wait_for_timeout(120)
        portrait = state(mobile)
        advance(mobile, 20)
        portrait_frozen = state(mobile)
        portrait_layout = layout(mobile)
        screenshot(mobile, 'controls-phone-portrait.png')
        mobile.set_viewport_size({'width': 844, 'height': 390})
        mobile.wait_for_timeout(120)
        returned = state(mobile)
        advance(mobile, 10)
        returned_frozen = state(mobile)
        touch('touchEnd', [])
        mobile.locator('[data-command=primary]').tap()
        advance(mobile, 3)
        final = state(mobile)
        record('rotationPauseExplicitContinueAndInputClear', portrait['mode'] == 'paused'
               and portrait['tick'] == portrait_frozen['tick'] and returned['mode'] == 'paused'
               and returned['tick'] == returned_frozen['tick'] and final['mode'] == 'playing'
               and final['hero']['vx'] == 0 and portrait_layout['overflowX'] <= 0 and portrait_layout['overflowY'] <= 0,
               {'portraitTick': portrait['tick'], 'portraitFrozenTick': portrait_frozen['tick'],
                'returnedMode': returned['mode'], 'resumedVx': final['hero']['vx'], 'portraitLayout': portrait_layout})
        mobile_context.close()

        # These pointer-focus regressions use a fresh, normal-RAF page. Actual
        # key events must resume gameplay after toolbar clicks; no time hook or
        # actor/model writes are used for either assertion.
        toolbar_url = parsed._replace(query=urlencode([
            (key, value) for key, value in parse_qsl(parsed.query, keep_blank_values=True)
            if key != 'manual'])).geturl()
        toolbar_context = browser.new_context(viewport={'width': 1280, 'height': 720})
        toolbar_page = toolbar_context.new_page()
        navigate(toolbar_context, toolbar_page, toolbar_url)
        toolbar_page.locator('[data-command=primary]').click()
        for command in ('language', 'mute'):
            toolbar_page.locator('[data-command=restart]').click()
            button = toolbar_page.locator(f'.wake-tools [data-command={command}]')
            button.click()
            before = state(toolbar_page)
            value_before = before['locale'] if command == 'language' else button.get_attribute('aria-pressed')
            active = toolbar_page.evaluate('''() => ({tag:document.activeElement?.tagName,
              command:document.activeElement?.dataset?.command ?? null})''')
            toolbar_page.keyboard.down('d')
            toolbar_page.wait_for_timeout(280)
            toolbar_page.keyboard.up('d')
            moved = state(toolbar_page)
            toolbar_page.keyboard.press('Space', delay=80)
            toolbar_page.wait_for_timeout(100)
            jumped = state(toolbar_page)
            value_after = jumped['locale'] if command == 'language' else button.get_attribute('aria-pressed')
            record(f'toolbar{command.title()}PointerReturnsGameplayKeyboard',
                   active['command'] != command
                   and moved['hero']['x'] > before['hero']['x'] + 10
                   and jumped['hero']['y'] < moved['hero']['y'] - 4
                   and value_after == value_before,
                   {'url': toolbar_url, 'clock': 'normal RAF; no advanceTime',
                    'activeAfterPointerClick': active,
                    'before': [before['hero']['x'], before['hero']['y']],
                    'afterD': [moved['hero']['x'], moved['hero']['y']],
                    'afterSpace': [jumped['hero']['x'], jumped['hero']['y']],
                    'settingAfterClick': value_before, 'settingAfterSpace': value_after})
        screenshot(toolbar_page, 'toolbar-pointer-keyboard.png')
        toolbar_context.close()
        browser.close()

    report['passed'] = all(item['passed'] for item in report['checks'].values()) and not report['pageErrors']
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'passed': report['passed'], 'checks': len(report['checks']),
                      'failures': [name for name, item in report['checks'].items() if not item['passed']],
                      'pageErrors': report['pageErrors'], 'output': str(output)}, ensure_ascii=False), flush=True)
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
