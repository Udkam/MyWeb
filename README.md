# Cutlass Wake

横版像素海盗动作冒险，英文游戏名，默认中文，可切英文。

当前是**盐蚀铜版遭遇试玩的制作阶段**，用户已接受深化方向，尚未进行实际试玩验收。完整制作目标仍是三章、六类敌人职责、两位独立 Boss、两条短支路与逃生结局。独立 Vercel 项目已配置，试玩尚未部署，未接入个人门户；不能把样片当成完整产品。

专用源码：[Udkam/MyWeb / codex/cutlass-wake](https://github.com/Udkam/MyWeb/tree/codex/cutlass-wake)。工作目录 E:\Proj\Active\MyWeb\cutlass-wake，来自目录基线 d38086c051e6476e0bd3e3783a4b543de398d4c1，没有复制旧游戏。MyWeb/main 只放目录，不合并本作源码。

## 运行与操作

Node24；锁文件固定依赖。

~~~powershell
npm ci
npm run dev -- --port 5176 --strictPort
~~~

打开终端给出的本地地址。A/D 或左右键移动，Space 跳，J 攻击／追击，K 防御／招架，Shift 闪避，E 执行界面明确显示的推撞或炮击，Esc 暂停，F 全屏。手机横屏使用左右、跳／攻／防／闪及明确的互动键。精准招架、惩罚敌人空挥或打断装填会产生特定目标的950ms破绽；J追击、E推撞，也可以脱离。E按下时绑定所显示的动作及目标，目标过期不会自动变成炮击。

连续格挡积累防御压力，松开一段时间后才恢复；长按不会不断刷新招架。两段斩有不同准备与收招，命中后可以取消，挥空仍需承担收招。刀兵受到两次有效轻击后会准备架稳并退步，后背与炮弹仍可利用。清理两名敌人后，从右侧出口完成遭遇。

~~~powershell
npm run check
npm test
npm run build
~~~

Vite输出 dist。Phaser固定3.90.0，不混用其他主版本API。生产构建不暴露 __cw、advanceTime 或判定框；开发模式可用 ?manual=1 与 ?boxes=1 做可重现检查。

## 当前审核材料

- [美术与战斗深化提案（2026-10-24）](docs/DESIGN-REFINEMENT-2026-10-24.md)与[试玩交接](docs/HANDOFF-PLAYTEST-2026-10-24.md)：已获用户确认的方向；运行规则见[战斗契约](docs/COMBAT_CONTRACT.md)，实际实现仍需实机及用户验收。
- [完整制作依据](docs/DESIGN.md)、[当前任务](docs/CURRENT_TASK.md)、[短状态](docs/agent-runs/2026-10-24-art-gate/STATE.md)。
- [美术方向](docs/ART_DIRECTION.md)、[素材总清单](docs/ASSET_MANIFEST.csv)、[动作矩阵](docs/ANIMATION_MATRIX.md)、[来源与许可](docs/THIRD_PARTY.md)。
- .local/art/art-board-a.png 与 art-board-b.png：相同构图的实际素材比较，含原生人物条。
- .qa/art-review/：旧样片证据，仅作历史基线；.qa/playtest/为本轮检查。截图/录像不进入公开Git。

新版人物以70px身体参考高度导入640×360，并从新源独立采样105px人物到960×540，用相同逻辑尺寸与构图比较。实际独立身体帧为主角38、刀兵20、枪手12；身体与固定武器按逐帧握持点组合，运行时不回退旧人物。刀刃、推掌与枪口使用同一份接触数据；生成源没有严格遵循原生像素网格，不声称提高分辨率本身等于美术达标。音乐试听、完整存档、Boss、三章和结局尚未进入本阶段。

## 维护与来源重现

原始包与原创生成源保留在忽略的 .local/assets；必要运行图、声音、许可证和SHA记录随源码提交。不得归档整页第三方HTML或临时签名下载链接。新版人物导入使用 scripts/import_actor_v2.py，分层船景使用 scripts/import_ship_layers.py，CSV使用 scripts/build_asset_manifest.py；旧import_generated_art.py与import_scene_art.py仅重现旧基线。原始源图可从本地副本重跑，缺失时按提示记录与固定SHA找回，不能静默换图。

浏览器检查使用已安装的Python Playwright。新版 scripts/verify_playtest_controls.py 检查键盘、多指触控、旋转、设置、显示对比与无滚动；scripts/record_playtest_realtime.py 按真实墙钟输入并记录正常RAF运行，不调用推进时间或修改游戏状态。旧 verify_art_sample.py、verify_controls.py、create_review_inputs.ts、capture_review.py 仅对应旧固定时间样片。手机为Chromium模拟，不是真机触屏验收；视频没有捕获系统音频，听感仍需实际试听。

用户亲自试玩认可前不扩全量章节。独立Vercel项目与分支过滤见[部署记录](docs/DEPLOYMENT.md)：生产分支 codex/cutlass-wake、构建根为分支仓库根、npm ci / npm run build / dist。实际部署与验收尚未完成，配置域名不等于已经上线。最终完整生产部署与游戏验收之后才接入独立 personal-web/main。任何 foreseer.site 浏览器验收必须导航前拦截 /api/visits*。
