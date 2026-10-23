"""Import reviewed generated layers into both candidate display grids.

Only crop, alpha cutoff and explicit nearest sampling; no invented painted assets.
Physics coordinates remain 640x360 in both displays. This is a sampling comparison,
not a claim that generated source art followed an exact pixel grid.
"""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'C:\Users\Alex Chen\.codex\generated_images\01a169ba-898d-7632-bacc-a4ebc8323c4d')
LOCAL = ROOT / '.local/assets/ship-v2'
OUT = ROOT / 'public/assets/ship-v2'
LOCAL.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
FILES = {
    'sea': 'exec-f83ed232-7e5f-4ab7-8329-815cafabe84a.png',
    'sea-quiet': 'exec-6c4f7c77-62cf-4a24-adb8-dbe5f2b1957f.png',
    'sail': 'exec-2e9dd640-b35c-4c77-b2e6-2da2d46c8526.png',
    'decks': 'exec-5400ea62-c128-4318-9b06-ae2ecfa67e68.png',
    'fittings': 'exec-a1b0e81e-f061-45b6-a53a-a38deac5b581.png',
    'far-ship': 'exec-b9ab366d-bba2-412f-baf6-4106dc1f1b82.png',
}
sources = {}
records = []
for name, file in FILES.items():
    target = LOCAL / f'{name}-source.png'
    if not target.exists():
        shutil.copyfile(SOURCE / file, target)
    sources[name] = Image.open(target).convert('RGBA')
    records.append({'name': name, 'file': target.name, 'source_size': sources[name].size,
                    'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})

# Coordinates checked against actual separated drawings, not prompt grid claims.
REGIONS = {
    'sea': ('sea-quiet', None, (640, 360)),
    'sail': ('sail', None, (600, 190)),
    'hull': ('decks', (0, 100, 1536, 360), (640, 84)),
    'platform': ('decks', (80, 390, 1450, 750), (112, 48)),
    'crate': ('fittings', (200, 680, 1080, 990), (48, 24)),
    'cannon': ('fittings', (0, 210, 1095, 670), (88, 34)),
    'mast': ('fittings', (1095, 0, 1536, 1024), (100, 255)),
    'far-ship': ('far-ship', None, (160, 110)),
}
assets = []
for name, (source, rect, dimensions) in REGIONS.items():
    crop = sources[source].copy() if rect is None else sources[source].crop(rect)
    box = None
    if name != 'sea':
        alpha = crop.getchannel('A').point(lambda value: 255 if value >= 128 else 0)
        box = alpha.getbbox()
        if not box:
            raise ValueError(f'Empty source silhouette: {name}')
        crop.putalpha(alpha)
        crop = crop.crop(box)
    for width, factor in [(640, 1), (960, 1.5)]:
        destination = OUT / str(width)
        destination.mkdir(exist_ok=True)
        size = tuple(round(value * factor) for value in dimensions)
        asset = crop.resize(size, Image.Resampling.NEAREST)
        path = destination / f'{name}.png'
        asset.save(path, optimize=True)
        assets.append({'name': name, 'source': source, 'source_region': rect, 'alpha_bbox': box,
                       'display': width, 'size': size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
report = {'date': '2026-10-24', 'tool': 'built-in imagegen', 'status': 'playtest work, user acceptance pending',
          'sources': records, 'assets': assets,
          'modifications': 'Reviewed isolated rectangles, alpha128 cutoff, nearest sampling directly from source into each display resolution. Structural props fitted to explicit collision dimensions; actor art is imported separately.',
          'limits': ['Generation did not obey a strict native pixel grid.', 'Both resolutions are source sampling comparisons, not upscale claims.', 'Concept reference is not used as a runtime layer.', 'Final visual and collision acceptance requires the actual scene.']}
(ROOT / 'docs/art/ship-v2-import.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
print(json.dumps({'sources': len(records), 'assets': len(assets), 'output': str(OUT)}))
