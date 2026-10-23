"""Import reviewed generated actor sources at independent 70px/105px body sampling.

No character drawing, silhouette repair, color quantization or old-sprite upscale.
Each source sheet is segmented into complete figures before variable-rect packing.
Run: python scripts/import_actor_v2.py
"""
from __future__ import annotations

import hashlib
import json
import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
GEN = Path("C:/Users/Alex Chen/.codex/generated_images/01a169bc-ab19-71d1-b822-26c70c3e548c")
SOURCES = ROOT / ".local/assets/actors-v2"
OUTPUT = ROOT / "public/assets/actors-v2"
REVIEW = ROOT / ".local/art/actor-v2"
ALPHA = 128
BODY_HEIGHT = 70

SHEETS = [
    {"name": "model-body-lock", "filename": "exec-bd8166ef-5e0f-409d-91e2-cd85c0abe7bf.png", "height": 587, "frames": [
        ("hero", "idle", (330, 708), 140, {"hand": (552, 375), "angle": -0.45}),
        ("sword", "idle", (1047, 709), 140, {"hand": (1255, 385), "angle": -0.45}),
        None,  # Baked model gun is excluded; runtime uses the weaponless service source.
    ]},
    {"name": "hero-dodge-body", "filename": "exec-0b42b5e7-771f-46a5-aa0d-1faefa0cb892.png", "height": 433, "frames": [
        ("hero", "dodge", (215, 611), 55, {"hand": (106, 448), "angle": 2.3}),
        ("hero", "dodge", (715, 614), 60, {"hand": (548, 414), "angle": 3.05}),
        ("hero", "dodge", (1152, 613), 60, {"hand": (1000, 451), "angle": 2.3}),
        ("hero", "dodge", (1517, 616), 90, {"hand": (1380, 411), "angle": 2.2}),
        ("hero", "dodge", (1907, 616), 100, {"hand": (1747, 410), "angle": 2.3}),
    ]},
    {"name": "hero-attack1-prep-body", "filename": "exec-cc550a24-b17e-415b-a80c-17438eee69f0.png", "height": 599, "frames": [
        ("hero", "attack1", (518, 677), 80, {"hand": (257, 338), "angle": 0.25}),
        ("hero", "attack1", (1652, 677), 100, {"hand": (1331, 319), "angle": 3.05}),
    ]},
    {"name": "hero-attack1-hit-body", "filename": "exec-a67370f9-a4b7-493d-9e62-3c5bae080aef.png", "height": 608, "frames": [
        ("hero", "attack1", (518, 674), 70, {"hand": (800, 292), "angle": 0}),
        ("hero", "attack1", (1585, 674), 160, {"hand": (1503, 363), "angle": 0.08}),
    ]},
    {"name": "hero-attack2-prep-body", "filename": "exec-bf34e209-9648-4318-a08e-fe8ce6db25b4.png", "height": 607, "frames": [
        ("hero", "attack2", (520, 692), 140, {"hand": (335, 124), "angle": -0.2}),
        ("hero", "attack2", (1570, 692), 80, {"hand": (1765, 395), "angle": 0.4}),
    ]},
    {"name": "hero-attack2-recover-body", "filename": "exec-d6da7b37-4ff6-4f97-8fdb-a24a452dfe04.png", "height": 615, "frames": [
        ("hero", "attack2", (535, 680), 80, {"hand": (861, 430), "angle": 0.65}),
        ("hero", "attack2", (1540, 680), 200, {"hand": (1425, 344), "angle": 0.1}),
    ]},
    {"name": "hero-guard-body", "filename": "exec-1637ad5e-fdf7-409e-839e-dd97ceeee3e3.png", "height": 517, "frames": [
        ("hero", "guard", (270, 655), 140, {"hand": (348, 307), "angle": -1.2}),
        ("hero", "parry", (800, 655), 55, {"hand": (1010, 270), "angle": -0.7}),
        ("hero", "parry", (1360, 655), 75, {"hand": (1600, 277), "angle": -0.35}),
        ("hero", "parry", (1920, 655), 120, {"hand": (1995, 309), "angle": -1.2}),
    ]},
    {"name": "hero-shove-body", "filename": "exec-e9a422af-f210-4958-bdbd-2e412fabc286.png", "height": 506, "frames": [
        ("hero", "shove", (276, 643), 100, {"hand": (133, 366), "angle": 2.3}),
        ("hero", "shove", (840, 643), 70, {"hand": (678, 383), "angle": 2.3}),
        ("hero", "shove", (1390, 642), 80, {"hand": (1230, 395), "angle": 2.3}),
        ("hero", "shove", (1980, 643), 160, {"hand": (1770, 382), "angle": 2.3}),
    ]},
]

