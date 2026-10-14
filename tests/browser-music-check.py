"""Real browser/media checks. Module fixture; no claim of subjective listening."""
import json
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa/music-browser'
OUT.mkdir(parents=True, exist_ok=True)
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4328/src/?test=1'
report = {'url': URL, 'checks': [], 'errors': [], 'scope': 'Real Chromium audio module plus unmodified application start/pause/title/settings/credits navigation; no subjective listening claim.'}

def check(ok, name, detail=None):
    report['checks'].append({'passed': bool(ok), 'name': name, 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name, flush=True)
    if not ok:
        raise AssertionError(name)

def state(page):
    return page.evaluate('window.musicFixture.status()')

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.on('console', lambda e: report['errors'].append(e.text) if e.type == 'error' else None)
        # A blank same-origin page isolates module playback from the real app's
        # first-interaction audio. The application case below uses a fresh page.
        page.route(URL, lambda route: route.fulfill(status=200, content_type='text/html', body='<html><body></body></html>'))
        page.goto(URL)
        page.evaluate("""async () => {
          window.musicElements = []; window.musicConnections = []; window.musicWarnings = [];
          const NativeAudio = window.Audio;
          window.Audio = function (...args) { const media = new NativeAudio(...args); window.musicElements.push(media); return media; };
          const proto = AudioContext.prototype, original = proto.createMediaElementSource;
          proto.createMediaElementSource = function (media) {
            const source = original.call(this, media), connect = source.connect.bind(source);
            source.connect = function (destination) { window.musicConnections.push({media, gain:destination}); return connect(destination); };
            return source;
          };
          const {createAudio}=await import('./audio.js');
          window.musicFixture=createAudio(()=>window.musicWarnings.push('unavailable'));
          const button=document.createElement('button');button.id='music-fixture-unlock';button.textContent='Enable music fixture';
          Object.assign(button.style,{position:'fixed',left:'10px',top:'130px',zIndex:'1000'});
          button.onclick=async()=>{await musicFixture.configure({music:true,sfx:true});button.dataset.ready='true'};
          document.body.append(button);
        }""")
        page.locator('#music-fixture-unlock').click()
        page.wait_for_function("document.querySelector('#music-fixture-unlock').dataset.ready==='true'")
        check(state(page)['cue'] == 'whispers' and state(page)['musicPlaying'], 'title plays the existing atmospheric recording after a gesture', state(page))
        page.wait_for_timeout(1250)
        page.evaluate("musicFixture.setScene({biome:'hollow'})")
        page.wait_for_function("musicFixture.status().cue==='catacombs'")
        page.wait_for_timeout(300)
        overlap = page.evaluate("musicConnections.map(x=>({src:x.media.currentSrc,paused:x.media.paused,gain:x.gain.gain.value}))")
        check(sum(not x['paused'] and x['gain'] > .001 for x in overlap) == 2, 'two real players overlap with nonzero gains during crossfade', overlap)
        page.wait_for_timeout(1200)
        check(state(page)['activeMusicPlayers'] == 1, 'outgoing player stops after the fade')
        before = state(page)['position']
        page.evaluate("musicFixture.setScene({biome:'mire'})")
        page.wait_for_timeout(250)
        check(state(page)['track'] == 'mire' and state(page)['position'] > before, 'same-cue room change preserves playback position', state(page))
        before = state(page)['position']
        page.evaluate("musicFixture.configure({music:true,sfx:true})")
        page.wait_for_timeout(250)
        check(state(page)['position'] > before, 'settings and reward-style refreshes do not restart music')
        page.evaluate('musicFixture.suspend()')
        page.wait_for_timeout(150)
        frozen = state(page)
        page.wait_for_timeout(350)
        check(not state(page)['musicPlaying'] and state(page)['activeMusicPlayers'] == 0, 'pause stops every music player')
        check(abs(state(page)['position'] - frozen['position']) < .01, 'pause retains the exact playback position')
        page.evaluate('musicFixture.resume()')
        page.wait_for_timeout(450)
        check(state(page)['musicPlaying'] and state(page)['position'] > frozen['position'], 'resume continues the same recording')
        page.evaluate("musicFixture.setScene({biome:'cinder'})")
        page.wait_for_function("musicFixture.status().cue==='ancient'")
        page.wait_for_timeout(1250)
        check(state(page)['recording'] == 'Ancient Evil Awakens!', 'later acts use the darker sustained combat cue')
        before = state(page)['position']
        page.evaluate("musicFixture.setScene({biome:'storm'})")
        page.wait_for_timeout(250)
        check(state(page)['track'] == 'storm' and state(page)['position'] > before, 'storm shares the cue without restarting it')
        page.evaluate("musicFixture.setScene({boss:true})")
        page.wait_for_function("musicFixture.status().cue==='boss'")
        page.wait_for_timeout(1250)
        boss_gain = page.evaluate("musicConnections.find(x=>x.media.currentSrc.includes('epic-boss')&&!x.media.paused).gain.gain.value")
        check(abs(boss_gain - .246) < .001, 'boss uses its measured gain instead of the much louder original level', boss_gain)
        for cue, options in [('whispers', {'biome': 'void'}), ('whispers', {'biome': 'rift'})]:
            page.evaluate('(scene)=>musicFixture.setScene(scene)', options)
            page.wait_for_function('(cue)=>musicFixture.status().cue===cue', arg=cue)
            check(state(page)['desiredTrack'] == options['biome'], 'soundscape routes ' + options['biome'])
        page.evaluate("musicFixture.setScene({biome:'cinder'});musicFixture.setScene({boss:true});musicFixture.setScene({biome:'mire'})")
        page.wait_for_timeout(1700)
        check(state(page)['cue'] == 'catacombs' and state(page)['track'] == 'mire' and state(page)['activeMusicPlayers'] == 1, 'rapid transitions settle on the latest cue with one player', state(page))
        page.evaluate("musicFixture.setScene({boss:true});musicFixture.configure({music:false,sfx:false})")
        page.wait_for_timeout(1600)
        check(not state(page)['musicPlaying'] and state(page)['activeMusicPlayers'] == 0, 'mute cancels pending crossfades and late play promises', state(page))
        page.evaluate('musicFixture.configure({music:true,sfx:false})')
        page.wait_for_function('musicFixture.status().musicPlaying')
        page.wait_for_timeout(1400)
        check(state(page)['cue'] == 'boss', 'unmute resumes the requested scene')
        for cue in ['catacombs', 'ancient', 'whispers', 'boss']:
            scene = {'biome': {'catacombs':'hollow','ancient':'cinder','whispers':'rift'}.get(cue, 'hollow'), 'boss': cue == 'boss'}
            page.evaluate('(scene)=>musicFixture.setScene(scene)', scene)
            page.wait_for_function('(cue)=>musicFixture.status().cue===cue', arg=cue)
            page.wait_for_timeout(1250)
            loop = page.evaluate("""async () => {
              const media=musicElements.find(x=>!x.paused); await new Promise(resolve=>{if(media.readyState>=3)resolve();else media.addEventListener('canplay',resolve,{once:true})});
              const duration=media.duration;media.currentTime=duration-.22;return {duration,loop:media.loop};
            }""")
            page.wait_for_timeout(650)
            check(loop['loop'] and state(page)['position'] < 1.2 and state(page)['musicPlaying'], cue + ' crosses its loop boundary without stopping', {**loop, 'after':state(page)})
        page.evaluate("musicFixture.setScene({biome:'cinder'});musicFixture.suspend()")
        page.wait_for_timeout(1500)
        check(not state(page)['musicPlaying'] and state(page)['activeMusicPlayers'] == 0, 'suspending during a transition remains suspended')
        check(page.evaluate('musicElements.length') == 2, 'music playback is bounded to two media elements')
        check(page.evaluate('musicWarnings.length') == 0, 'no unavailable-media warning occurred')
        check(len(report['errors']) == 0, 'no browser console or page errors', report['errors'])
        page.screenshot(path=str(OUT/'music-fixture.png'))
        report['final'] = state(page)
        page.close()

        # Fresh app page: no injected Audio wrappers, fixture or game-state writes.
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.on('console', lambda e: report['errors'].append(e.text) if e.type == 'error' else None)
        page.goto(URL)
        page.wait_for_function('typeof window.render_game_to_text === "function" && JSON.parse(window.render_game_to_text()).ui.ready')
        page.locator('#play').click()
        page.wait_for_function("JSON.parse(window.render_game_to_text()).ui.audio.musicPlaying && JSON.parse(window.render_game_to_text()).ui.audio.cue==='catacombs'")
        check(page.evaluate("JSON.parse(window.render_game_to_text()).ui.mode") == 'playing', 'real application starts combat music through its normal play button')
        page.locator('#pause-button').click()
        page.wait_for_function('JSON.parse(window.render_game_to_text()).ui.paused && !JSON.parse(window.render_game_to_text()).ui.audio.musicPlaying')
        check(page.locator('#menu').is_visible(), 'real application pause suspends music')
        page.locator('#abandon').click()
        page.wait_for_function("JSON.parse(window.render_game_to_text()).ui.mode==='title' && JSON.parse(window.render_game_to_text()).ui.audio.musicPlaying && JSON.parse(window.render_game_to_text()).ui.audio.cue==='whispers'")
        check(True, 'returning from pause to title resumes the atmospheric title cue', page.evaluate('JSON.parse(window.render_game_to_text()).ui.audio'))

        page.locator('#pause-button').click()
        page.locator('#setting-music').uncheck()
        page.wait_for_function('!JSON.parse(window.render_game_to_text()).ui.audio.music')
        page.locator('#continue').click()
        page.locator('#play').click()
        page.wait_for_function("JSON.parse(window.render_game_to_text()).ui.mode==='playing'")
        check(not page.evaluate('JSON.parse(window.render_game_to_text()).ui.audio.musicPlaying'), 'disabled music remains silent when starting another run')
        page.locator('#pause-button').click()
        page.locator('#abandon').click()
        page.wait_for_function("JSON.parse(window.render_game_to_text()).ui.mode==='title'")
        page.wait_for_timeout(1600)
        silent = page.evaluate('JSON.parse(window.render_game_to_text()).ui.audio')
        check(not silent['music'] and not silent['musicPlaying'] and silent['activeMusicPlayers'] == 0 and silent['sfx'], 'pause to title keeps disabled music silent while preserving enabled sound effects', silent)

        page.locator('#credits-button').click()
        credits = page.locator('.credits-links li').all_text_contents()
        check(any('Juhani Junkala' in item and 'Ninja Adventure' not in item for item in credits), 'credits attribute the new music separately to Juhani Junkala', credits)
        check(any('Ninja Adventure' in item and 'Juhani Junkala' not in item for item in credits), 'credits retain a separate Ninja Adventure art and sound-effects attribution')
        page.screenshot(path=str(OUT/'application-credits.png'))
        check(len(report['errors']) == 0, 'real application navigation has no browser errors', report['errors'])
        report['application'] = {'audio': silent, 'credits': credits}
        browser.close()
finally:
    (OUT/'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(str(OUT/'report.json'), flush=True)
