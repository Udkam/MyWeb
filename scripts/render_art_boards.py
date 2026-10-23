"""Compose two actual-asset harbor candidates without modifying source assets.

Run from the checkout root: python scripts/render_art_boards.py
Pillow composition only. Outputs remain under ignored .local/art/.
These are static material boards, not game screenshots or approved artwork.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
TH = ROOT / ".local/assets/extracted/treasure-hunters/Treasure Hunters"
PUBLIC = ROOT / "public/assets"
OUT = ROOT / ".local/art"
NEAREST = Image.Resampling.NEAREST
FONT = "C:/Windows/Fonts/msyh.ttc"


def font(size):
    return ImageFont.truetype(FONT, size)


def image(path):
    return Image.open(path).convert("RGBA")


def overlay(target, sprite, xy):
    target.alpha_composite(sprite, (round(xy[0]), round(xy[1])))


def placed_at_foot(target, sprite, x, y, anchor, flip=False):
    if flip:
        sprite = ImageOps.mirror(sprite)
        anchor = (sprite.width - anchor[0], anchor[1])
    overlay(target, sprite, (x - anchor[0], y - anchor[1]))


def floor_object(target, sprite, x, y):
    box = sprite.getchannel("A").getbbox()
    placed_at_foot(target, sprite, x, y, ((box[0] + box[2]) / 2, box[3]))


def actor_frame(filename, index):
    atlas = image(PUBLIC / "actors" / filename)
    x, y = (index % 6) * 96, (index // 6) * 80
    return atlas.crop((x, y, x + 96, y + 80))


def hud(scene, candidate):
    panel = Image.new("RGBA", scene.size)
    d = ImageDraw.Draw(panel)
    d.rounded_rectangle((12, 10, 225, 60), 4, fill=(13, 27, 38, 218), outline=(222, 188, 112, 200))
    d.text((21, 15), "CUTLASS WAKE", font=font(14), fill="#fff0cc")
    d.text((21, 38), "生命 5 / 5   ·   港口动作试验", font=font(11), fill="#eff5ed")
    d.rounded_rectangle((431, 13, 628, 43), 3, fill=(13, 27, 38, 210))
    d.text((441, 22), f"方案 {candidate} · 静态素材组合", font=font(11), fill="#f9e4bb")
    d.rounded_rectangle((12, 321, 628, 349), 4, fill=(13, 27, 38, 225), outline=(200, 174, 113, 160))
    d.text((22, 329), "移动 A/D   跳跃 空格   攻击 J   招架 K   夺势 方向＋J   暂停 Esc", font=font(11), fill="#fff0d1")
    scene.alpha_composite(panel)


def scene_a():
    # All scene pixels below come from the one Pixel Frog pack, at native scale.
    sky = image(TH / "Palm Tree Island/Sprites/Background/Additional Sky.png")
    water = image(TH / "Palm Tree Island/Sprites/Background/Additional Water.png")
    scene = Image.new("RGBA", (640, 360))
    for y in range(0, 360, 32):
        for x in range(0, 640, 32):
            overlay(scene, sky if y < 192 else water, (x, y))
    horizon = image(TH / "Palm Tree Island/Sprites/Background/BG Image.png")
    for x in (0, 384):
        overlay(scene, horizon, (x, 118))
    # Tight individual cloud sprites avoid treating the large cloud-band's
    # rectangular lower edge as a floating standalone cloud.
    for i, (x, y) in enumerate(((72, 54), (265, 34), (466, 71))):
        cloud = image(TH / f"Palm Tree Island/Sprites/Background/Small Cloud {i+1}.png")
        overlay(scene, cloud, (x, y))
    hull = image(TH / "Merchant Ship/Sprites/Ship/Ship/Idle/1.png")
    sail = image(TH / "Merchant Ship/Sprites/Ship/Sail/No Wind/1.png")
    for x in (175, 365):
        overlay(scene, hull, (x, 204))
        overlay(scene, sail, (x + 27, 157))
    reflect = image(TH / "Palm Tree Island/Sprites/Background/Water Reflect Big 01.png")
    for x in (34, 245, 450):
        overlay(scene, reflect, (x, 234))
    terrain = image(TH / "Pirate Ship/Sprites/Tilesets/Terrain and Back Wall (32x32).png")
    dock_top = terrain.crop((64, 32, 96, 64))
    pier = terrain.crop((32, 64, 64, 96))
    for x in range(0, 640, 32):
        overlay(scene, dock_top, (x, 255))
    for x in (32, 160, 288, 416, 576):
        for y in (287, 319):
            overlay(scene, pier, (x, y))
    # The same object/actor foot positions as candidate B.
    platform_atlas = image(TH / "Pirate Ship/Sprites/Tilesets/Platforms (32x32).png")
    platform = platform_atlas.crop((32, 64, 144, 80))
    overlay(scene, platform, (440, 206))  # first visible row is y=207
    flag = image(TH / "Palm Tree Island/Sprites/Objects/Flag/Flag 01.png")
    overlay(scene, flag, (25, 162))
    barrel = image(TH / "Merchant Ship/Sprites/Barrel/Idle/1.png")
    crate = image(TH / "Merchant Ship/Sprites/Box/Idle/1.png")
    floor_object(scene, barrel, 197, 255)
    floor_object(scene, crate, 355, 255)
    hero = image(TH / "Captain Clown Nose/Sprites/Captain Clown Nose/Captain Clown Nose with Sword/09-Idle Sword/Idle Sword 01.png")
    melee = image(TH / "The Crusty Crew/Sprites/Fierce Tooth/01-Idle/Idle 01.png")
    remote = image(TH / "Shooter Traps/Sprites/Seashell/Seashell Idle/1.png")
    placed_at_foot(scene, hero, 86, 255, (32, 32))
    placed_at_foot(scene, melee, 284, 255, (17, 28), True)
    placed_at_foot(scene, remote, 492, 207, (25, 38), True)
    cannon = image(TH / "Shooter Traps/Sprites/Cannon/Cannon Idle/1.png")
    floor_object(scene, cannon, 592, 255)
    hud(scene, "A")
    return scene, [hero, ImageOps.mirror(melee), ImageOps.mirror(remote)], ["主角 25–28px", "近战 21–23px", "贝壳炮台 21px"]


def scene_b():
    env = PUBLIC / "environment"
    scene = image(env / "harbor.png")
    if scene.size != (640, 360):
        raise ValueError("Expected native 640x360 harbor source")
    overlay(scene, image(env / "platform.png"), (440, 207))
    floor_object(scene, image(env / "barrel.png"), 197, 255)
    floor_object(scene, image(env / "crate.png"), 355, 255)
    hero, melee, remote = actor_frame("hero.png", 0), actor_frame("enemies.png", 0), actor_frame("enemies.png", 12)
    placed_at_foot(scene, hero, 86, 255, (36, 68))
    placed_at_foot(scene, melee, 284, 255, (36, 68), True)
    placed_at_foot(scene, remote, 492, 207, (36, 68), True)
    floor_object(scene, image(env / "cannon-idle.png"), 592, 255)
    hud(scene, "B")
    return scene, [hero, ImageOps.mirror(melee), ImageOps.mirror(remote)], ["主角 57px", "近战 56px", "火枪手 57px"]


def wrapped(draw, text, xy, width, size=21, color="#dce9ec", spacing=10):
    current, lines = "", []
    selected_font = font(size)
    for ch in text:
        if ch == "\n":
            lines.append(current)
            current = ""
        elif draw.textlength(current + ch, font=selected_font) > width and ch not in "。，、；：！？":
            lines.append(current)
            current = ch
        else:
            current += ch
    if current:
        lines.append(current)
    for i, line in enumerate(lines):
        draw.text((xy[0], xy[1] + i*(size + spacing)), line, font=selected_font, fill=color)
    return xy[1] + len(lines)*(size + spacing)


def board(key, scene, actors, labels):
    canvas = Image.new("RGBA", (1600, 1100), "#122431")
    d = ImageDraw.Draw(canvas)
    title = "A · 统一免费官方素材" if key == "a" else "B · 本轮原创导入候选"
    d.text((40, 18), f"CUTLASS WAKE  /  {title}", font=font(34), fill="#f9edd4")
    d.text((40, 66), "同港口构图的真实素材拼板 · 静态组合，非实机录像 · 640×360 逻辑画面", font=font(21), fill="#bcd2da")
    overlay(canvas, scene.resize((1280, 720), NEAREST), (40, 110))
    d.rectangle((39, 109, 1320, 830), outline="#6e8792", width=1)
    d.text((1350, 113), "场景显示 2×", font=font(23), fill="#f0ce88")
    wrapped(d, "最近邻放大仅便于审阅，不新增原生细节。", (1350, 156), 208, 21)
    d.line((1350, 270, 1558, 270), fill="#546e7d")
    y = wrapped(d, "固定构图\n主角 x86\n近战 x284\n远程 x492\n高台 y207\n地面 y255\n火炮 x592", (1350, 293), 210, 21)
    d.line((1350, y+8, 1558, y+8), fill="#546e7d")
    if key == "a":
        wrapped(d, "统一体系，但角色细节低于目标。远程为贝壳炮台，不是人类火枪手。", (1350, y+30), 208, 21, "#f1d3a0")
    else:
        wrapped(d, "原生体量提高，但动作一致性与补帧仍待检查。未获用户美术认可。", (1350, y+30), 208, 21, "#f1d3a0")
    d.rounded_rectangle((40, 861, 563, 1061), 5, fill="#243c49", outline="#58717e")
    d.text((58, 875), "人物 1× 原生导入像素 / 不缩放", font=font(22), fill="#e5eee9")
    for i, (actor, label) in enumerate(zip(actors, labels)):
        x = 75 + i*163
        box = actor.getchannel("A").getbbox()
        # Show each canvas unscaled, with the visible lowest row aligned.
        overlay(canvas, actor, (x, 995 - box[3]))
        d.text((x-3, 1013), label, font=font(17), fill="#f5ddab")
    d.line((58, 995, 545, 995), fill="#69978f")
    if key == "a":
        heading = "Pixel Frog / Treasure Hunters · CC0"
        note = "同套角色、船、天空、云、水面、地形与炮台；没有混入 B 环境。缺人类敌人、防御、招架、夺势推击和专用闪避。主角有效身体只有 25–28 原生像素；不能以放大代替细节。"
        source = "来源：pixelfrog-assets.itch.io/treasure-hunters · 实际文件已验包 / SHA256 已记录"
    else:
        heading = "本轮生成原始资源 → 严格分帧与技术导入"
        note = "实际 harbor / actors / environment 资源同框。主角、近战、火枪手待机有效高度为 57 / 56 / 57px。武器长度、接地姿态与连续动作仍有缺口；当前不是严格有限色板，尚需补帧与实机检查。"
        source = "来源：本次原始生成文件与导入脚本 · 不以拼板完成替代运行验收或用户审核"
    d.text((590, 865), heading, font=font(23), fill="#f0ce88")
    wrapped(d, note, (590, 906), 955, 21, "#d2e2e6", 11)
    d.text((40, 1071), source, font=font(18), fill="#b4cbd3")
    canvas.convert("RGB").save(OUT / f"art-board-{key}.png")
    scene.convert("RGB").save(OUT / f"scene-{key}-native.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for key, build in (("a", scene_a), ("b", scene_b)):
        scene, actors, labels = build()
        board(key, scene, actors, labels)
        print(f"{key}: scene 640x360; board 1600x1100; source pixels unchanged")


if __name__ == "__main__":
    main()