# Newly generated whole-body strips, inspected before defining sockets. A common
# standing reference is applied across an entire strip, including kneeling/dead.
SHEETS += [
    {"name": "hero-run-body", "filename": "exec-a5a2c091-1e55-4ba1-8faa-000458a7eee7.png", "height": 560, "frames": [
        ("hero", "run", (350, 663), 100, {"hand": (160, 386), "angle": 2.25}),
        ("hero", "run", (850, 669), 100, {"hand": (700, 383), "angle": 2.25}),
        ("hero", "run", (1435, 666), 100, {"hand": (1250, 392), "angle": 2.25}),
        ("hero", "run", (1955, 670), 100, {"hand": (1770, 360), "angle": 2.25}),
    ]},
    {"name": "hero-jump-body", "filename": "exec-2917e3f8-5140-4e99-b62d-f40cfa764c5e.png", "height": 600, "frames": [
        ("hero", "jump", (310, 687), 80, {"hand": (146, 438), "angle": 2.25}),
        ("hero", "jump", (840, 574), 140, {"hand": (630, 286), "angle": 2.25}),
        ("hero", "jump", (1310, 620), 140, {"hand": (1128, 353), "angle": 2.25}),
        ("hero", "jump", (1920, 687), 90, {"hand": (1718, 470), "angle": 2.25}),
    ]},
    {"name": "hero-hurt-body", "filename": "exec-f35d4dc5-0107-469a-a9e9-ed894195b30a.png", "height": 592, "frames": [
        ("hero", "hurt", (650, 673), 160, {"hand": (425, 438), "angle": 2.2}),
        ("hero", "hurt", (1550, 674), 140, {"hand": (1320, 401), "angle": 2.2}),
    ]},
    {"name": "hero-dead-body", "filename": "exec-a7ed87b5-f154-4d5f-99e0-d37bbb9df783.png", "height": 590, "frames": [
        ("hero", "dead", (360, 646), 180, {"hand": (275, 437), "angle": .65}),
        ("hero", "dead", (1115, 652), 180, {"hand": (1055, 490), "angle": .5}),
        ("hero", "dead", (1810, 646), 300, {"hand": (1960, 620), "angle": 0}),
    ]},
    {"name": "hero-air-body", "filename": "exec-ef2869c1-92e7-4f95-bb81-8eb0f56dbe5c.png", "height": 680, "frames": [
        ("hero", "airAttack", (355, 556), 35, {"hand": (280, 105), "angle": -.2}),
        ("hero", "airAttack", (1130, 690), 120, {"hand": (1437, 217), "angle": 0}),
        ("hero", "airAttack", (1830, 690), 145, {"hand": (1725, 328), "angle": .2}),
    ]},
    {"name": "sword-run-body", "originalPath": ".local/assets/sword-v2-source/sword-run-body.png", "height": 540, "frames": [
        ("sword", "run", (350, 646), 100, {"hand": (536, 323), "angle": -.35}),
        ("sword", "run", (837, 646), 100, {"hand": (1031, 274), "angle": -.5}),
        ("sword", "run", (1435, 650), 100, {"hand": (1631, 299), "angle": -.35}),
        ("sword", "run", (1938, 646), 100, {"hand": (2110, 294), "angle": -.45}),
    ]},
    {"name": "sword-attack-body", "filename": "exec-ec2ce881-6ff6-4406-a11c-1341e038f3c3.png", "height": 488, "frames": [
        ("sword", "attack", (303, 630), 260, {"hand": (188, 358), "angle": .25}),
        ("sword", "attack", (842, 630), 260, {"hand": (706, 160), "angle": -.1}),
        ("sword", "attack", (1390, 630), 150, {"hand": (1650, 265), "angle": 0}),
        ("sword", "attack", (1940, 630), 650, {"hand": (1870, 310), "angle": -.3}),
    ]},
    {"name": "sword-brace-retreat-body", "filename": "exec-a679cf8c-cf89-4303-81a8-fef8b55fbf52.png", "height": 551, "frames": [
        ("sword", "brace", (278, 674), 80, {"hand": (290, 250), "angle": -1.2}),
        ("sword", "brace", (858, 676), 80, {"hand": (1000, 240), "angle": -.9}),
        ("sword", "retreat", (1425, 678), 75, {"hand": (1530, 240), "angle": -.9}),
        ("sword", "retreat", (1935, 678), 75, {"hand": (2080, 240), "angle": -.8}),
    ]},
    {"name": "sword-hurt-stagger-body", "filename": "exec-664a0468-4600-4979-9cca-f7ae17491a36.png", "height": 557, "frames": [
        ("sword", "hurt", (300, 672), 160, {"hand": (210, 381), "angle": 2.25}),
        ("sword", "hurt", (820, 669), 80, {"hand": (655, 397), "angle": 2.25}),
        ("sword", "stagger", (1390, 674), 200, {"hand": (1155, 394), "angle": 2.25}),
        ("sword", "stagger", (1940, 672), 240, {"hand": (1810, 402), "angle": 2.25}),
    ]},
    {"name": "sword-dead-body", "filename": "exec-60819cc6-202b-43f1-809a-8c27e4e990aa.png", "height": 550, "frames": [
        ("sword", "dead", (355, 611), 180, {"hand": (380, 395), "angle": .65}),
        ("sword", "dead", (1035, 616), 180, {"hand": (1090, 455), "angle": .5}),
        ("sword", "dead", (1780, 613), 300, {"hand": (1970, 583), "angle": 0}),
    ]},
    {"name": "musket-service-clean-body", "originalPath": ".local/assets/musket-v2-source/body-service-clean.png", "height": 390, "rows": 2, "frames": [
        ("musket", "aim", (211, 424), 1000, {"id": "musket", "hand": (245, 131), "support": (362, 120), "angle": 0}),
        ("musket", "fire", (694, 424), 120, {"id": "musket", "hand": (689, 135), "support": (791, 105), "angle": -.191986}),
        ("musket", "reload", (1119, 424), 260, {"id": "musket", "hand": (1220, 166), "angle": -math.pi/2}),
        ("musket", "reload", (1568, 424), 260, {"id": "musket", "hand": (1685, 165), "angle": -math.pi/2}),
        ("musket", "reload", (215, 868), 320, {"id": "musket", "hand": (303, 612), "angle": -math.pi/2}),
        ("musket", "reload", (672, 868), 320, {"id": "musket", "hand": (776, 615), "angle": -math.pi/2}),
        ("musket", "reload", (1089, 868), 280, {"id": "musket", "hand": (1143, 621), "support": (1196, 581), "angle": -.733038}),
        ("musket", "reload", (1546, 868), 260, {"id": "musket", "hand": (1570, 580), "support": (1680, 577), "angle": -.034907}),
    ]},
    {"name": "musket-hurt-death-body", "originalPath": ".local/assets/musket-v2-source/body-hurt-death.png", "height": 502, "frames": [
        ("musket", "hurt", (253, 628), 160, {"id": "musket", "hand": (241, 300), "support": (340, 330), "angle": .296706}),
        ("musket", "dead", (766, 623), 180, {"id": "musket", "hand": (773, 431), "support": (842, 476), "angle": .575959}),
        ("musket", "dead", (1280, 630), 180, {"id": "musket", "hand": (1280, 587), "angle": 0, "attachment": "released"}),
        ("musket", "dead", (1845, 623), 300, {"id": "musket", "hand": (1850, 580), "angle": 0, "attachment": "released"}),
    ]},
]

