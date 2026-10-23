"""Import supplied generated candidates by whole connected figures, not grid crops.

Run: python scripts/import_generated_art.py
No drawing, palette reduction, resampling enhancement or per-pose stretching occurs.
Pillow/numpy only. Source originals and review images remain under ignored .local/.
"""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = Path("C:/Users/Alex Chen/.codex/generated_images/01a169ba-898d-7632-bacc-a4ebc8323c4d")
LOCAL = ROOT / ".local/assets/generated"
REVIEW = ROOT / ".local/art"
ALPHA_CUTOFF = 128
EXPECTED_SOURCE_SHA = {
    "hero": "742f2d44dd1dea9574e630c3ed1ba176873def06fa4ef6fb6a0fd4a80610c6ad",
    "enemies": "b78588102c277a81860475c488a2fabf313b928ca51549ce66b876a3dea2d3ce",
}
FRAME_SIZE = (96, 80)
ANCHOR = (36, 68)
SCALE = 4

HERO_NAMES = [
    "idleA", "idleB", "runContactR", "runPassR", "runContactL", "runPassL",
    "jumpLaunch", "rise", "fall", "land", "landRecover", "airSlash",
    "slashWindup", "slashActive", "slashRecover", "guard", "parry", "parryRecoil",
    "shovePrep", "shoveActive", "shoveRecover", "hurt", "hurtRecover", "dead",
]
ENEMY_NAMES = [
    "swordIdle", "swordRunContactR", "swordRunPassR", "swordRunContactL", "swordRunPassL", "swordWindup",
    "swordWindupHeld", "swordSlash", "swordRecover", "swordHurt", "swordStagger", "swordDead",
    "musketIdle", "musketWalkA", "musketWalkB", "musketRaiseAim", "musketAim", "musketFire",
    "musketReloadLower", "musketRamrod", "musketReloadShoulder", "musketHurt", "musketPush", "musketDead",
]

# Reviewed pelvis/body centres, not component/weapon bounding-box centres.
# Y is the contact plane observed in each source pose; explicit exceptions below.
HERO_ANCHORS = [
    (128, 271), (384, 271), (650, 273), (879, 271), (1160, 271), (1420, 269),
    (116, 525), (419, 512), (648, 516), (889, 526), (1160, 526), (1433, 525),
    (130, 762), (376, 762), (637, 762), (883, 762), (1147, 762), (1420, 762),
    (133, 990), (382, 988), (636, 990), (925, 986), (1154, 990), (1380, 990),
]
ENEMY_ANCHORS = [
    (124, 268), (374, 268), (649, 268), (891, 270), (1150, 270), (1438, 271),
    (124, 511), (383, 513), (648, 513), (884, 512), (1161, 513), (1401, 513),
    (122, 762), (377, 763), (630, 763), (868, 763), (1122, 764), (1380, 763),
    (123, 1000), (372, 1000), (625, 1000), (908, 998), (1152, 999), (1386, 1000),
]

