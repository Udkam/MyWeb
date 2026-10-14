"""Real browser UI storage regression checks; isolated contexts, no combat cheats.
Run against the task's local HTTP server. Storage fixtures and fault injection are
test setup; gameplay state is never injected. Writes evidence to .qa/storage/.
"""
import json
import pathlib
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa' / 'storage'
OUT.mkdir(parents=True, exist_ok=True)
URL = 'http://127.0.0.1:4328/src/?test=1'
KEY = 'cinder-below-v1'
results, errors = [], []


def check(name, condition, detail=None):
    results.append({'name': name, 'passed': bool(condition), 'detail': detail})


def fixture(revision=2, rooms=3, runs=2):
    return {'version': 1, 'revision': revision,
            'stats': {'runs': runs, 'wins': 0, 'kills': 9, 'rooms': rooms, 'embers': 12, 'bestRoom': 3},
            'settings': {'music': False, 'sfx': False, 'reduceMotion': False},
            'checkpoint': None, 'banked': {'kills': 0, 'rooms': 0, 'embers': 0}, 'unlocks': ['cinder']}


def observe(page):
    return page.evaluate('JSON.parse(window.render_game_to_text())')


def raw(page):
    return page.evaluate('(key) => localStorage.getItem(key)', KEY)


def load(context, name):
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append({'case': name, 'error': str(error)}))
    page.goto(URL, wait_until='networkidle')
    page.wait_for_function('window.render_game_to_text && JSON.parse(window.render_game_to_text()).ui.ready')
    # Keep the existing English diagnostic assertions; localization has its own suite.
    if observe(page)['ui']['language'] != 'en':
        page.locator('#language-toggle').click()
    return page


def seed(context, value):
    context.add_init_script('if (!sessionStorage.getItem("storage-fixture")) { localStorage.setItem(' + json.dumps(KEY) + ', ' + json.dumps(value) + '); sessionStorage.setItem("storage-fixture", "1"); }')


def settings(page):
    if not page.locator('#menu').evaluate('(element) => element.open'):
        page.keyboard.press('Escape')
    page.wait_for_selector('#export-save')


def case_basic(browser):
    context = browser.new_context(accept_downloads=True)
    page = load(context, 'basic')
    page.locator('#play').click()
    page.wait_for_function('(key) => JSON.parse(localStorage.getItem(key) || "null")?.checkpoint?.room === 1', arg=KEY)
    first = json.loads(raw(page))
    check('new descent saves a real room entrance and banks one run', first['stats']['runs'] == 1 and first['checkpoint']['room'] == 1)
    page.reload(wait_until='networkidle')
    page.wait_for_selector('#resume-run:not([hidden])')
    page.locator('#resume-run').click()
    page.wait_for_timeout(150)
    check('continue resumes room without incrementing run count', observe(page)['room'] == 1 and observe(page)['ui']['lifetime']['runs'] == 1)
    settings(page)
    with page.expect_download() as download_info:
        page.locator('#export-save').click()
    download = download_info.value
    download.save_as(str(OUT / 'roundtrip-save.json'))
    exported = json.loads((OUT / 'roundtrip-save.json').read_text(encoding='utf-8'))
    check('real export download contains checkpoint and banked counters', exported['checkpoint']['room'] == 1 and exported['banked'] == {'kills': 0, 'rooms': 0, 'embers': 0})
    page.screenshot(path=str(OUT / 'basic-settings.png'))
    context.close()


def case_corrupt_import(browser):
    context = browser.new_context()
    seed(context, '{broken')
    page = load(context, 'corrupt-import')
    page.locator('#play').click()
    page.wait_for_timeout(150)
    check('corrupt raw survives ordinary play save attempt', raw(page) == '{broken')
    settings(page)
    page.locator('#import-file').set_input_files({'name': 'backup.json', 'mimeType': 'application/json', 'buffer': json.dumps(fixture()).encode('utf-8')})
    page.wait_for_selector('#confirm-import')
    check('import confirmation precedes replacement', raw(page) == '{broken')
    page.locator('#confirm-import').click()
    page.wait_for_function('JSON.parse(window.render_game_to_text()).ui.mode === "title"')
    saved = json.loads(raw(page))
    check('confirmed valid backup recovers corrupt save', saved['stats']['rooms'] == 3 and saved['revision'] >= 3)
    check('successful corrupt recovery reports persistent saved status', observe(page)['ui']['storageStatus'] == 'saved')
    context.close()


def case_no_locks(browser):
    context = browser.new_context()
    value = json.dumps(fixture())
    seed(context, value)
    context.add_init_script('Object.defineProperty(navigator, "locks", {configurable: true, value: undefined})')
    page = load(context, 'no-locks')
    page.locator('#play').click()
    page.wait_for_timeout(180)
    check('without Web Locks shared save remains read-only', raw(page) == value)
    check('without Web Locks in-memory play still increments current run', observe(page)['ui']['lifetime']['runs'] == 3)
    settings(page)
    check('without Web Locks settings disclose memory-only mode', any(word in page.locator('#menu-body').inner_text().lower() for word in ['memory', 'locking', 'lock support']))
    page.screenshot(path=str(OUT / 'no-locks.png'))
    context.close()


