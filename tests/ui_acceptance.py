"""Real Chromium UI acceptance. No app-state hooks or synthetic DOM events.

Run: python tests/ui_acceptance.py [--url http://127.0.0.1:4392/] [--output .qa]
Without --url, requests use an immutable local snapshot to avoid relying on
localhost networking. With --url, Chromium reads the actual running server.
Edits use pointer/keyboard/touch input; assertions read the files downloaded
through the public UI. Requires Playwright and Pillow.
"""
from pathlib import Path
from urllib.parse import unquote, urlparse
from datetime import datetime, timezone
import hashlib
import argparse
import io
import json
import mimetypes
import traceback
import zipfile
from PIL import Image
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa'
DOWNLOADS = OUT / 'ui-downloads'
SOURCE = {p.relative_to(ROOT / 'src').as_posix(): p.read_bytes()
          for p in (ROOT / 'src').rglob('*') if p.is_file()}
RESULTS = []
BASE_URL = None
PINK = 0xF42F6FFF
BLUE = 0x00AAFFFF


def serve(route):
    key = unquote(urlparse(route.request.url).path).lstrip('/') or 'index.html'
    if key not in SOURCE:
        return route.fulfill(status=404, body='')
    kind = 'text/javascript' if key.endswith('.js') else mimetypes.guess_type(key)[0] or 'application/octet-stream'
    route.fulfill(status=200, content_type=kind, body=SOURCE[key])


class UI:
    def __init__(self, browser, width, touch=False):
        self.width, self.touch, self.download_count = width, touch, 0
        self.context = browser.new_context(viewport={'width': width, 'height': 900 if not touch else 844},
                                           device_scale_factor=1, has_touch=touch, is_mobile=touch,
                                           reduced_motion='reduce', accept_downloads=True)
        self.page = self.context.new_page()
        self.page.set_default_timeout(6000)
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('dialog', lambda dialog: dialog.accept())
        if BASE_URL is None:
            self.page.route('**/*', serve)
        self.page.goto(BASE_URL or 'http://localhost:4393/')
        self.page.wait_for_load_state('networkidle')
        expect(self.page.locator('.frame-tile')).to_have_count(4)
        self.cdp = self.context.new_cdp_session(self.page) if touch else None

    def click(self, selector):
        item = self.page.locator(selector)
        item.tap() if self.touch else item.click()

    def field(self, selector, value):
        item = self.page.locator(selector)
        item.fill(str(value))
        item.press('Tab')

    def blank(self, size=16):
        self.click('#new-button')
        self.page.locator('#new-size').select_option(str(size))
        self.click('#new-blank')
        self.click('#confirm-yes')
        expect(self.page.locator('#confirm-dialog')).not_to_be_visible()
        expect(self.page.locator('.frame-tile')).to_have_count(1)
        self.click('[data-tool="pencil"]')
        self.field('#color-hex', '#f42f6f')

    def point(self, x, y, size=16):
        canvas = self.page.locator('#pixel-canvas')
        canvas.scroll_into_view_if_needed()
        rect = canvas.bounding_box()
        return {'x': rect['x'] + (x + .5) * rect['width'] / size,
                'y': rect['y'] + (y + .5) * rect['height'] / size}

    def draw(self, start, end=None, size=16):
        a = self.point(*start, size)
        b = self.point(*(end or start), size)
        if self.touch:
            def send(kind, point=None):
                points = [] if point is None else [{**point, 'id': 1, 'radiusX': 1, 'radiusY': 1, 'force': 1}]
                self.cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': points})
            send('touchStart', a)
            if end is not None:
                for step in range(1, 5):
                    self.page.wait_for_timeout(35)
                    send('touchMove', {key: a[key] + (b[key] - a[key]) * step / 4 for key in ['x', 'y']})
            self.page.wait_for_timeout(35)
            send('touchEnd')
            # Give Chromium's native gesture recognizer a real finger-lift gap.
            self.page.wait_for_timeout(100)
        else:
            self.page.mouse.move(**a)
            self.page.mouse.down()
            if end is not None:
                self.page.mouse.move(**b, steps=1)
            self.page.mouse.up()

    def download(self, selector):
        self.download_count += 1
        with self.page.expect_download() as event:
            self.click(selector)
        download = event.value
        assert download.failure() is None
        target = DOWNLOADS / f'{self.width}-{self.download_count:02d}-{download.suggested_filename}'
        download.save_as(target)
        return target

    def project(self):
        return json.loads(self.download('#save-project').read_text(encoding='utf-8'))

    def export(self, button):
        self.click('#export-button')
        target = self.download(button)
        self.click('[aria-label="关闭导出窗口"]')
        return target

    def case(self, name, steps, fn):
        result = {'viewport': self.width, 'name': name, 'steps': steps}
        try:
            evidence = fn()
            result.update(status='PASS', evidence=evidence)
        except Exception as error:
            result.update(status='FAIL', error=str(error), traceback=traceback.format_exc())
            self.page.screenshot(path=str(OUT / f'ui-{self.width}-failure-{len(RESULTS)+1}.png'), full_page=True)
        RESULTS.append(result)
        print(f"{result['status']} {self.width}: {name}" + (f" :: {result['error']}" if result['status'] == 'FAIL' else ''), flush=True)
        return result['status'] == 'PASS'

    def close(self):
        RESULTS.append({'viewport': self.width, 'name': 'No uncaught browser script errors',
                        'status': 'PASS' if not self.errors else 'FAIL', 'evidence': self.errors})
        self.context.close()


