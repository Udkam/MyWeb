# 本地工具与素材准备

2026-10-14，按本轮游戏需求检查 `E:\Proj\Tools` 的入口文档与相关工具。未安装软件、改动全局配置、启动 GPU 模型或自动生成美术／音乐。

| 工具 | 当前证据 | 本轮用途 |
| --- | --- | --- |
| Audio / Music CLI / FFmpeg | `Music.cmd doctor` 成功；实际 `inspect music-fight.ogg` 通过 | 检查下载录音格式、时长、峰值、响度与可解码性 |
| WebCollector | `collect.cmd doctor` 在当前进程加入已登记 FFmpeg 路径后 `ready=true` | 保留作为补充作者来源和许可核查入口；本轮完整原包已在项目中 |
| Modeling / Blender | `model.cmd doctor` 确认 Blender 4.5.5、glTF Transform 4.4.1、KTX 4.4.2 的入口可调用 | 此游戏使用 2D 原作像素帧，本轮无需额外三维生成 |
| AI / ComfyUI / MiniMax-H3 / Remotion | 只读工具文档，未启动或推理 | 未纳入游戏运行和资产制作；不将旧文档验收当成本轮实测 |

首次受限进程中的 Audio doctor 出现 FFmpeg `WinError 5`，WebCollector 也未从 PATH 找到 FFmpeg。正式只读运行和仅当前进程的 PATH 设置后检查成功；未改软件安装或全局 PATH。

现有 Fight 原录音的实测值：32 秒、44100 Hz、双声道 Vorbis、样本有限、峰值 -9.416 dBFS、输入综合响度 -22.62 LUFS。工具返回的 output loudness 是分析滤镜估计值，本次没有重新响度处理或改写音频。技术解码不等同于主观试听验收。

## 资源策略

使用已下载的 Ninja Adventure 完整 CC0 原包。普通怪至少二十套独立轮廓，幼体另计；十位 Boss 使用 GiantFrog、GiantBamboo、SquidGreen、GiantSlime、TenguBlue、GiantFlam、GiantBlueSamurai、DemonCyclop、GiantRacoonGold、GiantSpirit 等独立大型动画。按每种实际 frameW/frameH 切帧，不假设 Boss 全是方格。

五段和异界的音乐从原包精选 Aquatic、Dark Castle、Tension、Final Area、Dream，与已有 Dungeon / Fight 原曲组合；按房间场景边界切换。音频延迟加载，减少首次下载。所有实际采用文件的原始路径、SHA-256、尺寸／音频信息与作者许可以 `src/assets/manifest.json`、`ASSET-CREDITS.md` 和素材覆盖表为准。

玩法机制先与可读视觉绑定，再接代码：荆棘是实体障碍；镜像需与本体可区分；熔炉有开核／闭壳状态；时停弹有明确暂停／释放状态；只有落石和落雷使用落点圆。不用地面矩形或扇形框代替普通敌人的动作提示。
