"""Deterministic import of original generated scene/prop pixels, no drawn stand-ins.

The source tool did not obey the requested exact grid. This importer records actual
sizes, then samples the approved working sources into the explicit game grid.
Screenshots/boards are local review evidence, never production acceptance.
"""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\Alex Chen\.codex\generated_images\01a169ba-898d-7632-bacc-a4ebc8323c4d")
LOCAL = ROOT / ".local/assets/generated"
OUT = ROOT / "public/assets/environment"
LOCAL.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def source(name, file):
    target = LOCAL / name
    if not target.exists():
        original = SOURCE / file
        if not original.exists():
            raise FileNotFoundError(f"Restore original source {name} in {LOCAL}; see docs/art/scene-import.json for its SHA256")
        shutil.copyfile(original, target)
    return target, Image.open(target).convert("RGBA")

bg_path, bg = source("harbor-source.png", "exec-6cd9d37b-96a2-4da8-9e09-6065bbf66c56.png")
bg.resize((640, 360), Image.Resampling.NEAREST).convert("RGB").save(OUT / "harbor.png", optimize=True)
props_path, props = source("props-source.png", "exec-9d7949c5-6cc4-4cb1-a9df-0a96a0ab66c9.png")
# These bounds separate actual alpha silhouettes; they are NOT assumed equal cells.
regions = {
    "cannon-idle": ((0, 170, 520, 570), (64, 38)),
    "cannon-fire": ((530, 170, 1030, 570), (64, 38)),
    "cannon-recover": ((1030, 170, 1536, 570), (64, 38)),
    "crate": ((0, 590, 480, 960), (48, 24)),
    "barrel": ((490, 580, 735, 970), (24, 32)),
    "platform": ((740, 600, 1536, 960), (112, 28)),
}
report = {"date": "2026-10-24", "tool": "built-in imagegen", "status": "working art; user review pending", "background": {"source_size": bg.size, "runtime_size": [640, 360], "source_sha256": digest(bg_path), "floor_edge_y": 255}, "props": []}
for name, (rect, size) in regions.items():
    crop = props.crop(rect)
    alpha = crop.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
    crop.putalpha(alpha)
    box = alpha.getbbox()
    if box is None:
        raise ValueError(f"No silhouette: {name}")
    pixel = crop.crop(box).resize(size, Image.Resampling.NEAREST)
    path = OUT / f"{name}.png"
    pixel.save(path, optimize=True)
    report["props"].append({"name": name, "source_region": rect, "source_alpha_bbox": box, "runtime_size": size, "sha256": digest(path), "modifications": "alpha128 cutoff, silhouette extraction, explicit native-size sampling; no painted additions"})
report["props_source_sha256"] = digest(props_path)
report["limitations"] = ["Source dimensions are not the prompt's requested grid.", "Generated detail is sampled into a native grid; it is not a claim that every source pixel was a uniform 4x4 cluster.", "Cannon frames need live recoil/pivot review; no complete action-animation claim."]
(ROOT / "docs/art/scene-import.json").write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(json.dumps({"background": [640, 360], "props": len(regions), "floor_y": 255}))
