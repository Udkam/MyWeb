# 苔光来信 · 原始素材来源

本项目美术与声音采用 **Pixel-boy 与 AAA** 创作的 [Ninja Adventure Asset Pack](https://pixel-boy.itch.io/ninja-adventure-asset-pack)。下载核查日期：2026-10-13。作者原包 `README.md` 声明包内素材可用于个人及商业游戏，采用 CC0；署名不强制，本项目仍保留作者致谢。

完整原始许可证随发行文件保留在 `src/assets/art/LICENSE-Ninja-Adventure.txt`。本项目没有购买付费资产，没有使用生成图像或自合成音乐。

## 美术子集

仅使用下列原 PNG，直接复制且未重绘、生成、重采样或重新编码。Canvas 在运行时按 `src/assets/asset-map.json` 中的精确像素矩形取样；界面头像使用同一动物精灵的第一帧，不使用黑底 Faceset。

| 本地文件 | 作者原包路径 |
| --- | --- |
| art/nature.png | Backgrounds/Tilesets/TilesetNature.png |
| art/floor.png | Backgrounds/Tilesets/TilesetFloor.png |
| art/water.png | Backgrounds/Tilesets/TilesetWater.png |
| art/house.png | Backgrounds/Tilesets/TilesetHouse.png |
| art/camp.png | Backgrounds/Tilesets/tileset_camp.png |
| art/ripples.png | Backgrounds/Animated/Water Ripples/SpriteSheet16x16.png |
| art/cat.png | Actor/Animal/Cat/SpriteSheet.png |
| art/dog.png | Actor/Animal/Dog/SpriteSheet.png |
| art/frog.png | Actor/Animal/Frog/SpriteSheet.png |
| art/racoon.png | Actor/Animal/Racoon/SpriteSheet.png |
| art/chicken.png | Actor/Animal/Chicken/SpriteSheetBrown.png |
| art/pig.png | Actor/Animal/Pig/SpriteSheetPink.png |

12 张 PNG 总计 **176,042 bytes**。所有动物都是独立动物文件夹里的真实原图，每张 32×16，含两格 16×16；它们没有被命名为单独 Idle 动画，也不提供完整四向行走，游戏只播放原来的两种轻微姿态。`Racoon` 沿用作者原文件夹拼写。

## 声音子集

| 本地文件 | 作者原包路径 | 核验范围 |
| --- | --- | --- |
| music.ogg | Audio/Musics/5 - Peaceful.ogg | 原始 OGG 文件，1,198,029 bytes；保留作者曲名，不声称完成主观试听验收 |
| ui-tick.wav | Audio/Sounds/Menu/Move2.wav | 原始 WAV，18,380 bytes |
| ui-accept.wav | Audio/Sounds/Menu/Accept5.wav | 原始 WAV，41,436 bytes |

声音也受作者同一个 CC0 包许可覆盖。是否适合背景循环及其音量，需要在真实浏览器主动播放后验收；网页应默认不自动播放音乐，并提供声音设置与后台暂停。

## 家园陈设对应

故事礼物与可购置物件均来自同一图集：木凳、白花、木架提灯、木圆桌、横放原木、布篷帐篷、石围火堆、棕色背包、木桶、双碗托盘、树桩、粉色小树。精确 `decor id → sprite → file/rect` 在素材表中记录。只有存档 `plots` 中真正摆放的物件才出现在家园，不以预放赠品冒充成长成果。

作者完整约 94 MB 的下载包只留在本地研究目录；发行版仅包含上述精选子集。

## 发行子集 SHA-256

以下散列在选取原文件后计算（2026-10-13）。精确原始包路径见上表；图片散列同时记入 `src/assets/asset-map.json`。

| src/assets 下的文件 | SHA-256 |
| --- | --- |
| `art/nature.png` | `51eedd957ad4ac88988d170aa83a42404ef8fdebff9e6753b6fe80841ab3d5bb` |
| `art/floor.png` | `e111065065edf806e7e893330086e68efc8755175d92f14d087b42d40a331e16` |
| `art/water.png` | `927e1fa1e793bb0398fdaad40cea22792c20f66703cdba80fb9462df7cbc275c` |
| `art/house.png` | `acdec09ff389883a48af18ebd344cac4081db0388154d4d13be0089cd376d508` |
| `art/camp.png` | `93440df0e9039a8f8cd6758da8a41d7405545c8444e1fb10c4ea9ea4746e1051` |
| `art/ripples.png` | `6c4aa7b642943130efc10b9f18047d57e6fa9fb883c5e6896cba8f2dbea2aa0e` |
| `art/cat.png` | `87644265e9961e5c3cd47a7de2c92b2fd4279862c1a395530065e6e0efbafe55` |
| `art/dog.png` | `ce25bd73a94b768ac8765c09822e28612441fabfa397ef4d29327722ae6584f8` |
| `art/frog.png` | `78668d63f2b9feea5ad89b4776f79f410819c2725583a96b711b5bc63a7dc198` |
| `art/racoon.png` | `e7031904f78c371db6fe630e1feab6c13cc565f46c732a281b07d58757f23c7f` |
| `art/chicken.png` | `cc4d8874db65b458dce691285123a8e86940d6fb44573e0ebdb7881c7b6b43b6` |
| `art/pig.png` | `ed7309ce03feb8973790dcd50de9804b540932df9bd048a798b8d48390cdca88` |
| `music.ogg` | `ac4578d928e6d616e9b4804117524692c12a86be700e46f973672de644046e21` |
| `ui-tick.wav` | `b17cf00fcc03dc37c47869734240f2f62959117a74ae5692a4ff2fe77edbc314` |
| `ui-accept.wav` | `66455c9baf713536948c0f8247274652009b1ca26a5fdcade76fb5f85b7eeb92` |
| `art/LICENSE-Ninja-Adventure.txt` | `9bc2cd77030dd73fd2497c5729556a11524fa04099d8351bc527fd4d4c31b916` |