def cells(project, clip=0, frame=0, layer=0):
    return project['clips'][clip]['frames'][frame]['cells'][layer]


def layout(ui):
    data = ui.page.evaluate('''() => ({width:innerWidth,documentWidth:document.documentElement.scrollWidth,
      canvas:(()=>{const r=document.querySelector('#pixel-canvas').getBoundingClientRect();return {width:r.width,height:r.height}})(),
      stage:(()=>{const r=document.querySelector('#stage-canvas').getBoundingClientRect();return {width:r.width,height:r.height}})(),
      clipNamesFullyVisible:(()=>{const r=document.querySelector('#clip-tabs').getBoundingClientRect();return [...document.querySelectorAll('#clip-tabs button')].every(b=>{const x=b.getBoundingClientRect();return x.left>=r.left-.5 && x.right<=r.right+.5})})(),
      touchAction:getComputedStyle(document.querySelector('#pixel-canvas')).touchAction})''')
    assert data['documentWidth'] <= data['width'], data
    assert data['canvas']['width'] >= 128, data
    assert abs(data['stage']['width'] / data['stage']['height'] - 16 / 9) < .001
    assert data['touchAction'] == 'none'
    assert data['clipNamesFullyVisible'], 'Default action names must be fully visible, including at 320px'
    ui.page.screenshot(path=str(OUT / f'ui-{ui.width}-initial.png'), full_page=True)
    return data


def drawing_undo(ui):
    ui.blank()
    ui.draw((2, 2), (8, 2))
    drawn = ui.project()
    assert cells(drawn)[34:41] == [PINK] * 7
    assert sum(bool(v) for v in cells(drawn)) == 7
    ui.click('#undo')
    assert not any(cells(ui.project()))
    ui.click('#redo')
    assert cells(ui.project()) == cells(drawn)
    return {'interpolatedPixels': 7, 'undoBlank': True, 'redoExact': True, 'input': 'native touch' if ui.touch else 'mouse'}


def duplicate_independence(ui):
    ui.blank()
    ui.draw((2, 2), (8, 2))
    ui.click('#duplicate-frame')
    ui.click('[data-tool="eraser"]')
    ui.draw((4, 2))
    project = ui.project()
    assert len(project['clips'][0]['frames']) == 2
    assert cells(project)[36] == PINK and cells(project, frame=1)[36] == 0
    assert sum(bool(v) for v in cells(project)) == 7
    assert sum(bool(v) for v in cells(project, frame=1)) == 6
    return {'firstFramePainted': 7, 'secondFramePainted': 6}


def selected_move(ui):
    ui.blank()
    ui.draw((2, 2), (8, 2))
    ui.draw((12, 12))
    ui.click('[data-tool="select"]')
    ui.draw((2, 2), (8, 2))
    ui.click('[data-tool="move"]')
    ui.draw((2, 2), (2, 5))
    project = ui.project()
    assert cells(project)[34:41] == [0] * 7
    assert cells(project)[82:89] == [PINK] * 7
    assert cells(project)[204] == PINK
    ui.click('#undo')
    restored = ui.project()
    assert cells(restored)[34:41] == [PINK] * 7 and cells(restored)[82:89] == [0] * 7
    ui.click('#redo')
    assert cells(ui.project()) == cells(project)
    return {'selectedPixelsMoved': 7, 'outsidePixelPreserved': True, 'undoRedoExact': True}


