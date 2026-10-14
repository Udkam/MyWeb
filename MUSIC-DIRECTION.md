# Cinder Below 配乐方向与来源

2026-10-14。目标是暗黑地牢、低频紧张感、Boss 更强烈。直接使用作曲者发布的已有音乐；不生成音乐，不用振荡器、不合成音效、不拼接生成新乐段。

## 本次选择

采用 **Juhani Junkala / SubspaceAudio** 的四首 CC0 录音，统一作曲风格，避免每个房间更换互不相干的音乐。

| 原曲 | 用途 | 时长 | 实测原曲 LUFS | 播放增益 |
|---|---|---:|---:|---:|
| Catacombs | 幽谷、沼泽 | 80.967 秒 | -11.98 | 0.315 |
| Ancient Evil Awakens! | 熔窟、风暴 | 92.906 秒 | -11.13 | 0.286 |
| Whispers From Beyond | 标题、彼岸、异界 | 81.130 秒 | -15.79 | 0.489 |
| Epic Boss Battle | 全部首领 | 123.431 秒 | -6.83 | 0.246 |

前三首来自作者的 [JRPG Pack 3 Evil](https://opengameart.org/content/jrpg-pack-3-evil)。原包的 INFO.txt 也由作者明确说明 CC0。Boss 来自 [Boss Battle Music](https://opengameart.org/content/boss-battle-music)，作者标注管弦首领战与无缝循环。完整来源、文件哈希、网页压缩记录见 `src/assets/music-manifest.json`。

普通曲目的等效电平约 -22 LUFS，较稀疏的 Whispers 约 -22 LUFS；Boss 约 -19 LUFS，随后统一通过 0.65 主音量。以约 3 dB 的差异增强首领压迫感，避免把原本高响度的 Boss WAV 直接等音量播放。

切曲使用最多两个媒体播放器重叠 1.1 秒淡化。相同曲目跨房间继续播放；暂停、设置刷新、奖励界面不会把曲目重置到开头。静音和页面暂停会停止两个播放器并取消延迟淡化，恢复时续播。音效仍使用已有 Ninja Adventure 原录音。

## 候选比较

研究了以下八条候选。六条 Juhani 原曲均实际下载并完整解码；另两条只按作者页面比较，未把它们冒充试听或下载结果。

| 候选 | 来源与许可 | 采用决定及依据 |
|---|---|---|
| Catacombs | Juhani Junkala，JRPG Pack 3 Evil，CC0 | 采用。六首中实测低于 250 Hz 能量占比最高，作为普通地牢共同底色。 |
| Ancient Evil Awakens! | 同上 | 采用。与 Catacombs 来自同包，较密集的动态适合中后段；与前段保持作者一致。 |
| Whispers From Beyond | 同上 | 采用。六首中最低谱重心、最大的响度动态范围，给标题与异界留出空间。 |
| Apocalypse | 同上 | 未采用。58.54 秒、动态范围 2 LU，普通遭遇已由更长的两首覆盖，避免增加短循环。 |
| Witch's Lair | 同上 | 未采用。六首中谱重心较高，且原文件边界跳变比最终采用的三个原 OGG 更明显。 |
| Epic Boss Battle | Juhani Junkala，[作者曲目页](https://opengameart.org/content/boss-battle-music)，CC0 | 采用。作者明确定位首领战，123.43 秒提供更长段落，电平单独校准。 |
| Inside the Overlords Domain | Karate Studios，[作者曲目页](https://opengameart.org/content/inside-the-overlords-domain)，CC0 | 作者描述持续低音制造紧张，方向合适；本版优先统一作曲者，保留为替补。 |
| Dark Place (loop) | SkyleTheFrench，[作者曲目页](https://opengameart.org/content/dark-place-loop)，CC0 | 作者定位暗色氛围循环；没有足够的节奏结构信息证明比统一作者方案更合适，暂不采用。 |

## 原曲处理与验证边界

- 三首原 OGG 逐字节保留，SHA256 与下载包内文件一致。
- Boss 原 WAV 仅转为 OGG Vorbis q5；原文件首尾样本跳变较大，所以首尾各加 **3 毫秒去点击淡化**。不截取乐段、不改速度音高、不改编，不合成；保留完整乐段和原 WAV 哈希。OGG 编码增加约 2.903 毫秒填充，清单分别记录原始与发布时长。
- 六首候选全曲 FFmpeg 解码成功，记录响度、真峰值、时长、声道、频谱与循环边界；四首发布曲合计约 10.25 MB，按场景加载，最多保留两个媒体播放器。
- 低频占比和谱重心只能支持选材方向，**不等于主观好听或听感验收**。本轮没有假称人工试听；浏览器测试验证播放、交叉淡化、续播、静音和循环状态。
- 原始授权包、INFO.txt 和分析结果在测试期间保存于 `.qa/music-source`，本轮发布后归档至 `.qa/atmosphere/music-source`，供来源追溯；只发布精选的四个 OGG。

## 署名

Music: **Juhani Junkala (SubspaceAudio)** — Catacombs, Ancient Evil Awakens!, Whispers From Beyond, Epic Boss Battle. Released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). [Composer website](https://juhanijunkala.com/). Existing recordings, no synthesized music. Epic Boss Battle is web-encoded with 3 ms boundary fades; other three OGG files are unchanged.
