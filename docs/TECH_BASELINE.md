# Cutlass Wake 技术准备记录

核验日期：2026-10-24（北京时间）。本记录只覆盖版本、工具与早期动作样片的技术准备；没有安装依赖、启动开发服务、修改旧项目或做全量章节。素材拼板和真实动作样片仍需用户审核。

## 1. 明确版本边界

建议第一版采用以下精确版本，后续生成并提交 `package-lock.json`，安装用 `npm ci`，构建用 `npm run build`，输出 `dist`：

| 包 | 建议版本 | 已核验依据与限制 |
| --- | --- | --- |
| `phaser` | `3.90.0` | 官方 v3 标签源码与自带 `types/phaser.d.ts` 可用。当前 Phaser 已有 v4；本项目若采用 v3，代码、示例和文档均固定 v3.90.0，不用 `latest` 混入 v4 API。 |
| `vite` | `7.3.7` | npm registry 已确认版本及 Node engines；官方当前仍向 7.3 回补重要修复和安全修复。选择明确支持的旧主版本以限制初期变量。 |
| `typescript` | `5.9.3` | npm registry 已确认该版本。显式选择此版本，避免当前 `latest` 跨主版本；这是待实际项目 `tsc --noEmit` 与构建确认的组合，不声称已经集成通过。 |

本机 Node `24.12.0` 满足 Vite 7.3.7 的 `^20.19.0 || >=22.12.0`。Vercel 后续需核对实际 Node 版本、生产分支 `codex/cutlass-wake`、仓库根构建目录和项目级分支构建过滤，不能由本地工具版本推定云端设置已正确。