def layers(ui):
    ui.blank()
    ui.draw((3, 5))
    ui.click('#add-layer')
    ui.field('#layer-name', '高光')
    ui.field('#color-hex', '#00aaff')
    ui.draw((3, 5))
    project = ui.project()
    assert len(project['layers']) == 2
    assert cells(project)[83] == PINK and cells(project, layer=1)[83] == BLUE
    assert Image.open(ui.export('#export-frame')).convert('RGBA').getpixel((3, 5)) == (0, 170, 255, 255)
    ui.click('[aria-label="隐藏图层 高光"]')
    assert Image.open(ui.export('#export-frame')).convert('RGBA').getpixel((3, 5)) == (244, 47, 111, 255)
    before = ui.project()
    ui.draw((5, 5))
    assert cells(ui.project(), layer=1) == cells(before, layer=1), 'hidden layer must reject drawing'
    ui.click('[aria-label="显示图层 高光"]')
    ui.click('#layer-down')
    reordered = ui.project()
    assert reordered['layers'][0]['name'] == '高光'
    assert cells(reordered)[83] == BLUE and cells(reordered, layer=1)[83] == PINK
    ui.click('#layer-up')
    slider = ui.page.locator('#layer-opacity')
    slider.focus(); slider.press('Home')
    for _ in range(50): slider.press('ArrowRight')
    assert ui.project()['layers'][1]['opacity'] == .5
    pixel = Image.open(ui.export('#export-frame')).convert('RGBA').getpixel((3, 5))
    assert all(abs(a - b) <= 1 for a, b in zip(pixel, (122, 109, 183, 255))), pixel
    ui.click('#delete-layer')
    assert len(ui.project()['layers']) == 1
    return {'visibilityReflectedInPNG': True, 'orderKeepsLayerPixels': True, 'opacity50Pixel': pixel}


def clips_frames(ui):
    ui.blank()
    ui.draw((2, 2))
    ui.click('#duplicate-frame')
    ui.field('#frame-duration', 260)
    ui.click('.frame-tile[data-frame="0"]')
    ui.field('#frame-duration', 120)
    original = ui.project()
    ui.click('#frame-right')
    moved = ui.project()
    assert [f['duration'] for f in moved['clips'][0]['frames']] == [260, 120]
    ui.click('#frame-left')
    assert ui.project()['clips'][0]['frames'] == original['clips'][0]['frames']
    ui.click('#add-clip')
    ui.field('#clip-name', '跃起练习')
    ui.draw((7, 7))
    project = ui.project()
    assert len(project['clips']) == 2 and project['clips'][1]['name'] == '跃起练习'
    assert cells(project, clip=1)[119] == PINK
    assert cells(project)[34] == PINK and cells(project)[119] == 0
    ui.click('#delete-clip')
    assert len(ui.project()['clips']) == 1
    ui.click('#add-frame')
    blank = ui.project()
    assert len(blank['clips'][0]['frames']) == 3 and not any(cells(blank, frame=1))
    ui.click('#delete-frame')
    assert len(ui.project()['clips'][0]['frames']) == 2
    return {'frameOrder': [120, 260], 'namedClipIndependent': True, 'blankAndDeleteFrame': True}


