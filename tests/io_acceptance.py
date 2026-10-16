"""Real Chromium IO acceptance. Run against the development server on 4392.

PNG fixtures use Python stdlib/Pillow, independent of SpriteLab's codec. Downloads
are checked by Pillow and zipfile; browser storage is real IndexedDB. No API mocks.
"""
from pathlib import Path
from datetime import datetime, timezone
from io import BytesIO
import base64
import json
import os
import struct
import zlib
import zipfile
from PIL import Image
from playwright.sync_api import sync_playwright, expect

ROOT = Path(os.environ.get("SPRITELAB_TEST_OUTPUT", str(Path(__file__).resolve().parent.parent / ".qa" / "io-acceptance"))).resolve()
ROOT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get("SPRITELAB_TEST_URL", "http://127.0.0.1:4392").rstrip("/")
checks = []
errors = []


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)


def packed(pixels):
    return [int.from_bytes(bytes(p), "big") if p[3] else 0 for p in pixels]


def chunk(kind, data):
    body = kind.encode("ascii") + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))


def paeth(a, b, c):
    p = a + b - c
    ds = [abs(p - a), abs(p - b), abs(p - c)]
    return [a, b, c][ds.index(min(ds))]


def raw_rgba_png(width, height, pixels, interlace=0):
    steps = [(0, 0, 8, 8), (4, 0, 8, 8), (0, 4, 4, 8), (2, 0, 4, 4),
             (0, 2, 2, 4), (1, 0, 2, 2), (0, 1, 1, 2)] if interlace else [(0, 0, 1, 1)]
    raw = bytearray()
    for sx, sy, dx, dy in steps:
        xs, ys = list(range(sx, width, dx)), list(range(sy, height, dy))
        if not xs or not ys:
            continue
        prev = bytes(len(xs) * 4)
        for j, y in enumerate(ys):
            row = bytes(v for x in xs for v in pixels[y * width + x])
            filter_type = j % 5
            raw.append(filter_type)
            for i, value in enumerate(row):
                left, above, corner = row[i-4] if i >= 4 else 0, prev[i], prev[i-4] if i >= 4 else 0
                predictor = [0, left, above, (left + above) // 2, paeth(left, above, corner)][filter_type]
                raw.append((value - predictor) & 255)
            prev = row
    return b"\x89PNG\r\n\x1a\n" + chunk("IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, interlace)) + chunk("IDAT", zlib.compress(raw)) + chunk("IEND", b"")


fixtures = []
samples = [(17, 85, 153, 1), (31, 63, 255, 2), (12, 34, 56, 17), (203, 91, 7, 127)]
source = ROOT / "low-alpha.png"
source.write_bytes(raw_rgba_png(4, 1, samples))
fixtures.append(("low alpha exact", source.read_bytes(), samples))
for interlace in (0, 1):
    px = [(x*19 % 256, y*29 % 256, (x+y)*17 % 256, (x+y*9)%255+1) for y in range(9) for x in range(11)]
    data = raw_rgba_png(11, 9, px, interlace)
    check(f"independent Pillow reads {'Adam7' if interlace else 'all five filters'} fixture", list(Image.open(BytesIO(data)).convert("RGBA").get_flattened_data()) == px)
    fixtures.append(("Adam7" if interlace else "all five filters", data, px))
for mode, data, kwargs in [
    ("L", [0, 20, 127, 255], {"transparency": 20}),
    ("LA", [(3, 1), (85, 17), (127, 127), (255, 255)], {}),
    ("RGB", [(1, 2, 3), (3, 4, 5), (5, 6, 7), (8, 9, 10)], {"transparency": (3, 4, 5)}),
    ("1", [0, 255, 0, 255], {}),
]:
    im = Image.new(mode, (4, 1)); im.putdata(data)
    out = BytesIO(); im.save(out, format="PNG", **kwargs)
    payload = out.getvalue()
    fixtures.append((mode, payload, list(Image.open(BytesIO(payload)).convert("RGBA").get_flattened_data())))
for bits in (1, 2, 4, 8):
    im = Image.new("P", (4, 1)); im.putdata([0, 1, 0, 1])
    im.putpalette([17, 85, 153, 203, 91, 7] + [0] * 762)
    out = BytesIO(); im.save(out, format="PNG", bits=bits, transparency=bytes([1, 127]))
    payload = out.getvalue()
    fixtures.append((f"palette {bits}-bit transparency", payload, list(Image.open(BytesIO(payload)).convert("RGBA").get_flattened_data())))
# Hand-built 16-bit RGBA verifies the documented high-byte conversion.
rgba16 = [(0x1122, 0x5566, 0x99aa, 0x0102), (0xccdd, 0x5b6c, 0x0708, 0x7f80)]
raw16 = b"\0" + b"".join(struct.pack(">4H", *p) for p in rgba16)
payload = b"\x89PNG\r\n\x1a\n" + chunk("IHDR", struct.pack(">IIBBBBB", 2, 1, 16, 6, 0, 0, 0)) + chunk("IDAT", zlib.compress(raw16)) + chunk("IEND", b"")
fixtures.append(("16-bit RGBA high byte", payload, [tuple(v >> 8 for v in p) for p in rgba16]))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True,args=["--no-proxy-server"])
    context = browser.new_context(accept_downloads=True, viewport={"width": 1440, "height": 1000})
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("**/__io-check", lambda route: route.fulfill(body="<!doctype html><title>IO acceptance</title>", content_type="text/html"))
    page.goto(BASE + "/__io-check")
    page.evaluate("async () => { window.io = await import('./io.js'); window.core = await import('./core.js'); }")
    for name, data, expected in fixtures:
        actual = page.evaluate("async b64 => { const bytes=Uint8Array.from(atob(b64), c=>c.charCodeAt(0)); return (await io.loadPNG(new Blob([bytes]))).pixels; }", base64.b64encode(data).decode())
        check("browser import " + name, actual == packed(expected))
    result = page.evaluate("""async () => {
      const p=core.createProject(2,1,'精度验收');
      p.layers.push({id:'top',name:'半透明',visible:true,opacity:0.5},{id:'hidden',name:'隐藏',visible:false,opacity:1});
      p.clips[0].frames=[{id:'a',duration:70,cells:[[0xff0000ff,0x11559901],[0x0000ff80,0],[0x00ff00ff,0x00ff00ff]]},{id:'b',duration:230,cells:[[0x1f3fff02,0x0c223811],[0,0],[0,0]]}];
      window.testProject=p;
      const composed=core.compositeFrame(p,p.clips[0].frames[0]);
      const c=io.frameCanvas(p,p.clips[0].frames[0]);
      const canvasPNG=await io.pngBlob(c);
      const bitmap=await createImageBitmap(canvasPNG);
      const canvasExact=(await io.loadPNG(canvasPNG)).pixels;
      c.getContext('2d').clearRect(0,0,2,1);
      const changed=(await io.loadPNG(await io.pngBlob(c))).pixels;
      const scaled=io.frameCanvas(p,p.clips[0].frames[0],2);
      const scaledExact=await io.loadPNG(await io.pngBlob(scaled));
      await io.clearLocal(); const empty=await io.loadLocal();
      await io.saveLocal(p); const modified=structuredClone(p);modified.name='重载验收';modified.clips[0].frames[0].duration=110;
      await io.saveLocal(modified);const previous=await io.loadLocal({previous:true});
      let invalidRejected=false;try{await io.saveLocal({...p,width:0})}catch{invalidRejected=true}
      const current=await io.loadLocal();
      return {composed,canvasExact,canvasNative:[bitmap.width,bitmap.height],changed,scaledExact,empty,previous:previous.name,current:current.name,invalidRejected};
    }""")
    check("half opacity alpha-over and hidden layer", result["composed"] == [0xbf0040ff, 0x11559901])
    check("canvas PNG exact low-alpha and browser decodes it", result["canvasExact"] == result["composed"] and result["canvasNative"] == [2, 1])
    check("pngBlob honors subsequent Canvas mutation", result["changed"] == [0, 0])
    check("canvas scale is exact nearest neighbor", result["scaledExact"]["pixels"] == [0xbf0040ff]*2+[0x11559901]*2+[0xbf0040ff]*2+[0x11559901]*2)
    check("IndexedDB current previous invalid replacement", result["empty"] is None and result["previous"] == "精度验收" and result["current"] == "重载验收" and result["invalidRejected"])
    page.reload();page.evaluate("async () => { window.io = await import('./io.js'); }")
    restored=page.evaluate("async()=>await io.loadLocal()")
    check("IndexedDB survives navigation and reload", restored["name"] == "重载验收" and restored["clips"][0]["frames"][0]["duration"] == 110)
    page.evaluate("async()=>await io.clearLocal()")
    context.close()

    # All remaining interactions use the actual application controls.
    ui = browser.new_context(accept_downloads=True, viewport={"width":1440,"height":1000}, reduced_motion="reduce")
    page = ui.new_page(); page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("dialog",lambda dialog: dialog.accept())
    page.goto(BASE, wait_until="networkidle")
    expect(page.locator("#project-name")).not_to_have_value("正在打开作品…")
    page.locator("#file-input").set_input_files(source)
    expect(page.locator("#import-dialog")).to_be_visible()
    page.locator("#import-width").fill("2")
    page.locator("#import-height").fill("1")
    page.locator("#import-duration").fill("70")
    page.locator("#confirm-import").click()
    expect(page.locator("#confirm-dialog")).to_be_visible()
    page.locator("#confirm-yes").click()
    expect(page.locator("#project-name")).to_have_value("low-alpha")
    page.locator("#frame-strip button").nth(1).click()
    page.locator("#frame-duration").fill("230")
    page.locator("#frame-duration").press("Tab")
    expect(page.locator("#save-status")).to_contain_text("已保存到本机",timeout=5000)

    def download_button(selector, filename):
        with page.expect_download() as event:
            page.locator(selector).click()
        download = event.value
        check("download completed " + filename, download.failure() is None)
        destination = ROOT / filename
        download.save_as(destination)
        return destination

    project_path = download_button("#save-project", "ui-project.spritelab.json")
    project = json.loads(project_path.read_text(encoding="utf-8"))
    check("UI PNG grid import preserves original low alpha exactly", [f["cells"][0] for f in project["clips"][0]["frames"]] == [packed(samples[:2]),packed(samples[2:])])
    check("UI duration edits retained in project", [f["duration"] for f in project["clips"][0]["frames"]] == [70,230])
    page.locator("#export-button").click()
    page.locator("#export-columns").select_option("4")
    page.locator("#export-scale").select_option("2")
    sheet_path = download_button("#export-sheet", "ui-sheet.png")
    meta_path = download_button("#export-metadata", "ui-timing.json")
    zip_path = download_button("#export-frames", "ui-frames.zip")
    frame_path = download_button("#export-frame", "ui-frame.png")
    sheet=Image.open(sheet_path).convert("RGBA")
    row=[samples[0],samples[0],samples[1],samples[1],samples[2],samples[2],samples[3],samples[3]]+[(0,0,0,0)]*8
    check("downloaded sheet exact RGBA nearest-neighbor and transparent padding", sheet.size == (16,2) and list(sheet.get_flattened_data()) == row*2)
    metadata=json.loads(meta_path.read_text(encoding="utf-8"))
    check("downloaded metadata exact duration and scaled rectangles", [f["duration"] for f in metadata["frames"]] == [70,230] and metadata["totalDuration"] == 300 and [f["rect"] for f in metadata["frames"]] == [{"x":0,"y":0,"width":4,"height":2},{"x":4,"y":0,"width":4,"height":2}])
    with zipfile.ZipFile(zip_path) as archive:
        check("ZIP contains only actual frames plus timing", archive.namelist() == ["frame-001.png","frame-002.png","timing.json"])
        check("ZIP PNG pixels independently decoded by Pillow", [list(Image.open(BytesIO(archive.read(f"frame-{i+1:03}.png"))).convert("RGBA").get_flattened_data()) for i in range(2)] == [samples[:2],samples[2:]])
        timing=json.loads(archive.read("timing.json"))
        check("ZIP exact per-frame durations", [f["duration"] for f in timing["frames"]] == [70,230] and timing["totalDuration"] == 300)
    check("current-frame download exact RGBA",list(Image.open(frame_path).convert("RGBA").get_flattened_data()) == samples[2:])
    page.locator("#export-dialog .dialog-header button").click()
    page.reload(wait_until="networkidle")
    expect(page.locator("#project-name")).to_have_value("low-alpha")
    page.locator("#frame-strip button").nth(1).click()
    expect(page.locator("#frame-duration")).to_have_value("230")
    check("UI reload restores imported project and timing",True)

    # Invalid import is rejected before the replacement dialog or current state changes.
    invalid=ROOT/"invalid-project.json"; invalid.write_text('{"format":"spritelab","version":1,"width":0}',encoding="utf-8")
    page.locator("#file-input").set_input_files(invalid)
    expect(page.locator("#toast")).to_be_visible()
    expect(page.locator("#confirm-dialog")).not_to_be_visible()
    expect(page.locator("#project-name")).to_have_value("low-alpha")
    check("UI invalid project rejected before replacement",True)
    # A real project input reaches confirmation and can be cancelled without mutation.
    page.locator("#file-input").set_input_files(project_path)
    expect(page.locator("#confirm-dialog")).to_be_visible()
    page.locator("#confirm-cancel").click()
    expect(page.locator("#project-name")).to_have_value("low-alpha")
    check("valid project import cancellation retains current work",True)
    page.locator("#file-input").set_input_files(project_path)
    page.locator("#confirm-yes").click()
    expect(page.locator("#project-name")).to_have_value("low-alpha")
    imported_path=download_button("#save-project","ui-reimport.spritelab.json")
    check("project download reimport download is exact",json.loads(imported_path.read_text(encoding="utf-8")) == project)
    page.screenshot(path=str(ROOT/"ui-acceptance.png"),full_page=True)
    check("no uncaught browser page errors",not errors)
    ui.close();browser.close()

report={"time":datetime.now(timezone.utc).isoformat(),"baseURL":BASE,"browser":"Chromium via Python Playwright","checks":checks,"count":len(checks),"errors":errors,"independentDecoders":["Pillow 12.2.0","Python zipfile"],"sourceLimitations":["16-bit PNG samples reduce to their high eight bits","PNG color-profile chunks do not alter stored samples","Fully transparent samples normalize to packed integer 0"]}
(ROOT/"results.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({"passed":len(checks),"errors":errors,"evidence":str(ROOT/"results.json")},ensure_ascii=False))