# Manual visual blade root/tip estimates; projected length, not curved blade arc.
# These are audit annotations and do not modify the supplied weapon.
HERO_BLADE_ENDPOINTS = [
    ((103, 178), (208, 215)), ((360, 178), (468, 214)), ((611, 173), (756, 167)),
    ((872, 160), (990, 127)), ((1124, 171), (1234, 202)), ((1403, 158), (1517, 128)),
    ((56, 466), (14, 509)), ((454, 385), (494, 327)), ((619, 414), (758, 382)),
    ((834, 473), (925, 490)), ((1111, 446), (1265, 430)), ((1382, 322), (1297, 299)),
    ((114, 563), (213, 597)), ((474, 647), (567, 626)), ((721, 702), (792, 724)),
    ((913, 644), (910, 542)), ((1201, 644), (1259, 581)), ((1438, 654), (1489, 609)),
    ((73, 919), (15, 983)), ((302, 920), (261, 981)), ((582, 900), (523, 942)),
    ((857, 919), (935, 968)), ((1180, 979), (1277, 984)), ((1428, 978), (1525, 970)),
]
MELEE_BLADE_ENDPOINTS = [
    ((84, 176), (201, 216)), ((332, 169), (468, 194)), ((595, 160), (791, 159)),
    ((870, 167), (1056, 131)), ((1135, 177), (1280, 201)), ((1477, 55), (1376, 18)),
    ((129, 305), (230, 296)), ((466, 399), (554, 379)), ((606, 416), (712, 449)),
    ((887, 434), (993, 481)), ((1133, 430), (1290, 402)), ((1428, 501), (1524, 496)),
]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def components(mask: np.ndarray) -> tuple[np.ndarray, list[dict]]:
    """Eight-connected run-length labelling, requiring no installed scipy."""
    parents, runs, previous = [], [], []

    def find(index):
        while parents[index] != index:
            parents[index] = parents[parents[index]]
            index = parents[index]
        return index

    def union(a, b):
        a, b = find(a), find(b)
        if a != b:
            parents[b] = a

    for y, row in enumerate(mask):
        edges = np.flatnonzero(np.diff(np.r_[False, row, False].astype(np.int8)))
        current = []
        for x1, x2 in zip(edges[::2], edges[1::2]):
            index = len(parents)
            parents.append(index)
            runs.append((int(x1), int(x2), y))
            current.append(index)
            for other in previous:
                left, right, _ = runs[other]
                if left > x2:
                    break
                if right >= x1:
                    union(index, other)
        previous = current
    labels = np.zeros(mask.shape, dtype=np.int32)
    groups = {}
    for index, (left, right, y) in enumerate(runs):
        key = find(index) + 1
        labels[y, left:right] = key
        if key not in groups:
            groups[key] = {"id": key, "pixels": 0, "bbox": [left, y, right, y + 1]}
        item = groups[key]
        item["pixels"] += right - left
        b = item["bbox"]
        item["bbox"] = [min(b[0], left), min(b[1], y), max(b[2], right), max(b[3], y + 1)]
    # Row membership uses figure vertical midpoint, only after full component
    # extraction. No source pixels are assigned by the conceptual cell grid.
    rows = [[] for _ in range(4)]
    for group in groups.values():
        if group["pixels"] < 1000:
            raise ValueError("Unexpected detached component; manual grouping required")
        b = group["bbox"]
        row = min(3, int(((b[1] + b[3]) / 2) // 256))
        rows[row].append(group)
    if [len(row) for row in rows] != [6, 6, 6, 6]:
        raise ValueError("Expected 24 complete isolated figures in four conceptual rows")
    return labels, [g for row in rows for g in sorted(row, key=lambda g: g["bbox"][0])]


def bbox_metrics(image: Image.Image) -> dict:
    box = image.getchannel("A").getbbox()
    if not box:
        raise ValueError("Empty imported frame")
    a = np.asarray(image.getchannel("A"))
    return {
        "alpha_bbox_xyxy_exclusive": list(box),
        "visible_size_px": [box[2] - box[0], box[3] - box[1]],
        "bottom_alpha_y_exclusive": box[3],
        "opaque_pixels": int(np.count_nonzero(a)),
        "clear_margin_px": [box[0], box[1], image.width - box[2], image.height - box[3]],
    }


def review_sheet(hero_frames, enemy_frames):
    image = Image.new("RGB", (1440, 1880), "#152733")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 16)
    big = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 25)
    for set_index, (name, frames, names) in enumerate((
        ("HERO / imported at 2x for inspection", hero_frames, HERO_NAMES),
        ("ENEMIES / imported at 2x for inspection", enemy_frames, ENEMY_NAMES),
    )):
        origin = 24 + set_index * 930
        draw.text((20, origin), name, font=big, fill="#e7f0f3")
        draw.text((20, origin + 34), "96x80 native frame; common anchor (36,68). No per-frame stretch, no palette correction.", font=font, fill="#c0d4df")
        for index, frame in enumerate(frames):
            x, y = (index % 6) * 240 + 20, (index // 6) * 210 + origin + 65
            draw.rectangle((x, y, x + 192, y + 160), fill="#455b68", outline="#778995")
            preview = frame.resize((192, 160), Image.Resampling.NEAREST)
            image.paste(preview, (x, y), preview)
            draw.line((x, y + ANCHOR[1] * 2, x + 192, y + ANCHOR[1] * 2), fill="#6bc7bc")
            draw.line((x + ANCHOR[0]*2-4, y + ANCHOR[1]*2, x + ANCHOR[0]*2+4, y + ANCHOR[1]*2), fill="#ffe391", width=2)
            draw.text((x, y + 164), f"{index:02d} {names[index]}", font=font, fill="#edf3f5")
    image.save(REVIEW / "generated-frame-review.png")


def gif_review(name, frames, names, sequence):
    images = []
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 18)
    for index in sequence:
        image = Image.new("RGB", (480, 370), "#304a59")
        draw = ImageDraw.Draw(image)
        preview = frames[index].resize((384, 320), Image.Resampling.NEAREST)
        image.paste(preview, (48, 30), preview)
        draw.line((30, 30 + ANCHOR[1]*4, 450, 30 + ANCHOR[1]*4), fill="#85cabf")
        draw.text((15, 6), f"{name}  {index:02d} {names[index]}", font=font, fill="#f4e4c6")
        draw.text((15, 346), "Review timing only / not authored source timing", font=font, fill="#d6e1e5")
        images.append(image)
    images[0].save(REVIEW / (name + ".gif"), save_all=True, append_images=images[1:], loop=0, duration=140, disposal=2)