def exports_imports(ui):
    ui.blank()
    ui.draw((2, 2), (8, 2))
    ui.field('#frame-duration', 120)
    ui.click('#duplicate-frame')
    ui.field('#frame-duration', 260)
    ui.click('[data-tool="eraser"]'); ui.draw((4, 2))
    ui.click('#export-button')
    ui.page.locator('#export-columns').select_option('2')
    ui.page.locator('#export-scale').select_option('2')
    sheet = ui.download('#export-sheet')
    metadata_file = ui.download('#export-metadata')
    archive = ui.download('#export-frames')
    single = ui.download('#export-frame')
    source = ui.download('#export-project')
    ui.click('[aria-label="关闭导出窗口"]')
    metadata = json.loads(metadata_file.read_text(encoding='utf-8'))
    assert metadata['width'] == 64 and metadata['height'] == 32
    assert [f['duration'] for f in metadata['frames']] == [120, 260]
    assert metadata['totalDuration'] == 380
    assert metadata['frames'][1]['rect'] == {'x': 32, 'y': 0, 'width': 32, 'height': 32}
    image = Image.open(sheet).convert('RGBA')
    assert image.size == (64, 32)
    assert image.getpixel((4, 4)) == (244, 47, 111, 255)
    assert image.getpixel((40, 4)) == (0, 0, 0, 0)
    one = Image.open(single).convert('RGBA')
    assert one.size == (16, 16) and one.getpixel((4, 2))[3] == 0
    with zipfile.ZipFile(archive) as z:
        assert set(z.namelist()) == {'frame-001.png', 'frame-002.png', 'timing.json'}
        assert [f['duration'] for f in json.loads(z.read('timing.json'))['frames']] == [120, 260]
        assert Image.open(io.BytesIO(z.read('frame-001.png'))).size == (16, 16)
    original = json.loads(source.read_text(encoding='utf-8'))
    ui.blank()
    with ui.page.expect_file_chooser() as choice: ui.click('#import-button')
    choice.value.set_files(source)
    ui.click('#confirm-yes')
    assert ui.project() == original
    with ui.page.expect_file_chooser() as choice: ui.click('#import-button')
    choice.value.set_files(sheet)
    expect(ui.page.locator('#import-dialog')).to_be_visible()
    ui.field('#import-width', 32); ui.field('#import-height', 32)
    ui.click('#confirm-import'); ui.click('#confirm-yes')
    imported = ui.project()
    assert imported['width'] == imported['height'] == 32
    assert len(imported['clips'][0]['frames']) == 2
    assert cells(imported)[4 * 32 + 4] == PINK
    assert cells(imported, frame=1)[4 * 32 + 8] == 0
    return {'allFiveExportButtons': True, 'sheet': [64, 32], 'durations': [120, 260], 'projectRoundTrip': True, 'PNGGridImport': True}


def other_tools(ui):
    ui.blank()
    ui.click('[data-tool="rect"]'); ui.draw((2, 2), (6, 6))
    ui.click('[data-tool="fill"]'); ui.draw((4, 4))
    project = ui.project()
    assert sum(bool(v) for v in cells(project)) == 25
    ui.field('#color-hex', '#00aaff')
    ui.click('[data-tool="line"]'); ui.draw((9, 2), (12, 5))
    project = ui.project()
    assert all(cells(project)[y * 16 + x] == BLUE for x, y in [(9, 2), (10, 3), (11, 4), (12, 5)])
    ui.click('[data-tool="picker"]'); ui.draw((3, 3))
    assert ui.page.locator('#color-hex').input_value() == '#f42f6f'
    ui.click('[data-tool="pencil"]'); ui.click('#mirror-button'); ui.draw((2, 10))
    project = ui.project()
    assert cells(project)[162] == PINK and cells(project)[173] == PINK
    ui.click('#mirror-button')
    ui.click('#flip-x')
    flipped = ui.project()
    for y in range(16):
        assert cells(flipped)[y * 16:(y + 1) * 16] == list(reversed(cells(project)[y * 16:(y + 1) * 16]))
    ui.click('#resize-button'); ui.field('#resize-width', 32); ui.field('#resize-height', 32); ui.click('#confirm-resize')
    resized = ui.project()
    assert resized['width'] == resized['height'] == 32
    assert sum(bool(v) for v in cells(resized)) == sum(bool(v) for v in cells(flipped))
    ui.click('#undo')
    assert ui.project() == flipped
    return {'rectangleFillPixels': 25, 'linePixels': 4, 'pickerExact': True, 'mirror': True, 'flip': True, 'resizeUndoExact': True}


