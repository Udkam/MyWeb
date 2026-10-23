# Cutlass Wake

横版像素海盗动作冒险，英文游戏名，默认中文，可切英文。

当前是**单屏美术与动作审核样片**。完整制作目标仍是三章、六类敌人职责、两位独立 Boss、两条短支路与逃生结局。尚无生产 URL，未接入个人门户；不能把样片当成完整产品。

专用源码：[Udkam/MyWeb / codex/cutlass-wake](https://github.com/Udkam/MyWeb/tree/codex/cutlass-wake)。工作目录 E:\Proj\Active\MyWeb\cutlass-wake，来自目录基线 d38086c051e6476e0bd3e3783a4b543de398d4c1，没有复制旧游戏。MyWeb/main 只放目录，不合并本作源码。

## 运行与操作

Node24；锁文件固定依赖。

~~~powershell
npm ci
npm run dev -- --port 5176 --strictPort
~~~

打开终端给出的本地地址。A/D 或左右键移动，Space 跳，J 攻击，K 防御／招架，Shift 闪避，E 操作火炮，Esc 暂停，F 全屏。手机横屏使用左右、跳／攻／防／闪及近处互动键。精准招架后800ms内，朝被招架敌人移动并攻击可夺势推击；只按攻击保留普通追击选择。

~~~powershell
npm run check
npm test
npm run build
~~~

Vite输出 dist。Phaser固定3.90.0，不混用其他主版本API。生产构建不暴露 __cw、advanceTime 或判定框；开发模式可用 ?manual=1 与 ?boxes=1 做可重现检查。

## 当前审核材料

- [美术与战斗深化提案（2026-10-24）](docs/DESIGN-REFINEMENT-2026-10-24.md)：新的研究与建议，尚未实施或验收；不会将下述当前样片操作说明自动改为新规则。
- [完整制作依据](docs/DESIGN.md)、[当前任务](docs/CURRENT_TASK.md)、[短状态](docs/agent-runs/2026-10-24-art-gate/STATE.md)。
- [美术方向](docs/ART_DIRECTION.md)、[素材总清单](docs/ASSET_MANIFEST.csv)、[动作矩阵](docs/ANIMATION_MATRIX.md)、[来源与许可](docs/THIRD_PARTY.md)。
- .local/art/art-board-a.png 与 art-board-b.png：相同构图的实际素材比较，含原生人物条。
- .qa/art-review/：桌面1920×1080、手机横屏模拟、动作与死亡重开录像、浏览器读回证据。截图/录像不进入公开Git。

当前主角57px、剑兵56px、火枪手57px有效身高。已做完整轮廓分帧，仍有武器一致性、装填、连续死亡和专用闪避补帧缺口，尚非完整动作库。音乐试听、完整存档、Boss、三章和结局尚未进入本阶段；详见动作矩阵与当前任务。

## 维护与来源重现

原始包与原创生成源保留在忽略的 .local/assets；必要运行图、声音、许可证和SHA记录随源码提交。不得归档整页第三方HTML或临时签名下载链接。人物导入使用 scripts/import_generated_art.py，场景/道具导入使用 scripts/import_scene_art.py，CSV使用 scripts/build_asset_manifest.py。原始源图可从本地副本重跑，缺失时按提示记录与固定SHA找回，不能静默换图。

浏览器检查使用已安装的Python Playwright；scripts/verify_art_sample.py 检查页面与布局，scripts/verify_controls.py 检查触控和设置，scripts/create_review_inputs.ts 生成只含正常输入的录制序列，scripts/capture_review.py 捕获真实运行帧。捕获为确定性60Hz逻辑，不代表设备原生帧率；手机为Chromium模拟，不是实机触屏验收。录制输出为无声视频，听感尚待实际试听。

用户视觉认可前不扩全量章节。后续优先独立Vercel项目：生产分支 codex/cutlass-wake、构建根为分支仓库根、npm ci / npm run build / dist，并核对项目级分支过滤。真实生产部署与完整游戏验收之后才接入独立 personal-web/main。任何 foreseer.site 浏览器验收必须导航前拦截 /api/visits*。
