"""Capture actual browser frames driven only by keyboard input.

Simulation is deterministic 60Hz; capture 30fps at native viewport dimensions.
The resulting movie is silent. No coordinates/health/outcomes are injected.
"""
import argparse
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".qa/art-review"
KEYS = {"jumpPressed": "Space", "attackPressed": "KeyJ", "guardHeld": "KeyK", "dodgePressed": "ShiftLeft", "interactPressed": "KeyE"}

def run(name):
    death = name == "death-restart"
    data = json.loads((OUT / ("death-inputs.json" if death else "sample-inputs.json")).read_text(encoding="utf-8"))
    phone = name == "phone-landscape"
    width, height, dpr = (844, 390, 3) if phone else (1920,1080,1)
    frames = OUT / f"{name}-frames"
    frames.mkdir(parents=True, exist_ok=True)
    events, errors, failures = [], [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
        context = browser.new_context(viewport={"width":width,"height":height}, device_scale_factor=dpr, is_mobile=phone, has_touch=phone)
        context.route("**/api/visits*", lambda r:r.abort())
        page = context.new_page(); page.set_default_timeout(10000)
        page.on("pageerror", lambda e:errors.append(str(e)))
        page.on("response", lambda r:failures.append({"url":r.url,"status":r.status}) if r.status>=400 else None)
        page.goto("http://127.0.0.1:5176/?manual=1", wait_until="networkidle")
        page.locator('[data-command="primary"]').click()
        down = set(); last_id = -1
        for tick, action in enumerate(data["inputs"]):
            if action.get("command") == "restart":
                for key in down: page.keyboard.up(key)
                down=set(); last_id=-1
                page.locator('[data-command="restart"]').click()
            wanted = {v for k,v in KEYS.items() if action.get(k)}
            if action.get("move",0)>0: wanted.add("KeyD")
            if action.get("move",0)<0: wanted.add("KeyA")
            for key in down-wanted: page.keyboard.up(key)
            for key in wanted-down: page.keyboard.down(key)
            down = wanted
            result = page.evaluate("""() => {window.advanceTime(1000/60); return JSON.parse(window.render_game_to_text());}""")
            for event in result["log"]:
                if event["id"] > last_id: events.append(event); last_id=event["id"]
            if tick%2 == 1:
                page.screenshot(path=str(frames / f"frame-{tick//2:04d}.png"), scale="css")
            if tick in (124,192,268,277,490,503):
                page.screenshot(path=str(OUT / f"{name}-tick-{tick+1}.png"), scale="css")
            if tick%240 == 239: print(f"{name}: captured tick {tick+1}/{len(data['inputs'])}",flush=True)
        for key in down: page.keyboard.up(key)
        final = json.loads(page.evaluate("window.render_game_to_text()"))
        audio = page.evaluate("""() => performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/audio/')).map(r=>({url:r.name,bytes:r.transferSize}))""")
        page.screenshot(path=str(OUT / f"{name}-final.png"), scale="css")
        context.close(); browser.close()
    required = {"death","restart","cannonFire","hurt"} if death else {"block","hurt","parry","shove","cannonFire","cannonHit"}
    actual = {e["type"] for e in events}
    report = {"viewport":[width,height],"dpr":dpr,"emulation":phone,"duration_seconds":len(data['inputs'])/60,"recording":"real browser frames; deterministic 60Hz keyboard input; 30fps capture; silent", "events":events,"required_events_found":sorted(required&actual),"missing_events":sorted(required-actual),"page_errors":errors,"http_errors":failures,"audio_resources":audio,"final":final}
    (OUT/f"{name}-recording.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    if errors or failures or required-actual: raise RuntimeError("Actual browser evidence failed; inspect report")
    movie=OUT/f"{name}-action-sample.mp4"
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-framerate","30","-i",str(frames/"frame-%04d.png"),"-c:v","libx264","-preset","fast","-crf","19","-pix_fmt","yuv420p","-movflags","+faststart",str(movie)],check=True)
    print(json.dumps({"movie":str(movie),"required_events_found":sorted(required&actual),"page_errors":errors,"http_errors":failures},ensure_ascii=False),flush=True)

if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("name",choices=["desktop","phone-landscape","death-restart"])
    run(parser.parse_args().name)