官方来源：[Phaser v3.90.0 源码](https://github.com/phaserjs/phaser/tree/v3.90.0)、[Vite 维护版本](https://vite.dev/releases)、[Vite 7 文档](https://v7.vite.dev/guide/)、[TypeScript 5.9 文档](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)。精确版本通过 `npm view <package>@<version> version engines --json` 查询，尚未安装。

## 2. 本机可用工具与检查范围

| 工具 | 当前核验 | 使用边界 |
| --- | --- | --- |
| Node | `24.12.0`，`E:\Nodejs\node.exe` | 已执行版本查询。 |
| npm | `11.6.2`，`E:\Nodejs\npm.ps1` | 已执行版本与 registry 查询。 |
| Python | `3.12.0`，`C:\Python\Python312\python.exe` | 已执行版本查询。 |
| Pillow | `12.2.0` | 已实际导入，可做原生帧检查、alpha 包围盒、脚底锚点测量和素材拼板；最近邻放大仅用于说明显示倍率，不冒充原生细节。 |
| FFmpeg | `N-125875-g5d4d3bdc61-20260731` | 已执行 `ffmpeg -version`；包含 libx264、libvpx、libopus、libmp3lame。可用于录屏编码与检查，尚未制作游戏录像。 |
| Python Playwright | 已实际 headless 启动并关闭 Chromium `149.0.7827.55` | 只导航 `about:blank`，尚未证明游戏/WebGL/手机触控行为。 |
| Node Playwright | 技能附带 `1.61.1`；已实际 headless 启动并关闭 Chromium `149.0.7827.55` | 可直接从游戏技能目录执行客户端，工程本身不必为早期测试重复安装。 |
| 浏览器 | Chrome 与 Edge 常规安装位置存在；Playwright Chromium/headless 缓存存在 | Chrome/Edge 只核验文件存在，未实际启动这两者。 |
| Aseprite / LibreSprite | 未在 PATH、常见 Program Files / Local Programs 路径、卸载注册表中检出；Steam 常用目录未找到对应安装 | 没有全盘扫描，因此结论是检查范围内未发现，不能称整台机器绝对没有。没有安装或启动。 |

Node Playwright 依赖目录：`C:\Users\Alex Chen\.codex\skills\develop-web-game\node_modules\playwright`。

现有游戏测试客户端：`C:\Users\Alex Chen\.codex\skills\develop-web-game\scripts\web_game_playwright_client.js`；动作参考：`C:\Users\Alex Chen\.codex\skills\develop-web-game\references\action_payloads.json`。

该客户端直接 `import { chromium } from "playwright"`，由脚本所在技能目录解析依赖。它的内置按键映射目前仅含方向、Enter、Space、A、B；若采用其他战斗按键，应先确认客户端调用如何覆盖，不能假定发送任意键名都有效。可在样片阶段用 A/B 对应攻击/防御，再由专用实际输入测试验证正式键位与触控。

Playwright 浏览器缓存：`C:\Users\Alex Chen\AppData\Local\ms-playwright`，存在 `chromium-1228`、`chromium_headless_shell-1228` 与 `chromium_headless_shell-1243`。实际启动结果比目录存在更有意义；后续继续使用现有环境，失败时读取精确缺失路径再处理，不盲目下载。

## 3. 早期像素显示验证

建议先以制作方案的 `640×360` 逻辑画面做构图实验，但角色原生规格由验包和拼板决定。记录角色画布、alpha 有效高度、脚底锚点、地图格和屏幕显示高度，不能将精灵画布尺寸写成人物身体高度。

Phaser 3.90.0 使用 `pixelArt: true`、`roundPixels: true`，明确关闭平滑采样；相机开启 `roundPixels`。纹理不得做非整数的内部缩放。物理坐标允许小数，只对最终渲染和相机取整，避免把每步物理位置取整造成低速卡顿。来源：[v3.90.0 Config](https://github.com/phaserjs/phaser/blob/v3.90.0/src/core/Config.js)。

全窗口容器使用固定 viewport、`overflow: hidden`，安全区留给中文 HUD 与触控。优先按实际可用空间计算整数像素倍率、居中留边；不要仅设 `FIT` 后就声称整数缩放成立。`autoRound` 只将最终 canvas / CSS 尺寸取整，并不自动使缩放比为整数。来源：[v3.90.0 ScaleManager](https://github.com/phaserjs/phaser/blob/v3.90.0/src/scale/ScaleManager.js)。

在桌面 1920×1080 / DPR=1 时，640×360 可精确放大 3 倍。手机需记录 CSS viewport、DPR、安全区和最终显示矩形；可按设备像素选择整数倍率，再换算为 CSS 尺寸，但小屏仍须实测角色辨识与文字大小。中文 UI 宜用独立屏幕空间文字或 DOM 层，最小可读字号与至少 44px 触控热区不跟随低分辨率世界一并缩小。原生像素被清晰显示不代表素材细节已经足够。

第一段独立验证至少覆盖：静止纹理边缘、左右移动与镜头滚动、斜向绳索、角色脚底、手机旋转/地址栏高度变化、全屏进退。每组都检查 `scrollWidth <= clientWidth` 和 `scrollHeight <= clientHeight`，并实际看截图。

## 4. 固定步进与动画/判定同钟

Phaser 3.90.0 Arcade World 中 `fixedStep: true` 表示固定步进，默认 `fps: 60`；`fixedStep: false` 才随渲染 delta，并禁用 `fps` 与 `timeScale`。Context7 的一条旧 changelog 摘要把含义颠倒，已按版本源码纠正。以 [World.js](https://github.com/phaserjs/phaser/blob/v3.90.0/src/physics/arcade/World.js) 为准。

小型动作样片可选择一个权威的 60Hz 模拟时钟。所有输入缓冲、攻击阶段、招架窗口、夺势有效期、受击无敌、击退与炮弹使用同一时钟；动画帧由动作时间导出，命中窗口和显示帧读取同一份动作定义。10fps 原素材的一帧等于 60Hz 的 6 个 tick；未补绘前不能靠把同一图强行加速就声称多了中间动作。

每个动作定义至少记录帧时长、脚底锚点、武器/枪口点、hurtbox、active hitbox、可取消区间和音效触发 tick。用 `attackId + targetId` 集合保证一次攻击不会因多帧重叠重复伤害；招架、普通格挡和受击按明确优先级结算。跳跃身体碰撞框保持稳定；攻击框与身体框分开。炮弹每步位移过大时要用扫掠/分段碰撞验证薄墙，不能只靠离散 overlap。

`animationupdate` 可辅助触发脚步、核验帧事件与调试，但不宜作为唯一权威战斗钟。官方明确说明低渲染帧率时一帧内可发出多个动画更新事件，只有最后一个实际被绘制；若完全依靠事件开关 hitbox，可能出现画面没有显示接触帧却完成伤害的情况。来源：[v3.90.0 Animation Update Event](https://github.com/phaserjs/phaser/blob/v3.90.0/src/animations/events/ANIMATION_UPDATE_EVENT.js)。

若采用手动 Arcade 更新，明确设置 `customUpdate: true`，避免自动与手动重复前进。`world.step(delta)` 的单位是秒，`world.update(time, delta)` 的 delta 单位是毫秒；还需按官方生命周期处理 `postUpdate`。更稳妥的早期路线是独立纯模拟 + Phaser 渲染，或清楚掌控 Arcade 完整更新序列后再接入，不混用两个时钟。命中停顿时冻结战斗和对应角色动作，同时保留 UI 操作，不让暂停期间角色继续消耗窗口。

暴露 `window.render_game_to_text()` 与 `window.advanceTime(ms)`，后者调用相同固定步进路径，并在测试模式关闭重复 RAF 推进。场景状态需含坐标约定、动作名/帧/tick、HP、招架窗口、夺势状态、敌人职责/前摇、炮弹和碰撞对象。技术验证要检查一次输入只触发一次、30/60/120Hz 表现一致、暂停/重开/切后台不会继续扣血。

## 5. 音乐与关键音效来源候选

以下仅完成作者页面、许可与下载入口研究，没有下载验包或实际试听，没有作最终听感选择。所有候选均无需购买；之后选定、实际试听、检查循环/削波/响度并记录 SHA256 才能纳入资源清单。默认音频应由“开始冒险”等用户手势解锁。

| 音乐 | 作者 / 许可 | 官方来源与可供试听文件 | 建议研究用途 |
| --- | --- | --- | --- |
| Pirate Adventure | Eldritch Grim / CC0 | [作品页](https://opengameart.org/content/pirate-adventure)；`pirate_adventure.wav`，页面列 10.9MB | 作者标注 pirate / adventure / orchestra，作为港口与启航候选；未确认可无缝循环。 |
| Pirate Indenture | Eldritch Grim / CC0 | [作品页](https://opengameart.org/content/pirate-indenture)；`pirate_indenture.wav` 6.7MB，另有 `pirate_indenture_loop.wav` 2.6MB | 与上一首同作者，可先研究统一音乐体系；作者明确有 loop 版本，适合战斗候选。 |
| Video Game Pirate | iamoneabe / CC0 | [作品页](https://opengameart.org/content/video-game-pirate)；`videogamepirate_0.mp3`，另有 WAV | 作者标注 chiptune / electronica / waltz；适合比较像素风音乐方向，未确认与管弦两首听感统一。 |
| Pirate Music | migfus20 / CC-BY 4.0 | [作品页](https://opengameart.org/content/pirate-music)；`mutiny_2_2.mp3` 1.9MB | 作者标注 Action / Dark，可研究船舱压力场景；使用时保留作者、作品名、源链接、许可链接与修改说明。 |

CC0 两首 Eldritch Grim 作品的页面写明不要求署名；仍建议在游戏鸣谢中记录真实作者与来源。其他 CC0 候选也保留来源记录。CC-BY 4.0 必须按许可署名，不能把“可免费下载”等同于无署名义务。

| 音效候选 | 作者 / 许可 | 覆盖与缺口 |
| --- | --- | --- |
| [RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney / CC0；50 files | 作者标签含 weapon / footstep / foley，先验包找刀挥动、甲板脚步和交互；此时未确认具体文件能满足金属招架。 |
| [Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney / CC0；130 files | 身体、金属与木材触感候选，需试听挑出普通挡击、精准招架、受伤与木板破坏的清晰差别。 |
| [Cannon hit cannon](https://opengameart.org/content/cannon-hit-cannon) | Thimras / CC0；`cannon_hit_cannon.ogg` | 作者描述为远船炮击金属的夸张响声，仅作撞击候选，不冒充发炮/炮烟/落水全套。 |

研究中发现 Tiny Naval Battle Sounds Set 页面有历史来源争议和作者替换说明，因此暂不选作本轮首选；发炮与水花仍属需要定向核验的缺口。无需为完成名单而将有疑问来源纳入工程。

## 6. 进入动作样片前的技术门槛

先验真实角色、近战敌人、远程敌人、环境和火炮资源的原生规格与动画覆盖，完成同场景拼板。尚缺招架、夺势推击或受击身体动作时，标为需要补绘；不得用屏幕震动、烟和闪光代替。

样片仅实现足以验证画面的跑跳、普通格挡、精准招架、夺势、炮弹撞击、受伤、死亡和重开。桌面与手机横屏都保留真实操作截图/录像，检查帧与判定同步、脚底稳定、全屏无滚动条和音频手势解锁。用户审阅前可继续验包、锚点检查、导出/缩放/碰撞验证，不扩写完整章节，不将 Goal 标记完成。
