# 方向调研 · 2026-10-22

## 口径

三段调查：参考作品与作者流程 → 可重复玩法与内容结构 → 本地制作／发布可行性。以下12个针对性案例兼有近期 AI 辅助项目与成熟机制参考；不宣称它们全部近期爆红，不以检索数量代替研究质量。

主要证据是官方游戏、原作者帖子、作者仓库和开发者商店介绍。玩法说明不等于实玩，作者自报耗时不等于独立工时审计。没有核实流量、收入或留存，也未完整通关参考游戏。

## 两个指定参考

### R01 · 小王子：星辰之旅

- [官网](https://littleprince.dev/)、[Sac @Saccc_c 首发](https://x.com/Saccc_c/status/2109962425512734739)、[教程发布](https://x.com/Saccc_c/status/2110694725640474759)、[作者文章](https://x.com/i/article/2110601994578866176)。
- 首发为2026-10-13 19:00上海时间。官网可访问，提示电脑、Chrome／Edge，手机平板暂不支持；工程入口可见 Unity loader、WASM 和 WebGPU 检测。
- 作者自述16天，使用多种 AI 工具、Tripo、Blender、Unity 等。教程已于10月15日公开：先定参考图与资产清单，再拆资产、建模、绑定、截图调整比例和构图。不是“一条提示词生成完整游戏”。
- X直接读取403；通过公开 [FxTwitter帖子数据](https://api.fxtwitter.com/Saccc_c/status/2109962425512734739)及教程帖数据交叉核对身份与日期。本轮未找到可确认属于该游戏的官方源码仓库，开源预告不写成已开源。
- 启发：围绕统一参考，收口一个让人愿意进入的小世界。宣传视频不能证明长期可玩性或手机帧率。

### R02 · PokéBonk

- [官网](https://pokebonk.com/)、[官方法律及素材说明](https://pokebonk.com/legal)、[版本](https://pokebonk.com/version.json)、[状态](https://api.pokebonk.com/status)。
- 10月22日官网中文入口与版本数据均显示 Beta v0.8.13。入口亲眼观察；游客进入触发真人验证，未解验证码、未登录、未完成实玩。
- 官方定位为3D survivors、进化、Ultimate 与局外解锁；法律页确认 Charcher、Megabonk 灵感和混合资源路线。151只关都宝可梦是宣传范围，不等于本轮逐一验证的可玩角色数。
- 当前 [客户端](https://pokebonk.com/assets/main-D5OUVqGK-mvilprw2.js)及 [更新](https://pokebonk.com/assets/news-CdH717rb-mvilprw2.js)包含10月21日第2赛季、招式融合、新地图／守护者、物品、玩家档案与构筑分享。带 build 的地址可能变化，本仓库不保存 bundle。
- 推导：即时反馈、可见成长、系统组合与可展示成果共同构成吸引力。免费同人项目的公开存在不能作为复用其 IP 或资产的授权。

## 扩展案例

| 编号／案例 | 一手证据与日期 | 可借鉴结构 | 边界 |
| --- | --- | --- | --- |
| R03 Wildbrush | [原作者](https://x.com/DannyLimanseta/status/2104215873120764032)，2026-09-27；[试玩](https://wildbrush.vercel.app/) | 火、冰、弹跳、藤蔓同时服务移动、战斗、解谜，少量语义产生多种用途 | 依据作者演示，作者也承认仍需打磨 |
| R04 Tidewater | [作者更新](https://x.com/dangreenheck/status/2103004432786993341)，09-24；[仓库](https://github.com/dgreenheck/tidewater)、[试玩](https://dgreenheck.github.io/tidewater/) | 钓鱼、售卖、升级、前往更远水域形成闭环 | README要求WebGPU、较强GPU，首次着色器编译可能较久；不照搬其高成本渲染 |
| R05 Tiny Skies | [仓库](https://github.com/dannylimanseta/tinyskies)、[迭代记录](https://github.com/dannylimanseta/tinyskies/blob/cursor/globefly-multiplayer-globe-flight-game/docs/cursor-exports/cursor_game_review_and_improvement_idea.md)、[试玩](https://tinyskies.vercel.app/) | 小世界、高密度地标与移动方式变化，优于空旷大地图 | 可看源码不等于许可明确，本轮不复制代码／模型 |
| R06 IP, PLEASE | [作者仓库](https://github.com/ip-please/ip-please.github.io)、[试玩](https://ip-please.github.io/)；10-18建仓 | 一个检查亭通过规则递增、角色与事件形成作者声明的六天、双结局内容 | 是内容密度参考，不搬剧情或素材 |
| R07 Megabonk | [开发者Steam页](https://store.steampowered.com/app/3405340/Megabonk/)，2025-09-18发行 | 移动、拾取、升级、敌群压力构成增强循环 | 成熟机制参考，不冒称近期AI制作项目 |
| R08 BALL x PIT | [开发者Steam页](https://store.steampowered.com/app/2062430/BALL_x_PIT/)，2025-10-15发行 | 局内组合与局外基地互相供给，回合成果可见 | 不复刻配方／建筑／美术，基地不做强制日常 |
| R09 Blue Prince | [开发者Steam页](https://store.steampowered.com/app/1569580/Blue_Prince/) | 随机空间连接、知识累积、永久解锁支持反复探索 | 不用大量随机房间替代手工内容 |
| R10 A Webbing Journey | [开发者Steam页](https://store.steampowered.com/app/2073910/A_Webbing_Journey/)，2025-05-19抢先体验 | 可重复使用的物理动词在小场景中解决很多任务 | 首版不复制通用绳索物理和大型室内沙盒 |
| R11 Overbuilt | [作者发布页](https://xcoffeetommyx.itch.io/overbuilt)，2026-09-28发布 | 武器、系统和变形成为机器人外形上的实际零件 | 作者标为两区域demo；机械候选若仅自动攻击＋加零件会太接近它 |
| R12 Orbit Salvage | [作者发布页](https://lamtix.itch.io/orbit-salvage) | 收集、载货、返航入库、升级，携带风险使移动有目的 | 不照搬霓虹场景或纯永久数值结构 |

## 转成设计决策

1. 免注册直接开始；开场一分钟完成移动、一次明确交互、一次可见成长。
2. 先做一个可跨场景重复使用的动词：伙伴协同、磁牵引或拖曳载货。少做互不相干的玩法。
3. 成长改变攻击形状、节奏、路径或交互能力。局外优先解锁选择、图鉴和可见家园变化。
4. 随机改变路线、事件、风险与构筑价值；保留手工地标、Boss和秘密。换色不等于新关卡。
5. 分享包含构筑、种子和战报；首版无需账号、公会或实时多人来制造深度。
6. 美术先验证实际游戏镜头再扩产，封面不能证明战斗画面可读。
7. 音乐优先试听合法现成曲目，交互解锁，分探索／战斗／Boss；不默认用合成波形配乐。
8. 原创世界与角色；借鉴反馈和制作流程，不依赖参考作品的 IP。

## 尚未证明

参考作品的完整难度、留存和手机表现；新作角色生产速度、真实帧率；用户服务器的OS、带宽、负载、账号与公网访问。制作中逐项验证，不把它们当成已有成绩。
