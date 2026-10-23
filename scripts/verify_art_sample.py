"""Local browser evidence. No production analytics requests are made."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".qa/art-review"
OUT.mkdir(parents=True, exist_ok=True)

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
        records = []
        for name, width, height, dpr, touch in [("desktop", 1920, 1080, 1, False), ("phone-landscape", 844, 390, 3, True)]:
            context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=dpr, is_mobile=touch, has_touch=touch)
            # Required protection before ANY potential production navigation.
            context.route("**/api/visits*", lambda route: route.abort())
            page = context.new_page()
            page.set_default_timeout(10000)
            errors, failed = [], []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("response", lambda r: failed.append({"url": r.url, "status": r.status}) if r.status >= 400 else None)
            page.goto("http://127.0.0.1:5176/?manual=1", wait_until="networkidle")
            page.wait_for_function("Boolean(window.__cw)")
            page.screenshot(path=str(OUT / f"{name}-title.png"))
            page.locator('[data-command="primary"]').click()
            page.evaluate("window.advanceTime(0)")
            page.screenshot(path=str(OUT / f"{name}-gameplay.png"))
            records.append({"name": name, "emulated": True, "viewport": [width,height], "dpr": dpr,
                "errors": errors, "http_errors": failed, "layout": page.evaluate("""() => ({
                  noScroll:document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight,
                  canvas: document.querySelector('canvas').getBoundingClientRect().toJSON(),
                  state: JSON.parse(window.render_game_to_text())
                })""")})
            context.close()
        browser.close()
        (OUT / "browser-baseline.json").write_text(json.dumps(records, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
        print(json.dumps([{k: v for k,v in r.items() if k != 'layout'} | {"noScroll":r['layout']['noScroll']} for r in records], ensure_ascii=False))

if __name__ == '__main__': verify()
