# 旧草稿素材清理清单

核查日期：2026-10-13。本次只读检查，**未删除任何文件**。以下路径均以本项目根目录为基准。新 `scene.js` / `app.js` / `index.html` / `styles.css` 没有直接引用，正式 `asset-map.json` 也未使用。

| 路径 | 字节 | 新 scene / app 引用 | 建议 |
| --- | ---: | --- | --- |
| `src/assets/click.ogg` | 4,876 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/dungeon.png` | 5,294 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/farm.png` | 5,866 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/hit.ogg` | 9,370 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/page.ogg` | 8,273 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/reward.ogg` | 8,968 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/town.png` | 5,042 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/village.mp3` | 608,569 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/licenses/dungeon.txt` | 570 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/licenses/farm.txt` | 566 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/licenses/interface-sounds.txt` | 574 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/licenses/music.txt` | 279 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/licenses/rpg-audio.txt` | 478 | 无；素材映射也未使用 | 移出发行目录 |
| `src/assets/licenses/town.txt` | 567 | 无；素材映射也未使用 | 移出发行目录 |

合计 **14 个文件、659,292 bytes**。精确绝对路径与 SHA-256 见 [LEGACY-ASSET-INVENTORY.json](LEGACY-ASSET-INVENTORY.json)。`licenses/` 内六份许可只对应旧素材，不包含需保留的 Ninja Adventure 原始许可。

应保留：`src/assets/art/` 的十二张 PNG 与 `LICENSE-Ninja-Adventure.txt`、`asset-map.json`、`music.ogg`、`ui-tick.wav`、`ui-accept.wav`。候选完整 ZIP、未采用图片、研究截图不复制到此目录。
