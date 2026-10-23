# 原创生成记录

2026-10-24，使用内置imagegen，未用CLI/API、Blender或旧作资源，未购买素材。以下记录最终提示及资产规格；提示中的网格/色板要求并未自动达成，事实以源图、审计与实机为准。

## 主角

工作源 `hero-source.png`，原始输出 `exec-d31d1e82-79fa-4ac3-86dd-a1bf1c39745b.png`，SHA256 `742f2d44dd1dea9574e630c3ed1ba176873def06fa4ef6fb6a0fd4a80610c6ad`。它是初次24姿态源图 `exec-1b92db5e-fa86-4b8b-b7e9-f7faa5785ba5.png` 的定向编辑。

最终编辑提示原文：

> Edit this exact original Cutlass Wake sailor 24-frame sprite atlas for GAME PRODUCTION. Keep the same 6 columns x4 rows at 1536x1024 and all 24 character poses, identity, jacket/scarf/boots/cutlass, positions, facing, proportions and colors unchanged. Remove ALL of the brown/black coloured background, all gradients, halos and floor shadows: every pixel outside the character silhouette and his held sword must have alpha EXACTLY ZERO. Each character must be fully opaque, alpha255, with a hard crisp boundary, no translucent pixels. Transparent background is mandatory, not a painted dark background or checkerboard. Correct pixel treatment: make each native pixel a uniform solid 4x4 block on a strict 4-pixel grid so it can import as 384x256 native atlas with 64x64 cells. No subpixel detail or dithering; preserve the 50px-high native standing body and readable beautiful hand-crafted 16-bit clusters. Do not add or remove poses. No effects, text, border, grid lines or props. Preserve each blade and scarf and maintain separation between cells.

初始人物规格：侧视向右，年轻水手，短深发、深蓝短外套和黄铜纽扣、珊瑚红围巾、奶白衬衫、深青长裤、棕靴、象牙钢刀、正常人类比例、左上暖光。逐行：待机2/跑4；起跳/升/落/落地2/空斩；地斩准备/接触/收招/防御/招架/招架恢复；推击准备/接触/收招/受伤/恢复/倒地。

## 两敌

工作源 `enemies-source.png`，输出 `exec-8e089b51-ec44-4351-818f-44e0a8b9458a.png`，SHA见 `generated-frame-audit.json`。主角仅作色板、像素簇、人体密度参考。

最终提示规格：原创透明生产sprite atlas，1536×1024，6×4的24个独立姿态，全部朝右，体型和武器一致，无场景和特效。前12格为宽肩持刀海盗：暗红马甲、卷袖奶白衬衫、赭色腰带、棕裤、暗红头巾与短胡须；待机/跑4/抬刀2/斩击/收招/受伤/失衡/倒地。后12格为瘦高年长火枪手：灰绿外套、象牙边深色三角帽、黄围巾、奶白绑腿、木制黄铜火枪；待机/走2/举枪/瞄准/开火/装填3/受伤/被推/倒地。要求50px原生身体4×显示，不裁刀、不脱离武器、不复制主角身份。实际格线未精确达成，完整轮廓提取后导入96×80。

## 港口与道具

背景源 `harbor-source.png`，输出 `exec-6cd9d37b-96a2-4da8-9e09-6065bbf66c56.png`。提示规格：原创正侧视港口实际游戏背景，要求2560×1440对应640×360；暖金天空、淡紫山城、青绿海水、远方武装船与船桅；红褐木码头和铁箍支柱；边缘仓库/灯笼/绳索，中间交战空间留白。人物只作配色参考，不出现在背景；禁止UI、火炮、实体箱、高台、烟、泛光和雨。实际输出1672×941，经检查采样至640×360，按真实前缘y255设碰撞，而非假定提示词y292。

道具源 `props-source.png`，输出 `exec-9d7949c5-6cc4-4cb1-a9df-0a96a0ab66c9.png`。提示规格：同港口木材/铁/黄铜色板的六个独立透明道具。上排同一LEFT朝火炮的待机、后坐、冷却三幅，不画炮烟；下排48×24货箱、24×32桶、112×12平直平台和下托架。无字/格线/背景，要求硬像素。实际bbox/源SHA/导入尺寸见 `scene-import.json`；平台含装饰托架实际112×28，碰撞厚度另为12。

## 实际处理

工作副本保留 `.local/assets/generated/`。工具原图目录为 `C:\Users\Alex Chen\.codex\generated_images\01a169ba-898d-7632-bacc-a4ebc8323c4d`，保留原图，不依赖该目录作为唯一工程来源。

两人物源都恰有24个完整独立连通轮廓，但刀刃/脚底越过假定网格。按alpha≥128提取，每帧人工复核身体中心与脚底，再统一1/4最近邻导入、透明规范为0/255；不按帧拉伸、不超分、不画几何替代角色。实际仍有细碎颜色、刀长投影和接地/补帧缺口，完整记录于帧审计与动作矩阵。提示不是美术达标的证据。