def mobile_controls(ui):
    ui.blank()
    ui.draw((2, 2), (8, 2))
    ui.click('#duplicate-frame')
    ui.click('#add-layer')
    ui.field('#layer-name', '触屏层')
    ui.draw((10, 10))
    ui.click('#add-clip')
    ui.field('#clip-name', '触屏动作')
    ui.draw((3, 3))
    project = ui.project()
    assert len(project['layers']) == 2 and len(project['clips']) == 2
    assert cells(project, clip=1, layer=1)[51] == PINK
    ui.click('#clip-tabs button:nth-child(1)')
    expect(ui.page.locator('.frame-tile')).to_have_count(2)
    ui.click('#clip-tabs button:nth-child(2)')
    expect(ui.page.locator('.frame-tile')).to_have_count(1)
    png = ui.export('#export-frame')
    assert Image.open(png).convert('RGBA').getpixel((3, 3)) == (244, 47, 111, 255)
    ui.page.screenshot(path=str(OUT / f'ui-{ui.width}-edited.png'), full_page=True)
    return {'touchLayerClipExport': True, 'switchExistingActions': True}


def main():
    global BASE_URL, OUT, DOWNLOADS
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', help='Use an actual running server instead of local-source route fulfillment.')
    parser.add_argument('--output', default='.qa', help='Output directory relative to the project root, or an absolute path.')
    options = parser.parse_args()
    BASE_URL = options.url
    OUT = (ROOT / options.output).resolve()
    DOWNLOADS = OUT / 'ui-downloads'
    OUT.mkdir(parents=True, exist_ok=True)
    DOWNLOADS.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-proxy-server'])
        for width in [1440, 390, 320]:
            ui = UI(browser, width, touch=width != 1440)
            ui.case('Responsive editor and stage', 'Open a fresh editor at this viewport; inspect page width and take full screenshot.', lambda: layout(ui))
            ui.case('Draw, undo and redo', 'New 16px blank; draw (2,2)→(8,2); save; undo/save; redo/save.', lambda: drawing_undo(ui))
            ui.case('Copied frames remain independent', 'Draw 7 pixels; copy frame; erase (4,2) on copy; export editable project.', lambda: duplicate_independence(ui))
            ui.case('Move selection preserves outside pixels', 'Draw line plus outside pixel; select line; move down 3px; undo/redo.', lambda: selected_move(ui))
            if width == 1440:
                ui.case('Layer visibility, reorder and opacity', 'Add blue top layer; hide/show; try drawing hidden layer; reorder; set 50%; export PNG; delete layer.', lambda: layers(ui))
                ui.case('Actions and frame controls', 'Set unequal timings; reorder frames; create/rename/draw/delete action; add/delete blank frame.', lambda: clips_frames(ui))
                ui.case('All exports and both import paths', 'Export PNG sheet, timing JSON, frame ZIP, current PNG, source; import source; import PNG using 32px grid.', lambda: exports_imports(ui))
                ui.case('Shapes, fill, picker, mirror, flip, resize', 'Draw rectangle/fill/line; pick color; draw mirrored pixel; flip; resize all frames; undo resize.', lambda: other_tools(ui))
            else:
                ui.case('Touch layer/action/export controls', 'Tap copy, add layer, rename, draw; add action, rename, draw; export actual current PNG.', lambda: mobile_controls(ui))
            ui.close()
        browser.close()
    report = {'timeUTC': datetime.now(timezone.utc).isoformat(),
              'method': f'Chromium; {BASE_URL or "immutable local-source route fixture"}; real mouse/keyboard and CDP touch input; UI download assertions; no internal app state hooks.',
              'sourceHashScope': 'Local staging source snapshot. Production response hashes are independently verified outside this UI test.',
              'sourceSHA256': {key: hashlib.sha256(value).hexdigest() for key, value in SOURCE.items() if key.endswith(('.js', '.css', '.html'))},
              'results': RESULTS}
    (OUT / 'ui-acceptance.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    lines = ['# SpriteLab 浏览器 UI 验收', '', report['method'], '', '| Viewport | Case | Result |', '|---|---|---|']
    lines += [f"| {r['viewport']} | {r['name']} | {r['status']} |" for r in RESULTS]
    for result in RESULTS:
        if result['status'] == 'FAIL':
            lines += ['', f"## {result['viewport']}: {result['name']}", '', result.get('steps', ''), '', '```', result.get('error', str(result.get('evidence'))), '```']
    (OUT / 'ui-acceptance.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    passed = sum(r['status'] == 'PASS' for r in RESULTS)
    print(f'{passed}/{len(RESULTS)} cases passed. Report: {OUT / "ui-acceptance.md"}', flush=True)
    return 0 if passed == len(RESULTS) else 1


if __name__ == '__main__':
    raise SystemExit(main())