def import_sheet(key, filename, names, anchors):
    LOCAL.mkdir(parents=True, exist_ok=True)
    local_source = LOCAL / (key + "-source.png")
    if not local_source.exists():
        shutil.copyfile(SOURCE_DIR / filename, local_source)
    if digest(local_source) != EXPECTED_SOURCE_SHA[key]:
        raise ValueError("Local source differs from task-supplied original")
    source = Image.open(local_source).convert("RGBA")
    if source.size != (1536, 1024):
        raise ValueError("Unexpected source size")
    rgba = np.asarray(source)
    alpha = rgba[:, :, 3]
    mask = alpha >= ALPHA_CUTOFF
    labels, groups = components(mask)
    atlas = Image.new("RGBA", (576, 320))
    frames, records = [], []
    component_review = Image.new("RGB", source.size, "#526775")
    cut = rgba.copy()
    cut[:, :, 3] = np.where(mask, 255, 0)
    normalized = Image.fromarray(cut)
    component_review.paste(normalized, (0, 0), normalized)
    draw = ImageDraw.Draw(component_review)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 21)
    for index, (group, name, anchor) in enumerate(zip(groups, names, anchors)):
        isolated = np.zeros_like(rgba)
        figure = labels == group["id"]
        isolated[figure, :3] = rgba[figure, :3]
        isolated[figure, 3] = 255
        source_figure = Image.fromarray(isolated)
        transform = (SCALE, 0, anchor[0] - ANCHOR[0]*SCALE, 0, SCALE, anchor[1] - ANCHOR[1]*SCALE)
        frame = source_figure.transform(FRAME_SIZE, Image.Transform.AFFINE, transform, Image.Resampling.NEAREST)
        metrics = bbox_metrics(frame)
        b = group["bbox"]
        projected = [(b[0] - anchor[0]) / SCALE + ANCHOR[0], (b[1] - anchor[1]) / SCALE + ANCHOR[1], (b[2] - anchor[0]) / SCALE + ANCHOR[0], (b[3] - anchor[1]) / SCALE + ANCHOR[1]]
        if min(projected[:2]) < 1 or projected[2] > 95 or projected[3] > 79:
            raise ValueError(f"Figure could touch an atlas cell edge: {key} {index}")
        frames.append(frame)
        atlas.paste(frame, ((index % 6)*96, (index // 6)*80))
        record = {"index": index, "state": name, "identity_review": "Same visible costume, hair/headwear and side-facing identity within this actor set; no claim of perfect drawn consistency.", "source_component_pixels": group["pixels"], "source_bbox_xyxy_exclusive": b, "source_body_anchor_xy": list(anchor), "anchor_method": "Manually reviewed body/pelvis centre in X and pose contact plane in Y; not rectangle centre or sword tip.", "source_bbox_projected_into_frame": projected, **metrics}
        endpoints = HERO_BLADE_ENDPOINTS[index] if key == "hero" else MELEE_BLADE_ENDPOINTS[index] if index < 12 else None
        if endpoints:
            p1, p2 = endpoints
            length = ((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)**.5 / SCALE
            record["blade_projection_audit"] = {"source_root_tip_xy_estimates": [list(p1), list(p2)], "approx_output_root_tip_distance_px": round(length, 2), "method_limit": "Visual approximate root-tip projected chord, not the curved blade length. For consistency inspection only; no weapon pixels adjusted."}
        if key == "hero" and index == 22:
            record["needs_redraw"] = "Kneeling knee/hand and horizontal sword do not share one contact plane; baseline conservatively includes sword to prevent crop. Pivot translation alone cannot make all contacts physically correct."
        elif key == "hero" and index in (6, 7, 8, 10, 14, 17):
            record["needs_redraw"] = "Visible sword projection differs strongly from standing reference; inspect foreshortening versus inconsistent weapon length before final animation acceptance."
        elif key == "enemies" and index == 19:
            record["needs_redraw"] = "Requested ramrod state shows raised long gun, but a separate ramrod and correct loading hand sequence are not proven by this pose."
        records.append(record)
        draw.rectangle(tuple(b), outline="#93f1cb", width=2)
        draw.text((b[0], max(0, b[1]-24)), f"{index:02d} {name}", font=font, fill="#fff0c0", stroke_width=1, stroke_fill="#182631")
        draw.line((anchor[0]-6, anchor[1], anchor[0]+6, anchor[1]), fill="#ffdc70", width=3)
    out = ROOT / "public/assets/actors" / (key + ".png")
    out.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(out)
    component_review.save(REVIEW / (key + "-generated-components.png"))
    atlas_array = np.asarray(atlas)
    opaque = atlas_array[:, :, 3] > 0
    alpha_values, alpha_counts = np.unique(alpha, return_counts=True)
    result = {
        "source_file": local_source.relative_to(ROOT).as_posix(), "source_original_filename": filename,
        "source_sha256": digest(local_source), "source_canvas_px": list(source.size),
        "source_alpha_min_max": [int(alpha.min()), int(alpha.max())],
        "source_alpha_distribution": {str(k): int(v) for k, v in zip(alpha_values, alpha_counts)},
        "source_nonzero_pixels": int(np.count_nonzero(alpha)), "source_retained_pixels_at_cutoff": int(mask.sum()),
        "source_discarded_nonzero_pixels": int(np.count_nonzero((alpha > 0) & ~mask)),
        "source_retained_rgb_unique_count": int(len(np.unique(rgba[mask, :3], axis=0))),
        "component_count": len(groups), "detached_components": 0,
        "output_file": out.relative_to(ROOT).as_posix(), "output_sha256": digest(out),
        "output_canvas_px": list(atlas.size), "frame_size_px": list(FRAME_SIZE), "frame_count": len(frames),
        "output_alpha_values": sorted(np.unique(atlas_array[:, :, 3]).tolist()),
        "output_visible_rgb_unique_count": int(len(np.unique(atlas_array[opaque, :3], axis=0))),
        "frame_records": records,
    }
    return frames, result


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    hero_frames, hero = import_sheet("hero", "exec-d31d1e82-79fa-4ac3-86dd-a1bf1c39745b.png", HERO_NAMES, HERO_ANCHORS)
    enemy_frames, enemies = import_sheet("enemies", "exec-8e089b51-ec44-4351-818f-44e0a8b9458a.png", ENEMY_NAMES, ENEMY_ANCHORS)
    review_sheet(hero_frames, enemy_frames)
    gif_review("hero-motion-review", hero_frames, HERO_NAMES, [0, 1, 0, 1, 2, 3, 4, 5, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    gif_review("hero-combat-review", hero_frames, HERO_NAMES, [15, 15, 16, 17, 18, 19, 20, 12, 13, 14, 21, 22, 23, 23])
    gif_review("enemies-motion-review", enemy_frames, ENEMY_NAMES, list(range(24)))
    report = {
        "audit_date": "2026-10-24",
        "status": "Imported candidate frames, requiring targeted redraw and in-game art/motion acceptance. Not a claim of a production-ready animation library.",
        "provenance": "Two original generated images supplied by the root agent from this task's image-generation output. No third-party stock art used in these two atlases.",
        "method": {"alpha_cutoff": ALPHA_CUTOFF, "alpha_normalization": "Source alpha below 128 becomes 0; retained pixels become 255. RGB is unchanged at retained sampled locations. This removes generated translucent background residue and antialiased partial edges explicitly.", "component_connectivity": 8, "segmentation": "24 independent complete connected figures per source; no 256x256 grid clipping and no detached blade pieces. Row-major ordering is assigned only after segmentation.", "scale": "Exactly 1/4 with nearest-neighbour affine sampling around each manually reviewed anchor; no individual sprite stretch or size normalization.", "anchor": list(ANCHOR), "palette": "Audited only; no color quantization, redrawing or enhancement.", "limits": "Source includes fine colored texture and irregular pixels; it is not a verified strict 4px grid. Import does not turn this into a clean limited-palette animation set.", "gif_timing": "140ms per review frame is an inspection choice, not authored timing. Combat/hit windows must be designed and validated in runtime."},
        "actors": {"hero": hero, "enemies": enemies},
        "coverage_gaps": [
            "Hero has two idle, four run, launch/rise/fall/land/recovery, one air-slash, three slash, one guard, two parry, three shove, two hurt and one corpse candidate pose. Sparse poses do not by themselves constitute smooth animations.",
            "No dedicated dodge/roll, interaction or dying transition frames. Single corpse poses must not be reported as full death animations.",
            "Sword projected length and some grip geometry vary by pose. Manual root/tip annotations quantify visible differences; targeted consistent redraw is still required.",
            "Hero frame 22 has incompatible knee/hand versus sword contact planes. Pivot normalization cannot fix the drawing.",
            "Melee enemy has four running candidates, two anticipation poses, one active slash, recovery, hurt, stagger and corpse; intermediate attack/recoil and displaced-body transitions remain absent.",
            "Musket aim/fire candidate silhouettes are very similar, and full recoil/trigger timing is not proven. Loading sequence requires a readable ramrod/action correction and interruption transition.",
            "No boss-specific or remaining enemy-role frames are supplied. This audit covers only hero, one swordsman and one musketeer.",
            "No collision, attack-contact, foot locking or live mobile acceptance is established by these import artifacts. Those require the actual running sample.",
        ],
        "review_files": [
            ".local/art/generated-frame-review.png", ".local/art/hero-generated-components.png", ".local/art/enemies-generated-components.png",
            ".local/art/hero-motion-review.gif", ".local/art/hero-combat-review.gif", ".local/art/enemies-motion-review.gif",
        ],
    }
    output = ROOT / "docs/art/generated-frame-audit.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: {"components": value["component_count"], "atlas": value["output_canvas_px"], "palette": value["output_visible_rgb_unique_count"], "frame_count": value["frame_count"], "first_frame_metrics": value["frame_records"][0]} for key, value in report["actors"].items()}, indent=2))


if __name__ == "__main__":
    main()
