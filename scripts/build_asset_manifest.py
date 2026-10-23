"""Build the master CSV from measured runtime files and the source audits."""
from pathlib import Path
from PIL import Image
import csv
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
audit = json.loads((DOCS / "art/asset-audit.json").read_text(encoding="utf-8"))
audio = json.loads((DOCS / "art/audio-audit.json").read_text(encoding="utf-8"))
actor_v2 = json.loads((ROOT / "public/assets/actors-v2/manifest.json").read_text(encoding="utf-8"))
fields = ["id", "status", "file", "author", "official_url", "version", "sha256", "license", "public_repository", "modifications", "use", "tile_px", "canvas_px", "effective_body_px", "foot_anchor", "animation_coverage", "frames", "duration_ms"]
rows = []
for source in audit["sources"]:
    archive = next(a for a in audit["archive_hashes"] if a["name"] == source["archive"])
    rows.append(dict(id=source["id"], status="实际验包；研究候选；未采用为运行角色", file=".local/assets/raw/"+archive["name"], author=source["author"], official_url=source["url"], version=source["version"], sha256=archive["sha256"], license=source["license"], public_repository=source["repository_distribution"], modifications="原包未修改；拼板为静态组合", use="资源比较；全部逐帧规格见art/asset-audit.json", tile_px="32" if source["id"] != "hippo-pirate" else "", animation_coverage="详见ANIMATION_MATRIX.md；不是完整战斗资产"))
for file in sorted((ROOT / "public/assets").rglob("*")):
    if not file.is_file(): continue
    rel = file.relative_to(ROOT).as_posix()
    row = dict(id=file.stem, status="小型实机审核候选；待用户认可", file=rel, sha256=hashlib.sha256(file.read_bytes()).hexdigest())
    if file.suffix == ".ogg":
        item = next(a for a in audio["assets"] if a["output_file"] == rel)
        row.update(author=item["author"], official_url=item["official_url"], version="2026-10-24 official download; source hash in audio-audit.json", license=item["license"], public_repository="CC0允许", modifications=item["edits"], use=item["purpose"], duration_ms=round(item["output"]["duration_seconds"]*1000))
    elif file.suffix == ".json":
        row.update(author="Cutlass Wake", official_url="project-original", version="2026-10-24", license="本项目动作与接触元数据", public_repository="随专用源码分支分发", modifications="由实际导入图与锚点生成", use="运行帧/接触记录；不能作为美术验收")
    else:
        row.update(author="Cutlass Wake 本轮原创生成 / built-in imagegen", official_url="project-original; prompt record docs/art/GENERATION_PROMPTS.md", version="2026-10-24 source SHA in generated-frame-audit.json or scene-import.json", license="本项目原创生成；非第三方下载包许可", public_repository="本项目原创建材，进入专用源码分支", modifications="透明阈值规范化、完整轮廓分帧、显式像素采样；未超分或按帧拉伸", use="单屏动作审核样片")
        with Image.open(file) as im: row["canvas_px"] = f"{im.width}x{im.height}"
        if file.stem in ("hero", "enemies"):
            row.update(effective_body_px="57" if file.stem == "hero" else "56/57", foot_anchor="96x80 frame; (36,68)", animation_coverage="关键姿态已导入；连续补帧与武器一致性仍待整理", frames=24)
        if "/actors-v2/" in rel:
            row.update(official_url="project-original; docs/art/actor-v2-generation.md", version="2026-10-24 source SHA in actor-v2-audit.json", modifications="完整透明轮廓、统一身体参考尺度、从新源分别采样640/960；武器与身体使用共享rig锚点；未画人物补丁", use="盐蚀铜版遭遇试玩候选", foot_anchor="逐帧rect/anchor/weapon.hand见actors-v2/manifest.json")
            for actor, variants in actor_v2["actors"].items():
                for size, variant in variants.items():
                    if "public" + variant["image"] == rel:
                        actions = variant["actions"]
                        row.update(effective_body_px="70" if size == "640" else "105", animation_coverage="; ".join(f"{name}:{len(clip['frames'])}" for name, clip in actions.items()), frames=len({frame["id"] for clip in actions.values() for frame in clip["frames"]}))
        elif "/ship-v2/" in rel:
            row.update(official_url="project-original; docs/art/SHIP_V2_GENERATION.md", version="2026-10-24 source SHA in ship-v2-import.json", modifications="分层透明裁取与明确尺寸采样；两个分辨率各自从原始新源取样", use="盐蚀铜版遭遇场景层；碰撞尺寸另有明确逻辑记录")
        elif "/actors/" in rel or "/scene/" in rel or "/environment/" in rel:
            row["status"] = "旧动作审核基线；保留历史来源"
    rows.append(row)
with (DOCS / "ASSET_MANIFEST.csv").open("w", encoding="utf-8-sig", newline="") as stream:
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader(); writer.writerows(rows)
print(f"Manifest: {len(rows)} entries; all runtime SHA256 measured")