def case_reload_bad_remote(browser):
    context = browser.new_context()
    a = load(context, 'reload-bad-remote')
    a.locator('#play').click()
    a.wait_for_timeout(150)
    b = load(context, 'reload-bad-remote-peer')
    b.locator('#audio-toggle').click()
    a.wait_for_selector('#reload-save')
    before = observe(a)['ui']['lifetime'].copy()
    b.evaluate('(key) => localStorage.setItem(key, "{broken-after-conflict")', KEY)
    a.locator('#reload-save').click()
    a.wait_for_timeout(100)
    check('manual reload refuses corrupt remote instead of adopting blank default', observe(a)['ui']['lifetime'] == before)
    check('manual reload failure preserves recovery controls', a.locator('#reload-save').count() == 1)
    a.screenshot(path=str(OUT / 'reload-corrupt.png'))
    context.close()


def case_failed_save_remote(browser):
    context = browser.new_context()
    page = load(context, 'failed-save-remote')
    page.evaluate('([key, value]) => localStorage.setItem(key, value)', [KEY, json.dumps(fixture())])
    page.reload(wait_until='networkidle')
    page.wait_for_function('JSON.parse(window.render_game_to_text()).ui.ready')
    page.evaluate('() => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === "cinder-below-v1") throw new DOMException("quota", "QuotaExceededError"); return window.originalSetItem.call(this, key, value); }; }')
    page.locator('#play').click()
    settings(page)
    page.locator('#abandon').click()
    page.wait_for_timeout(100)
    before = observe(page)['ui']['lifetime'].copy()
    peer = load(context, 'failed-save-peer')
    peer.evaluate('([key, value]) => localStorage.setItem(key, value)', [KEY, json.dumps(fixture(revision=20, rooms=9, runs=7))])
    page.wait_for_timeout(180)
    check('remote storage event preserves unsaved local progress', observe(page)['ui']['lifetime'] == before)
    check('remote event while save failed requires explicit recovery', page.locator('#reload-save').count() == 1)
    page.screenshot(path=str(OUT / 'failed-save-remote.png'))
    context.close()


def case_remote_delete(browser):
    context = browser.new_context()
    a = load(context, 'remote-delete')
    a.locator('#play').click()
    a.wait_for_timeout(120)
    b = load(context, 'remote-delete-peer')
    b.evaluate('(key) => localStorage.removeItem(key)', KEY)
    a.wait_for_timeout(180)
    check('remote deletion pauses active descent and preserves local record', observe(a)['ui']['paused'] and observe(a)['ui']['lifetime']['runs'] == 1)
    check('remote deletion exposes explicit conflict recovery', a.locator('#reload-save').count() == 1)
    context.close()


def case_banked_resume(browser):
    context = browser.new_context(accept_downloads=True)
    data = fixture()
    data['checkpoint'] = json.loads((OUT / 'roundtrip-save.json').read_text(encoding='utf-8'))['checkpoint']
    data['banked'] = {field: data['stats'][field] for field in ['kills', 'rooms', 'embers']}
    seed(context, json.dumps(data))
    page = load(context, 'banked-resume')
    page.locator('#resume-run').click()
    page.wait_for_timeout(120)
    saved = json.loads(raw(page))
    check('UI continue retains banked credit above older entrance stats', saved['banked'] == data['banked'] and saved['stats'] == data['stats'])
    settings(page)
    page.locator('#abandon').click()
    page.locator('#play').click()
    page.wait_for_timeout(120)
    saved = json.loads(raw(page))
    check('a new descent resets only its banked ledger and adds one run', saved['banked'] == {'kills': 0, 'rooms': 0, 'embers': 0} and saved['stats']['runs'] == data['stats']['runs'] + 1 and saved['stats']['kills'] == data['stats']['kills'])
    context.close()


def case_lock_rejection(browser):
    context = browser.new_context()
    seed(context, json.dumps(fixture()))
    context.add_init_script('Object.defineProperty(navigator, "locks", {configurable: true, value: {request: () => Promise.reject(new DOMException("locked out", "SecurityError"))}})')
    page = load(context, 'lock-rejection')
    before = raw(page)
    page.locator('#play').click()
    page.wait_for_timeout(150)
    check('a rejected lock leaves shared save untouched', raw(page) == before)
    check('a rejected lock surfaces memory-only status', observe(page)['ui']['storageStatus'] == 'unavailable')
    settings(page)
    local = observe(page)['ui']['lifetime'].copy()
    page.locator('#import-file').set_input_files({'name': 'backup.json', 'mimeType': 'application/json', 'buffer': json.dumps(fixture(rooms=8)).encode('utf-8')})
    page.wait_for_selector('#confirm-import')
    page.locator('#confirm-import').click()
    page.wait_for_timeout(100)
    check('rejected import lock preserves both current memory and shared save', raw(page) == before and observe(page)['ui']['lifetime'] == local)
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    for case in [case_basic, case_corrupt_import, case_no_locks, case_reload_bad_remote, case_failed_save_remote, case_remote_delete, case_banked_resume, case_lock_rejection]:
        try:
            case(browser)
        except Exception as error:
            results.append({'name': case.__name__, 'passed': False, 'error': str(error)})
    browser.close()
report = {'at': datetime.now(timezone.utc).isoformat(), 'url': URL, 'method': 'Real Playwright browser and UI interactions; storage fixtures/fault injection only', 'results': results, 'page_errors': errors}
(OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': sum(row['passed'] for row in results), 'total': len(results), 'page_errors': errors, 'failed': [row for row in results if not row['passed']], 'report': str(OUT / 'report.json')}, ensure_ascii=False))
raise SystemExit(0 if all(row['passed'] for row in results) and not errors else 1)
