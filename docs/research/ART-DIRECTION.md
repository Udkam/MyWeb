# 苔光来信：美术定案

核查与定案日期：2026-10-13。方案阶段实际读取 **20 个官方素材页、12 个作者或来源组**，检查了 3 个免费原包与 4 组插画样本，并在浏览器里比较原图、原始动作帧和完整试景。素材页浏览与下载不等同于完成音乐主观试听。

| 方向 | 实际候选 | 采用判断 |
| --- | --- | --- |
| 简洁像素营地 | Kenney Tiny Town / Farm / Dungeon；同作者 UI 与音效 | 16px 图块清楚，CC0，体积小；首轮试景中的动物表现与庭院层次较弱，未作为最终场景。 |
| 手绘动物与插画收藏 | schwarnhild、Kitbitz、RGS_Dev、Sprout Lands 等 | 木屋与羊的手绘氛围柔软，但已下载的羊包物种较少、有原素材再分发限制；Kitbitz 是静态插画，需要重新统一视角。部分其他包免费版仅限非商业或需购买，未纳入发行。 |
| 丰富像素自然与访客 | Ninja Adventure、0x72 Dungeon Tileset II、其他 RPG 环境 | 最终选 Ninja Adventure。六种真实动物、房屋、草地水岸、树木、庭院陈设及作者音频能够来自同一包，避免混用不同透视和像素尺度；0x72 更偏地牢，不适合当前送信与小屋生活。 |

最终采用 [Pixel-boy 与 AAA 的 Ninja Adventure](https://pixel-boy.itch.io/ninja-adventure-asset-pack)。选择依据是实际下载包的完整性、CC0 原始许可与已完成的庭院试景。移除武器、忍者面具、战斗 UI 等题材元素，保留温暖的小屋、林边溪水和动物。三种气氛使用包内现成常绿树、粉花树和柳树，不重绘或生成素材。

发行只保留 **12 张原 PNG，共 176,042 bytes**：5 张环境与陈设图集、1 张水纹动画、猫／狗／青蛙／鸡／猪／浣熊各 1 张。六种动物原表均为 32×16，只有两格 16×16 姿态；不将它们描述为四向行走或完整行为动画。庭院八个放置点与十二种陈设均有精确原图裁切记录，奖励只有在存档实际摆放后才出现。

声音选用同包原曲 `5 - Peaceful.ogg` 和 `Menu/Move2.wav`、`Menu/Accept5.wav`。音乐默认关闭，由玩家主动开启；本次素材定案只确认文件与许可，主观音量、循环接缝及浏览器播放由成品验收继续检查。

原始路径、许可、尺寸与 **SHA-256** 见 [ASSET-CREDITS.md](../../ASSET-CREDITS.md)，完整 CC0 许可保留在 `src/assets/art/LICENSE-Ninja-Adventure.txt`，精确图片与裁切矩形见 `src/assets/asset-map.json`。运行时通过同源相对 URL 加载。作者约 94 MB 全集、未采用的手绘包和其他候选留在本地研究区，不随正式站发布。

本地完整候选记录为 `E:\Proj\Active\personal-web\.playwright-mcp\game-research\asset-directions.md` 与同名 JSON；其中 A01–A20 保存每页地址、许可证据、下载状态和验证深度。参考原始作者页包括 [Kenney Tiny Town](https://kenney.nl/assets/tiny-town)、[schwarnhild 手绘包](https://schwarnhild.itch.io/basic-hand-drawn-tileset-and-asset-pack)、[Kitbitz](https://kitbitz.art/) 和 [0x72 Dungeon Tileset II](https://0x72.itch.io/dungeontileset-ii)。

正式 Canvas 场景已在真实 Chromium 的 320、390、1440 视口检查，覆盖三种庭院主题、六位伙伴与三张路线图；裁切边界、八个布置坐标、关闭动态／减少动态效果与 864×864 无选择框照片导出有独立检查记录。这里的结论针对素材和场景，完整游戏流程与公开部署另行验收。
