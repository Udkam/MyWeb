# 三条小游戏美术方向的素材可行性比较

核查日期：2026-10-13。实际读取 **20 个官方素材页 / 12 个作者或来源组**，不把搜索结果计作访问。另下载 **3 个免费原包 + 4 个 Kitbitz 原始 SVG/PNG 样本**。没有购买、部署、生成或重绘美术。

本轮按用户最新要求停在方案比较；先前 `scene.js` 是 Kenney 试组草稿，未通过场景验收，不代表已定方案。

## 先看原始素材对比板

[打开可播放原帧、可试听音乐的本地对比板](asset-board.html) · [浏览器截图](asset-board.png)

已在真实 Chromium 打开：12 张预览图加载成功，原始人物待机动画前后帧不同。音乐仅提供原文件播放器，**没有宣称完成主观试听**。对比板不是游戏效果承诺。

## 三方向比较

| 方向 | 最适合的体验 | 成套能力 | 核心缺口 |
| --- | --- | --- | --- |
| A 极简像素营地 | 一眼看懂的小庭院、布置与短途 | 环境、静态人/动物、外部 UI 与音效可齐；核心 CC0 | 动作与人物个性较弱，容易看起来像模板 |
| B 手绘动物庭院 | 绵羊陪伴、安静观察、少量关系深化 | 手绘木屋、树木、水、羊动作已齐 | 只有一种动物；UI/音频需找；许可禁止原素材再分发 |
| B2 插画收藏册 | 地图点选、收集、场景故事 | Kitbitz 2,043 素材 / 13 主题，CC0 | 缺精灵动画，视角和风格需筛选 |
| C 丰富像素访客庭院 | 访客收集、装饰、小段探索，不必战斗 | Ninja Adventure 人物、环境、界面、音频同包最齐，CC0 | 需剔除忍者/武器符号，动物动作少于人形 |

目前 **C 的素材完整性最强**，但这只是可实施性判断，不能替代用户对画风与游戏循环的选择。A 清楚却较普通，B 更柔软但扩展角色有成本；不建议先承诺大量动物再补画风。

## Ninja Adventure：是否能做非忍者的森林访客

可以作为有证据的候选。原包实际有普通 Boy、ManGreen、老人与商人类角色，也有 MaskFrog、MaskRacoon 等面具角色；猫、狗、青蛙、浣熊可形成庭院生物。森林、房屋、露营器具、食物和木质界面不要求使用忍者叙事。仍需要一张完整试景验证协调感。

- 实包检查：92 个人物目录、26 个动物目录、23 张背景 PNG、361 个 UI 文件；这些是文件/目录数量，不代表每个都是独立玩法角色或组件。
- Boy、ManGreen、MaskRacoon 的人物总表为 64×112；行走表 64×64，按 16×16 格可读取四向四帧；待机表 64×16。对比板已播放 Boy、MaskFrog、MaskRacoon 原始待机帧。
- Cat、Dog、Frog、Racoon 表为 32×16，只有两个格，不能宣称都有完整四向动画。
- 41 个 OGG 配乐文件、147 个 WAV 音效。与网页旧介绍的 37 首不同，报告以当前实包清单为准；曲目含 Calm Village、Peaceful、Quiet、Chill、Village 等，但尚未主观试听。
- `README.md` 明确所有包内资产可用于个人游戏和商业游戏，CC0；保留原 `LICENSE.txt`。原 ZIP 约 94 MB，只是作者全集，最终网页必须挑选子集，不能整包加载。

## 下载与许可证据

- **Ninja Adventure - Asset Pack.zip**：94,022,790 bytes；2674 个归档条目；SHA-256 `95a06f4fdcfd1882f061a45ff313b7c905dbe2de1e8512b281d7937df62a7b15`。
  本地：`E:\Proj\Active\personal-web\.playwright-mcp\game-assets\candidates\ninja-adventure`。作者描述在 `AUTHOR-PAGE.txt`，原包在 `original/`，完整文件清单在 `download-manifest.json`。
- **Basic_Hand-Drawn_Asset_Pack_V0.1.zip**：403,012 bytes；29 个归档条目；SHA-256 `12f85963cbade0394fac3f3681a35c99b21f27b2612e834baaec2761b9b46ad5`。
  本地：`E:\Proj\Active\personal-web\.playwright-mcp\game-assets\candidates\handdrawn-countryside`。作者描述在 `AUTHOR-PAGE.txt`，原包在 `original/`，完整文件清单在 `download-manifest.json`。
- **0x72_DungeonTilesetII_v1.7.zip**：416,379 bytes；754 个归档条目；SHA-256 `a5b23341ebc831d7798bfb9666d864a08c079bb7aed18e3cf023a27d517c1512`。
  本地：`E:\Proj\Active\personal-web\.playwright-mcp\game-assets\candidates\dungeon-ii`。作者描述在 `AUTHOR-PAGE.txt`，原包在 `original/`，完整文件清单在 `download-manifest.json`。