# Platform encounter aim/fire retain one fixed downward barrel axis. The prop's
# own barrel is +atan2(1,1280) from horizontal, so compensate its source tilt.
GUN_DOWN_ANGLE = math.radians(14) - math.atan2(1, 1280)
_service = next(s for s in SHEETS if s["name"] == "musket-service-clean-body")
_service["frames"][0] = None
_service["frames"][1] = None
SHEETS.insert(SHEETS.index(_service), {
    "name": "musket-down14-body", "originalPath": ".local/assets/musket-v2-source/down14-body.png", "height": 679, "frames": [
        ("musket", "aim", (451, 747), 1000, {"id": "musket", "hand": (520, 251), "support": (703, 295), "angle": GUN_DOWN_ANGLE}),
        ("musket", "fire", (1364, 748), 120, {"id": "musket", "hand": (1385, 277), "support": (1568, 321), "angle": GUN_DOWN_ANGLE}),
    ]})

# Source-order timings agree with phase clocks rather than an unrelated GIF loop.
TIMINGS = {"dodge": [60, 60, 60, 40, 40], "attack1": [50, 50, 80, 240], "attack2": [150, 55, 55, 300], "parry": [55, 65, 90], "shove": [120, 50, 50, 250]}
_indices = {}
for _sheet in SHEETS:
    for _i, _frame in enumerate(_sheet["frames"]):
        if _frame and _frame[0] == "hero" and _frame[1] in TIMINGS:
            _key = _frame[1]
            _n = _indices.get(_key, 0)
            _sheet["frames"][_i] = (*_frame[:3], TIMINGS[_key][_n], *_frame[4:])
            _indices[_key] = _n + 1
# The shove weapon remains down at the rear hand; contact is the opposite palm.
next(s for s in SHEETS if s["name"] == "hero-shove-body")["contacts"] = {1: (1120, 255), 2: (1650, 255)}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def figures(mask):
    parents, runs, previous = [], [], []
    def find(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i
    for y, row in enumerate(mask):
        edges = np.flatnonzero(np.diff(np.r_[False, row, False].astype(np.int8)))
        current = []
        for left, right in zip(edges[::2], edges[1::2]):
            i = len(parents)
            parents.append(i)
            runs.append((int(left), int(right), y))
            current.append(i)
            for j in previous:
                a, b, _ = runs[j]
                if a > right:
                    break
                if b >= left:
                    p, q = find(i), find(j)
                    if p != q:
                        parents[q] = p
        previous = current
    labels = np.zeros(mask.shape, dtype=np.int32)
    groups = {}
    for i, (left, right, y) in enumerate(runs):
        key = find(i) + 1
        labels[y, left:right] = key
        item = groups.setdefault(key, {"id": key, "pixels": 0, "bbox": [left, y, right, y + 1]})
        item["pixels"] += right - left
        b = item["bbox"]
        item["bbox"] = [min(left, b[0]), min(y, b[1]), max(right, b[2]), max(y + 1, b[3])]
    major = [g for g in groups.values() if g["pixels"] > 1000]
    minor = [g for g in groups.values() if g["pixels"] <= 1000]
    if minor and sum(g["pixels"] for g in minor) > 50:
        raise ValueError("Detached source pixels need review; no automatic reassignment")
    # Only order already complete figures. A source rect never clips at a grid.
    major.sort(key=lambda g: g["bbox"][0])
    return labels, major, minor


def load_sources():
    SOURCES.mkdir(parents=True, exist_ok=True)
    loaded, provenance = [], []
    for sheet in SHEETS:
        path = SOURCES / (sheet["name"] + ".png")
        original = ROOT / sheet["originalPath"] if "originalPath" in sheet else GEN / sheet["filename"]
        if not path.exists():
            shutil.copyfile(original, path)
        if original.exists() and sha(original) != sha(path):
            raise ValueError("Selected source differs from original generation")
        rgba = np.asarray(Image.open(path).convert("RGBA"))
        labels, groups, minor = figures(rgba[:, :, 3] >= ALPHA)
        if sheet.get("rows") == 2:
            groups.sort(key=lambda g: (g["bbox"][1] + g["bbox"][3]) / 2)
            middle = len(groups)//2
            groups = sorted(groups[:middle], key=lambda g: g["bbox"][0]) + sorted(groups[middle:], key=lambda g: g["bbox"][0])
        if len(groups) != len(sheet["frames"]):
            raise ValueError(f"{sheet['name']}: {len(groups)} whole figures, expected {len(sheet['frames'])}; reject overlap")
        if any(b == 0 for g in groups for b in g["bbox"][:2]) or any(g["bbox"][2] >= rgba.shape[1] or g["bbox"][3] >= rgba.shape[0] for g in groups):
            raise ValueError("Source touches edge; a complete body/weapon is not proven")
        for number, (group, frame) in enumerate(zip(groups, sheet["frames"])):
            if frame:
                loaded.append((sheet, number, rgba, labels, group, frame))
        provenance.append({"source": path.relative_to(ROOT).as_posix(), "generation_original_filename": original.name, "sha256": sha(path), "size_px": [rgba.shape[1], rgba.shape[0]], "whole_figure_count": len(groups), "selected_figure_count": sum(f is not None for f in sheet["frames"]), "minor_components": minor, "standing_body_reference_source_px": sheet["height"], "alpha_cutoff": ALPHA, "alpha_normalization": "Below cutoff becomes 0, retained source samples become 255; no RGB recoloring", "raw_retained_rgb_colors": len(np.unique(rgba[rgba[:, :, 3] >= ALPHA, :3], axis=0))})
    return loaded, provenance


def render_frame(item, density):
    sheet, number, rgba, labels, group, frame = item
    actor, action, source_anchor, duration, *extras = frame
    source = np.zeros_like(rgba)
    selected = labels == group["id"]
    source[selected, :3] = rgba[selected, :3]
    source[selected, 3] = 255
    pivot = (round(72*density), round(116*density))
    scale = sheet["height"] / (BODY_HEIGHT*density)
    transform = (scale, 0, source_anchor[0] - pivot[0]*scale, 0, scale, source_anchor[1] - pivot[1]*scale)
    image = Image.fromarray(source).transform((round(160*density), round(128*density)), Image.Transform.AFFINE, transform, Image.Resampling.NEAREST)
    box = image.getchannel("A").getbbox()
    if box is None or min(box[:2]) <= 0 or box[2] >= image.width or box[3] >= image.height:
        raise ValueError(f"Clipped imported frame {sheet['name']} {number}")
    crop = (max(0, box[0]-3), max(0, box[1]-3), min(image.width, box[2]+3), min(image.height, box[3]+3))
    result = image.crop(crop)
    meta = {"id": f"{sheet['name']}-{number}", "actor": actor, "action": action, "durationMs": duration, "anchor": [pivot[0]-crop[0], pivot[1]-crop[1]], "sourceSheet": sheet["name"], "sourceFrame": number, "sourceRect": group["bbox"], "sourceBodyAnchor": list(source_anchor), "sourcePixelsPerOutputPixel": scale, "visibleHeightPx": box[3]-box[1], "visibleBBox": [box[0]-crop[0], box[1]-crop[1], box[2]-crop[0], box[3]-crop[1]], "bodyReferenceHeightPx": BODY_HEIGHT*density, "sourceWholeFigurePixels": group["pixels"]}
    if extras:
        raw = extras[0]
        hand = [(raw["hand"][0]-source_anchor[0])/scale + pivot[0]-crop[0], (raw["hand"][1]-source_anchor[1])/scale + pivot[1]-crop[1]]
        released = raw.get("attachment") == "released"
        occlusion = [] if released else [[round(hand[0]-2.5*density), round(hand[1]-3*density), round(5*density), round(6*density)]]
        meta["weapon"] = {"id": raw.get("id", "cutlass"), "hand": hand, "angle": raw["angle"], "angleUnit": "radians-clockwise-screen", "depth": "ground" if released else "behind-hand", "attachment": "released" if released else "grip", "handOcclusionRect": occlusion[0] if occlusion else [0,0,0,0], "handOcclusionRects": occlusion, "sourceHandAnchor": list(raw["hand"]), "bodySourceStatus": "Weaponless body generated by imagegen; importer did not erase, paint or repair character pixels"}
        if "support" in raw:
            support = [(raw["support"][0]-source_anchor[0])/scale + pivot[0]-crop[0], (raw["support"][1]-source_anchor[1])/scale + pivot[1]-crop[1]]
            meta["weapon"]["supportHand"] = support
            occlusion.append([round(support[0]-3*density), round(support[1]-3*density), round(6*density), round(6*density)])
    if number in sheet.get("contacts", {}):
        palm = sheet["contacts"][number]
        meta["palm"] = [(palm[0]-source_anchor[0])/scale + pivot[0]-crop[0], (palm[1]-source_anchor[1])/scale + pivot[1]-crop[1]]
    return result, meta


def import_weapons():
    original = GEN / "exec-426e74cf-c834-4668-aa92-760bbfd907cd.png"
    path = SOURCES / "cutlass-rig-source.png"
    if not path.exists():
        shutil.copyfile(original, path)
    rgba = np.asarray(Image.open(path).convert("RGBA")).copy()
    rgba[:, :, 3] = np.where(rgba[:, :, 3] >= ALPHA, 255, 0)
    source = Image.fromarray(rgba)
    # Hand-inspected horizontal grip centre, blade root and upturned tip.
    source_pivot, source_root, source_tip = (443, 365), (630, 365), (1990, 181)
    result = {}
    for density, suffix in ((1, "640"), (1.5, "960")):
        scale = (source_tip[0]-source_root[0])/(24*density)
        pivot = (7*density, 7*density)
        prop = source.transform((round(40*density), round(14*density)), Image.Transform.AFFINE, (scale, 0, source_pivot[0]-pivot[0]*scale, 0, scale, source_pivot[1]-pivot[1]*scale), Image.Resampling.NEAREST)
        output = OUTPUT / f"cutlass-{suffix}.png"
        prop.save(output)
        result[suffix] = {"image": f"/assets/actors-v2/{output.name}", "density": density, "sizePx": list(prop.size), "pivot": list(pivot), "bladeRoot": [(source_root[0]-source_pivot[0])/scale+pivot[0], pivot[1]], "tip": [(source_tip[0]-source_pivot[0])/scale+pivot[0], (source_tip[1]-source_pivot[1])/scale+pivot[1]], "bladeHorizontalLengthPx": 24*density, "sourceSha256": sha(path), "sha256": sha(output), "method": "Whole separately generated weapon sampled independently from source; no cut fragment taken from an actor or runtime blade stretch"}
    musket_source = ROOT / ".local/assets/musket-v2-source/musket-rig-source.png"
    gun_path = SOURCES / "musket-rig-source.png"
    if not gun_path.exists():
        shutil.copyfile(musket_source, gun_path)
    if sha(gun_path) != sha(musket_source):
        raise ValueError("Musket rig selected source changed")
    gun = np.asarray(Image.open(gun_path).convert("RGBA")).copy()
    gun[:, :, 3] = np.where(gun[:, :, 3] >= ALPHA, 255, 0)
    source = Image.fromarray(gun)
    gun_result = {}
    source_pivot, source_muzzle, source_root, source_support = (710, 404), (2120, 301), (840, 300), (1320, 400)
    for density, suffix in ((1, "640"), (1.5, "960")):
        scale = (2124-49)/(66*density)
        pivot = (25*density, 11*density)
        prop = source.transform((round(80*density), round(24*density)), Image.Transform.AFFINE, (scale, 0, source_pivot[0]-pivot[0]*scale, 0, scale, source_pivot[1]-pivot[1]*scale), Image.Resampling.NEAREST)
        bbox = prop.getchannel("A").getbbox()
        if bbox is None or min(bbox[:2]) <= 0 or bbox[2] >= prop.width or bbox[3] >= prop.height:
            raise ValueError("Musket prop clipped")
        output = OUTPUT / f"musket-rig-{suffix}.png"
        prop.save(output)
        point = lambda p: [(p[0]-source_pivot[0])/scale+pivot[0], (p[1]-source_pivot[1])/scale+pivot[1]]
        gun_result[suffix] = {"image": f"/assets/actors-v2/{output.name}", "density": density, "sizePx": list(prop.size), "pivot": list(pivot), "barrelRoot": point(source_root), "bladeRoot": point(source_root), "muzzle": point(source_muzzle), "tip": point(source_muzzle), "supportGrip": point(source_support), "visibleLengthPx": bbox[2]-bbox[0], "sourceSha256": sha(gun_path), "sha256": sha(output), "method": "Complete separately generated gun with fixed source geometry; independently sampled at two densities"}
    return {"cutlass": result, "musket": gun_result}


def action_meta(action, frames):
    meta = {"frames": frames, "loop": action in ("idle", "run", "guard", "retreat"), "holdLast": action == "dead"}
    if action == "attack1":
        meta.update({"phaseFrames": {"windup": [0, 1], "active": [2], "recovery": [3]}, "contactFrameIndex": 2})
    elif action == "dodge":
        meta["phaseFrames"] = {"windup": [0], "active": [1, 2], "recovery": [3, 4]}
    elif action == "attack2":
        meta.update({"phaseFrames": {"windup": [0], "active": [1, 2], "recovery": [3]}, "contactFrameIndex": 1})
    elif action == "shove":
        meta.update({"phaseFrames": {"windup": [0], "active": [1, 2], "recovery": [3]}, "contactFrameIndex": 1})
    elif action == "parry":
        meta.update({"phaseFrames": {"windup": [0], "active": [0], "recovery": [1, 2]}, "contactFrameIndex": 0})
    elif action == "airAttack":
        meta.update({"phaseFrames": {"windup": [0], "active": [1], "recovery": [2]}, "contactFrameIndex": 1})
    elif action == "attack":
        meta.update({"phaseFrames": {"windup": [0, 1], "active": [2], "recovery": [3]}, "contactFrameIndex": 2})
    elif action == "jump":
        meta.update({"poseFrames": {"launch": 0, "rise": 1, "fall": 2, "land": 3}, "sampling": "Choose by physics phase; never loop all four poses"})
    elif action in ("hurt", "stagger"):
        meta.update({"phaseFrames": {"reaction": [0], "recovery": list(range(1, len(frames)))}, "holdLast": True})
    elif action == "reload":
        meta.update({"phaseFrames": {"reload": list(range(len(frames)))}, "holdLast": True, "totalDurationMs": sum(f["durationMs"] for f in frames)})
    elif action in ("aim", "fire", "brace"):
        meta["holdLast"] = True
    return meta


def pack(frames, density, actor):
    width, x, y, row_height = round(1024*density), 2, 2, 0
    packed = []
    for image, meta in frames:
        if x + image.width + 2 > width:
            x, y, row_height = 2, y + row_height + 2, 0
        meta["rect"] = [x, y, image.width, image.height]
        packed.append((image, meta))
        x += image.width + 2
        row_height = max(row_height, image.height)
    atlas = Image.new("RGBA", (width, y + row_height + 2))
    for image, meta in packed:
        atlas.paste(image, tuple(meta["rect"][:2]))
    suffix = "640" if density == 1 else "960"
    path = OUTPUT / f"{actor}-{suffix}.png"
    atlas.save(path)
    actions = {action: action_meta(action, [meta for _, meta in packed if meta["action"] == action]) for action in dict.fromkeys(meta["action"] for _, meta in packed)}
    if actor == "musket":
        actions["idle"] = {**actions["aim"], "loop": True, "holdLast": False, "aliasOf": "aim", "note": "Reuses the exact same body frame; not counted as an independent animation pose"}
        for alias in ("stagger", "pushed"):
            actions[alias] = {**actions["hurt"], "aliasOf": "hurt", "note": "Explicit reuse of existing recoil pose; no new generated animation frame"}
    return {"image": f"/assets/actors-v2/{path.name}", "density": density, "sha256": sha(path), "sizePx": list(atlas.size), "actions": actions}, packed


def rigged_review(sprite, meta, weapons):
    # Inspection-only rendering of the same body + reusable prop layering
    # requested for runtime. Production actor pixels remain weaponless.
    if "weapon" not in meta:
        return sprite, meta
    prop = weapons[meta["weapon"]["id"]]["640"]
    weapon = Image.open(OUTPUT / Path(prop["image"]).name).convert("RGBA")
    result = Image.new("RGBA", (sprite.width+80, sprite.height+80))
    result.alpha_composite(sprite, (40, 40))
    hand = [v+40 for v in meta["weapon"]["hand"]]
    angle = meta["weapon"]["angle"]
    c, s = math.cos(angle), math.sin(angle)
    pivot = prop["pivot"]
    layer = weapon.transform(result.size, Image.Transform.AFFINE, (c, s, pivot[0]-c*hand[0]-s*hand[1], -s, c, pivot[1]+s*hand[0]-c*hand[1]), Image.Resampling.NEAREST)
    result.alpha_composite(layer)
    for x, y, w, h in meta["weapon"]["handOcclusionRects"]:
        patch = sprite.crop((x, y, x+w, y+h))
        result.alpha_composite(patch, (x+40, y+40))
    return result, {**meta, "anchor": [v+40 for v in meta["anchor"]]}


def review(actor, packed, weapons):
    # Each candidate is shown as actual 1x pixels as well as a labelled 3x check.
    frames = packed["640"]
    columns, cell_w, cell_h = 5, 370, 300
    image = Image.new("RGB", (columns*cell_w, 55 + ((len(frames)+columns-1)//columns)*cell_h), "#263e4b")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 16)
    draw.text((15, 15), actor + " v2 / 70px body reference / independent 105px source sampling also supplied", font=font, fill="#f3dfb5")
    gifs = {}
    for i, (sprite, meta) in enumerate(frames):
        sprite, meta = rigged_review(sprite, meta, weapons)
        x, y = (i % columns)*cell_w, 55 + (i//columns)*cell_h
        foot = (x + 145, y + 244)
        preview = sprite.resize((sprite.width*3, sprite.height*3), Image.Resampling.NEAREST)
        image.paste(preview, (foot[0]-meta["anchor"][0]*3, foot[1]-meta["anchor"][1]*3), preview)
        draw.line((x+8, foot[1], x+cell_w-8, foot[1]), fill="#8bc9bc")
        draw.text((x+8, y+255), meta["id"], font=font, fill="#f3dfb5")
        draw.text((x+8, y+276), meta["action"] + f" {meta['durationMs']}ms", font=font, fill="#d5e4ea")
        canvas = Image.new("RGB", (480, 400), "#263e4b")
        d = ImageDraw.Draw(canvas)
        d.text((10, 10), meta["id"] + " / candidate body contact", font=font, fill="#f3dfb5")
        canvas.paste(preview, (180-meta["anchor"][0]*3, 355-meta["anchor"][1]*3), preview)
        d.line((20, 355, 460, 355), fill="#8bc9bc")
        gifs.setdefault(meta["action"], []).append((canvas, meta["durationMs"]))
    image.save(REVIEW / f"{actor}-frames.png")
    for action, animation in gifs.items():
        if len(animation) > 1:
            animation[0][0].save(REVIEW / f"{actor}-{action}.gif", save_all=True, append_images=[x[0] for x in animation[1:]], duration=[x[1] for x in animation], loop=0, disposal=2)


def export_contacts(manifest, manifest_sha):
    """Export the precise render transform once for model and scene consumers."""
    actors = {}
    for actor, sets in manifest["actors"].items():
        actions = {}
        for action, clip in sets["640"]["actions"].items():
            frames = []
            for index, frame in enumerate(clip["frames"]):
                anchor = frame["anchor"]
                box = frame["visibleBBox"]
                local = lambda p: [p[0]-anchor[0], p[1]-anchor[1]]
                record = {"index": index, "id": frame["id"], "durationMs": frame["durationMs"], "sourceSheet": frame["sourceSheet"], "sourceFrame": frame["sourceFrame"], "bodyHeight": box[3]-box[1], "visibleTopFromFeet": box[1]-anchor[1], "visibleBottomFromFeet": box[3]-anchor[1], "visibleBBoxFromFeet": [box[0]-anchor[0], box[1]-anchor[1], box[2]-anchor[0], box[3]-anchor[1]]}
                if "weapon" in frame:
                    raw = frame["weapon"]
                    prop = manifest["weapons"][raw["id"]]["640"]
                    hand = local(raw["hand"])
                    c, s = math.cos(raw["angle"]), math.sin(raw["angle"])
                    def world(point):
                        x, y = point[0]-prop["pivot"][0], point[1]-prop["pivot"][1]
                        return [hand[0]+c*x-s*y, hand[1]+s*x+c*y]
                    record["weapon"] = {"id": raw["id"], "hand": hand, "angle": raw["angle"], "attachment": raw["attachment"], "root": world(prop["bladeRoot"]), "tip": world(prop["tip"])}
                    if "muzzle" in prop:
                        record["weapon"]["muzzle"] = world(prop["muzzle"])
                        muzzle, root = record["weapon"]["muzzle"], record["weapon"]["root"]
                        record["weapon"]["barrelAngle"] = math.atan2(muzzle[1]-root[1], muzzle[0]-root[0])
                    if "supportHand" in raw:
                        record["weapon"]["supportHand"] = local(raw["supportHand"])
                if "palm" in frame:
                    record["palm"] = local(frame["palm"])
                frames.append(record)
            actions[action] = {key: value for key, value in clip.items() if key != "frames"}
            actions[action]["frames"] = frames
        actors[actor] = {"actions": actions}
    data = {"schema": 1, "status": "candidate-art-not-user-approved", "sourceManifestSha256": manifest_sha, "coordinateSpace": "feet-local-at-640-facing-right", "transform": "Coordinates are unrounded float results of frame.hand + R(angle) * (weapon.point - weapon.pivot) minus frame.anchor; mirror entire X for facing left.", "sourceProvenance": {sheet["name"]: {"source": f".local/assets/actors-v2/{sheet['name']}.png", "sha256": sha(SOURCES / (sheet["name"] + ".png"))} for sheet in SHEETS}, "actors": actors}
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    (OUTPUT / "contact-geometry.json").write_text(payload + "\n", encoding="utf-8", newline="\n")
    (ROOT / "src/game/art-contact-data.ts").write_text("/** Generated by scripts/import_actor_v2.py. Do not edit. */\nexport const ART_CONTACT_DATA = " + payload + " as const;\n", encoding="utf-8", newline="\n")
    return data


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    loaded, provenance = load_sources()
    weapons = import_weapons()
    actors = {}
    for actor in ("hero", "sword", "musket"):
        sets, packed = {}, {}
        for density, suffix in ((1, "640"), (1.5, "960")):
            rendered = [render_frame(item, density) for item in loaded if item[-1][0] == actor]
            sets[suffix], packed[suffix] = pack(rendered, density, actor)
        actors[actor] = sets
        review(actor, packed, weapons)
    manifest = {"schema": 2, "status": "candidate-art-not-user-approved", "bodyHeight640": 70, "bodyHeight960": 105, "scaleEvidence": "Both outputs are nearest samples from new high-detail raw generated sources, not an upscale of old sprites or of the 640 output. Higher source sampling detail does not prove an authored native pixel grid.", "flipAnchorRule": "Mirror entire actor+weapon local group. For a separately mirrored rect use rect.width - anchor.x and rect.width - hand.x; keep Y and reverse angle consistently.", "weaponLayerRule": "Draw body, weapon transformed around weapon.pivot at frame.weapon.hand, then redraw each original body handOcclusionRects region to preserve closed fingers over the grip. Legacy single handOcclusionRect is the primary grip; released props use an empty rect. Body images are genuinely generated weaponless; no importer masking repair.", "weapons": weapons, "actors": actors}
    manifest_path = OUTPUT / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    contacts = export_contacts(manifest, sha(manifest_path))
    report = {"date": "2026-10-24", "method": "Whole 8-connected figures with alpha cutoff 128, manually reviewed body/foot/closed-grip anchors, uniform per-strip body reference scale. No per-pose stretch, character pixel repair or color quantization. Genuine imagegen weaponless bodies plus independently generated reusable props. Variable rect atlas packing; no source grid clipping.", "sources": provenance, "currentFrameCounts": {a: len({f["id"] for v in data["640"]["actions"].values() for f in v["frames"]}) for a, data in actors.items()}, "actionCoverage": {a: {action: {"frameCount": len(v["frames"]), "aliasOf": v.get("aliasOf"), "durationMs": sum(f["durationMs"] for f in v["frames"])} for action, v in data["640"]["actions"].items()} for a, data in actors.items()}, "knownGaps": ["Sparse generated keyposes with fixed runtime weapons; no claim of fully hand-authored continuous animation.", "Generated material still includes fine texture and many colors; no strict native-grid or limited-palette acceptance claimed.", "Body and hand anchors require final live encounter review; importing and building are not user visual acceptance.", "Musket reload has six distinct body poses and one rigid gun; there is no independent animated ramrod prop or claim of mechanical contact continuity.", "Per-strip standing reference estimates preserve pose compression but do not prove perfectly identical anatomy across generations.", "Earlier merged-weapon two-cut source and repeated-run-pose sources were rejected. Unused baked musket idle is excluded."], "manifest": "public/assets/actors-v2/manifest.json", "manifestSha256": sha(manifest_path), "contactGeometry": "public/assets/actors-v2/contact-geometry.json", "contactGeometrySha256": sha(OUTPUT / "contact-geometry.json")}
    runtime_files = []
    variants = [v for actor in actors.values() for v in actor.values()] + [v for prop in weapons.values() for v in prop.values()]
    for variant in variants:
        path = ROOT / "public" / variant["image"].lstrip("/")
        rgba = np.asarray(Image.open(path).convert("RGBA"))
        alpha_values = np.unique(rgba[:, :, 3]).tolist()
        if alpha_values != [0, 255]:
            raise ValueError(f"Unexpected runtime transparency: {path}")
        runtime_files.append({"path": path.relative_to(ROOT).as_posix(), "sha256": sha(path), "sizePx": list(Image.open(path).size), "bytes": path.stat().st_size, "alphaValues": alpha_values, "retainedRgbColorCount": len(np.unique(rgba[rgba[:, :, 3] == 255, :3], axis=0))})
    report["runtimeFiles"] = runtime_files
    report["independentBodyPoseTotal"] = sum(report["currentFrameCounts"].values())
    report["licenseRecord"] = "Original built-in image_gen production from project-owned visual references; no third-party pack content or paid procurement in these actor-v2 runtime images. No assertion of exclusive copyright or a third-party CC license."
    report["validation"] = {"allRuntimeAlphaBinary": True, "bodyFloorOffsets640": {a: sorted({f["visibleBottomFromFeet"] for c in data["actions"].values() for f in c["frames"]}) for a, data in contacts["actors"].items()}, "musketBarrelDegrees": {a: math.degrees(contacts["actors"]["musket"]["actions"][a]["frames"][0]["weapon"]["barrelAngle"]) for a in ("aim", "fire")}}
    report["timingReview"] = {"sword.brace": "Corrected 150/260 to 80/80ms: both poses occur during model 160ms brace.", "sword.retreat": "Corrected 160/200 to a looping 75/75ms step. The shortest 150ms spacing retreat includes both poses; guarded 550ms movement repeats rather than holding a lifted leg. Only two step keyposes, not a complete walk cycle.", "sword.hurt": "Corrected 160/140 to 160/80ms to fit 240ms model reaction.", "sword.stagger": "200/240ms, then hold final pose until model staggerUntil; the short 260ms body-collision interruption ends 180ms of the recovery tail early, although both poses appear.", "hero.hurt": "160/140ms; hurtRecover sampling adds the first 160ms so recovery appears. Hold final if stun extends.", "attacks": "All five attack/shove clips use the same phaseFrames and model phase durations as contacts.", "jump": "Four fixed indices selected by launch/rise/fall/land physics, not a time loop.", "musket": "aim1000/fire120/reload1700. aim/fire actual barrel angle fixed down14deg; stagger and pushed explicitly alias existing hurt."}
    (ROOT / "docs/art/actor-v2-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(report["currentFrameCounts"]))


if __name__ == "__main__":
    main()