Kitbitz 额外保留四个 SVG/PNG 原始样本及官方目录条目：栗树、马、牛、帐篷。原站和官方目录都声明 CC0。实际看图后，它更像圆润插画陈列，而非小像素角色运动，适合收藏册，不建议直接混入 Ninja 的 16px 世界。

schwarnhild 原包 `Info_and_License.txt` 允许商业/非商业项目、请求署名、禁止素材再分发。网页正文“欣赏署名”与作者评论/原包“请署名”略有差异，采用较严格署名。**当前仅本地研究，不把原包放进公开仓库；若最终采用，需要明确发行作品与公开原素材的边界。默认优先 CC0 候选。**

## 20 个实际读取的候选页

每项都实际读取作者或作者上传页面；“未下载”不等于已验证能直接安装或使用。免费/价格状态仅为访问日观察。

### A01 · Tiny Town — Kenney

来源：[Tiny Town](https://kenney.nl/assets/tiny-town)

- 内容 / 尺寸：住宅、路面、树木、村落道具；130 个文件；16×16。
- 许可 / 署名：CC0；商用：允许；署名：不要求。
- 获取：免费直链，捐赠可跳过；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：已下载原图并视觉查看。
- 缺口：人物动画、长线建筑变化不足。

### A02 · Tiny Farm — Kenney

来源：[Tiny Farm](https://kenney.nl/assets/tiny-farm)

- 内容 / 尺寸：作物、农田、动物、农舍；130 个文件；16×16。
- 许可 / 署名：CC0；商用：允许；署名：不要求。
- 获取：免费直链，捐赠可跳过；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：已下载原图并视觉查看。
- 缺口：作物状态丰富度有限，无成套声音。

### A03 · Tiny Dungeon — Kenney

来源：[Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon)

- 内容 / 尺寸：地牢、英雄、怪物与物品；130 个文件；16×16。
- 许可 / 署名：CC0；商用：允许；署名：不要求。
- 获取：免费直链，捐赠可跳过；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：已下载原图并视觉查看。
- 缺口：角色主要为静态，小型表情与行为不足。

### A04 · UI Pack Pixel Adventure — Kenney

来源：[UI Pack Pixel Adventure](https://kenney.nl/assets/ui-pack-pixel-adventure)

- 内容 / 尺寸：500 个按钮、面板、滑块类 UI 元素；像素 UI，网页未写统一尺寸。
- 许可 / 署名：CC0；商用：允许；署名：不要求。
- 获取：免费直链，捐赠可跳过；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者页实际读取，未下载。
- 缺口：只解决 UI；需与游戏像素尺寸对齐。

### A05 · Interface Sounds — Kenney

来源：[Interface Sounds](https://kenney.nl/assets/interface-sounds)

- 内容 / 尺寸：100 个按钮、点击、界面反馈音效；音频，无图像尺寸。
- 许可 / 署名：CC0；商用：允许；署名：不要求。
- 获取：免费直链，捐赠可跳过；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者页实际读取；本项目原先已有选用文件。
- 缺口：不是自然环境声或背景音乐。

### A06 · Music Jingles — Kenney

来源：[Music Jingles](https://kenney.nl/assets/music-jingles)

- 内容 / 尺寸：85 个音乐短句；短音频，无图像尺寸。
- 许可 / 署名：CC0；商用：允许；署名：不要求。
- 获取：免费直链，捐赠可跳过；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者页实际读取，未下载或试听。
- 缺口：短句适合奖励，不能直接当完整循环背景曲。

### A07 · UI Pack Adventure — Kenney

来源：[UI Pack Adventure](https://kenney.nl/assets/ui-pack-adventure)

- 内容 / 尺寸：130 个非像素按钮、面板、滑块组件；网页未给统一尺寸。
- 许可 / 署名：CC0；商用：允许；署名：不要求。
- 获取：免费直链，捐赠可跳过；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者页实际读取，未下载。
- 缺口：仅界面；与手绘羊/树的画法需做混搭验证。

### A08 · Animal Pack — Kenney

来源：[Animal Pack](https://kenney.nl/assets/animal-pack)

- 内容 / 尺寸：80 个动物图形文件；网页未给统一尺寸。
- 许可 / 署名：CC0；商用：允许；署名：不要求。
- 获取：免费直链，捐赠可跳过；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者页实际读取，未下载。
- 缺口：更偏图标/拼图，不能当成已验证的四向动物动画。

### A09 · Dungeon Tileset II — 0x72

来源：[Dungeon Tileset II](https://0x72.itch.io/dungeontileset-ii)

- 内容 / 尺寸：环境、武器、多个待机/跑步角色；原包 745 PNG；16×16 基础；部分角色 32×36；总图 512×512。
- 许可 / 署名：CC0（作者页）；原包 README 描述地块拼接；商用：允许；署名：不要求。
- 获取：itch.io 自定价格免费入口；原 ZIP 416,379 B；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：原 ZIP 下载、文件核对、精灵总图实际查看。
- 缺口：偏阴暗地牢；角色缺完整攻击/死亡动作，不含养成家园/UI/音乐全套。

### A10 · Ninja Adventure — Pixel-boy & AAA

来源：[Ninja Adventure](https://pixel-boy.itch.io/ninja-adventure-asset-pack)

- 内容 / 尺寸：人物、动物、怪物、自然/房屋/露营、物品、FX、UI、音乐音效；16×16 基础；人物 SpriteSheet 64×112、Walk 64×64；头像 38×38。
- 许可 / 署名：CC0，原包 LICENSE.txt + README.md 双重确认；商用：允许；署名：不要求，建议保留作者致谢。
- 获取：itch.io 自定价格免费入口；原 ZIP 94,022,790 B；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：原 ZIP 下载；角色、自然、露营、UI 看图；原帧播放；音频清单核对。
- 缺口：需筛掉武器/忍者符号；动物通常只有 2 帧；不应发送整包到浏览器。

### A11 · Farm Valley / Cozy Farm RPG Hand Drawn — AngeloDev

来源：[Farm Valley / Cozy Farm RPG Hand Drawn](https://angelodev.itch.io/cozy-farm-rpg-hand-drawn-pack)

- 内容 / 尺寸：房屋、植物、UI、牛动画；角色部分仍在制作；作者页未给统一地块尺寸。
- 许可 / 署名：免费版仅非商业；Premium 商用许可；商用：仅付费 Premium 明确允许商业；署名：以对应购买版本许可为准。
- 获取：免费基础版；Premium 最低 $2.99（访问日价格）；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者页实际读取，未购买/未下载。
- 缺口：免费版商业限制，且角色动画 WIP；不纳入当前默认可发行素材。

### A12 · Sprout Lands — Cup Nooble

来源：[Sprout Lands](https://cupnooble.itch.io/sprout-lands-asset-pack)

- 内容 / 尺寸：柔和田园、基本人物；完整版含更多动物与动作；小尺寸像素风；网页描述 16-bit，未据此假定每格尺寸。
- 许可 / 署名：免费版仅非商业；Premium 商用，禁止素材再分发；商用：仅付费 Premium 明确允许商业；署名：要求 Cup Nooble 署名。
- 获取：免费基础版；Premium 最低 $3.99（访问日价格）；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者页实际读取，未购买/未下载。
- 缺口：柔和画风值得参考；免费版不满足未来商业弹性。

### A13 · Kitbitz — Kitbitz / credited illustrators

来源：[Kitbitz](https://kitbitz.art/)

- 内容 / 尺寸：官方目录 2,043 个素材、13 主题；自然、中世纪、室内等；SVG；PNG 1×/2×/3×；栗树样本 1026×1384，马 474×1040。
- 许可 / 署名：CC0，官网元数据与官方 catalog.v1.json 一致；商用：允许；署名：不要求，可保留来源。
- 获取：官方公开目录直接下载 SVG/PNG，无登录；下载四组样本；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：官网 HTML 与官方 JSON 实读；四个原始 PNG/SVG 下载；实际看图。
- 缺口：并非动画包；不同主题比例与画风有差异；适合点选地图/收藏，不适合直接自由行走。

### A14 · Hand-Drawn Square Characters Animated 8 Directions — RGS_Dev

来源：[Hand-Drawn Square Characters Animated 8 Directions](https://rgsdev.itch.io/hand-drawn-square-characters-animated-8-directions-top-down-free-cc0)

- 内容 / 尺寸：基础人、英雄、骷髅、怪物；待机/行走/跳跃/死亡 FX；128×128、8 方向、独立帧和 SpriteSheet。
- 许可 / 署名：CC0，作者页明确；商用：允许；署名：不要求。
- 获取：itch.io 自定价格，免费 ZIP 约 3 MB；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者页实际读取，未下载。
- 缺口：仅 4 类角色；与柔软水彩式手绘环境可能不协调。

### A15 · Tiny Characters Animals Pack — RGS_Dev

来源：[Tiny Characters Animals Pack](https://rgsdev.itch.io/tiny-characters-animals-pack-hand-drawn-top-down-8-directions)

- 内容 / 尺寸：狗、猫、猪、牛、鸡；待机/行走/跳跃/死亡 FX；128×128、8 方向。
- 许可 / 署名：商业项目可用、可修改；不可独立再分发/转售；商用：购买后允许；署名：不要求。
- 获取：需购买；访问日 $1.50 促销，原价 $5；未购买；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者页实际读取，未下载。
- 缺口：非免费；不能作为无需购买即可实施的备选资源。

### A16 · Cozy Puzzle In-Game 3 — MintoDog

来源：[Cozy Puzzle In-Game 3](https://opengameart.org/content/cozy-puzzle-in-game-3)

- 内容 / 尺寸：作者标为可循环的温馨解谜音乐，木槌/管乐/木吉他/贝斯标签；MP3 约 5 MB、OGG 约 4.4 MB。
- 许可 / 署名：CC0；商用：允许；署名：不要求。
- 获取：OpenGameArt 公开文件直链；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者上传页实际读取，未下载/未试听。
- 缺口：风格适配与循环接缝未试听验证。

### A17 · cozy asset pack 1.0 — IshtartPixels

来源：[cozy asset pack 1.0](https://opengameart.org/content/cozy-asset-pack-10)

- 内容 / 尺寸：130+ 暖色地块、小角色；含 Aseprite 源文件；16×16。
- 许可 / 署名：CC0；作者回复确认已更正旧页面标注；商用：允许；署名：不要求，欣赏署名。
- 获取：OpenGameArt 公开 ZIP，约 169 KB；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者上传页实际读取，未下载。
- 缺口：体量较小，尚未核实角色动作及长期建筑升级层次。

### A18 · Free music pack — Hellper

来源：[Free music pack](https://hellper.itch.io/free-music-pack)

- 内容 / 尺寸：约 70 首创作者项目/游戏活动音乐和少量声音；含 MIDI 压缩包及 mega_pack；网页未列全部格式。
- 许可 / 署名：CC0；商用：允许；署名：不要求。
- 获取：公开 Download；MIDI 包约 45 KB；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者页实际读取，未下载/未试听。
- 缺口：题材跨度较大，不能只凭曲目数量判定温馨适配。

### A19 · Basic Hand-Drawn Tileset and Asset Pack — schwarnhild

来源：[Basic Hand-Drawn Tileset and Asset Pack](https://schwarnhild.itch.io/basic-hand-drawn-tileset-and-asset-pack)

- 内容 / 尺寸：草/丘陵/水/土地/房屋/栅栏/树石；绵羊待机行走吃草；128×128 网格；24 张 PNG；羊行走图 640×256。
- 许可 / 署名：允许商业/非商业项目；禁止素材单独再分发；原包请求署名；商用：允许用于项目；公开源码/整包再分发不获许可；署名：保守按原包与作者评论署名。
- 获取：itch.io 自定价格免费入口；原 ZIP 403,012 B；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：原包下载；许可原文、树石/房屋/羊动作表实际查看。
- 缺口：动物仅羊、无 UI/音频；资源再分发限制，当前只本地方案评估，未用于发布。

### A20 · Epic RPG World — Free Demo Ancient Ruins — RafaelMatos

来源：[Epic RPG World — Free Demo Ancient Ruins](https://rafaelmatos.itch.io/epic-rpg-world-pack-free-demo-ancient-ruins-asset-tileset)

- 内容 / 尺寸：遗迹环境、道具和示例 NPC；Tiled 自动地块；32×32，免费 Demo ZIP 约 633 KB。
- 许可 / 署名：免费商业项目可用；不可重新打包/分发/转售素材，禁止 NFT/AI 训练；商用：允许用于项目；署名：不要求，欣赏署名。
- 获取：公开免费 Demo 下载；不需要 API Key。付费项目未购买，不按已获得处理。
- 核验深度：作者页实际读取，未下载。
- 缺口：页面多数大图展示完整版，不能当免费包实有；环境精细但角色/UI/养成不成套。

## 下一步应先验证的方案问题

1. 玩家回来是为了看到访客、扩建庭院，还是完成一段探索？三者可以有关联，但先选一个核心回访理由。
2. 用现成素材做两张完整局部试景，而不是直接扩写系统：C 的森林访客庭院、B 的绵羊小屋；每张只放少量有动静层次的对象。
3. 若选择 C，检验同一套里的建筑升级与新访客是否足以带来成长感；不要以更长倒计时替代变化。
4. 音乐先试听 3–5 首，选择一首低存在感庭院曲和一首旅途曲；界面反馈不应过密。
5. 维持随时退出、存档可导出、离线不惩罚；内容量与素材数量分开估算。

## 文件和清理边界

本目录对比板、报告、许可、原始包与必要截图保留供选型验收。临时网页抓取含会话字段的 HTML 将删除；下载脚本保留为可复现证据。没有新增外部常驻服务；预览浏览器已关闭。
