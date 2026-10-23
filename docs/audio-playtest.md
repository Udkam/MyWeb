# Cutlass Wake · 试玩音效与试听边界

更新：2026-10-24（北京时间）。本次只服务可重复的首个遭遇，没有下载整首配乐或合成音乐。

## 本阶段映射

原六个独立源的作者、许可、原始与导出 SHA256、时长和技术指标保存在 [audio-audit.json](art/audio-audit.json)。均为 CC0，来源是 Kenney 官方包与 Thimras 的 OpenGameArt 作者上传页。普通格挡、精准招架、受伤和推撞使用不同原始文件，并非同一文件变调。

| 事件 | 运行文件 | 试听重点 |
| --- | --- | --- |
| 地斩／空斩 | `public/assets/audio/slash.ogg` | 与实际刀锋接触前的挥刀时机一致，不能每帧重复 |
| 普通格挡 | `public/assets/audio/guard.ogg` | 克制、较闷，与角色后退同时发生 |
| 精准招架 | `public/assets/audio/parry.ogg` | 与挡击和受伤有明显区别；是否足够短脆清亮仍须人听 |
| 受伤 | `public/assets/audio/hurt.ogg` | 不能与挥空、格挡混淆；受伤无敌中不重复播 |
| 推撞接触 | `public/assets/audio/shove.ogg` | 接触目标时发声，不能只在按 E 时发声 |
| 炮弹撞击金属 | `public/assets/audio/cannon-impact.ogg` | 是远船炮撞金属的夸张响声，只作撞击候选 |
| 火炮发射 | `public/assets/audio/cannon-fire.ogg` | 独立发炮源；不把撞击声当作炮口爆鸣 |

## 新增火炮发射源审计

- 作品：[Cannon fire](https://opengameart.org/content/cannon-fire)。作者 **Thimras**，作者说明为船炮或其他火炮发射。
- 许可：**CC0**；[许可链接](https://creativecommons.org/publicdomain/zero/1.0/)。作者页公开上传，可复制、修改及再分发，允许纳入公开游戏仓库。保留来源鸣谢是本项目的溯源习惯。
- 官方原始文件：[cannon_fire_0.ogg](https://opengameart.org/sites/default/files/cannon_fire_0.ogg)。无购买、登录或第三方转载。
- 原始保留位置：`.local/assets/raw/cannon_fire_0.ogg`，179,939 bytes，3.578542 秒，Ogg Vorbis、48,000 Hz、双声道；SHA256 `2b21ffa41e5c3be4eecdfbd3490544f5aa8b6d1581787265863e13de1a8e599d`。
- 游戏导出：`public/assets/audio/cannon-fire.ogg`，60,868 bytes，3.581208 秒，Ogg Vorbis、48,000 Hz、双声道；SHA256 `aa1fc36551beed9aa9c17341d4a5c0e9c25745a4a3904983a4dc69ebbc445f05`。
- 修改：FFmpeg 重新编码为 Vorbis quality 5，降低 4 dB；不剪切、不变调、不混音、不合成。容器编码填充约增加 3 ms。导出峰值实测 −3.6 dBFS；原始峰值为 0 dBFS。峰值数据不能证明听感或原始录音无削波。
- 已检查：实际下载、解码、时长、格式、声道、响度峰值与文件哈希。
- **未完成：人耳试听、与火炮动画的音画时序验收、真实手机听感。** 文件名、作者说明与解码通过均不能替代试听；当前仅是合法且技术可加载的候选。

## 浏览器与用户试听

首个“开始遭遇”、继续或重开应在真实用户手势中恢复音频；静音状态应持久保存。打开设置时暂停，关闭设置后由玩家明确继续。效果开关只控制画面效果，声音有独立开关，避免为了关震屏而被迫静音。

本阶段控制验证脚本为 `scripts/verify_playtest_controls.py`，复用已存在的本地开发服务，不自行开服务。它能记录真实按键后的 `play()` Promise、`playing` 事件和播放时间推进，及静音后新播放调用；这只证明浏览器实际播放路径，不证明音色优劣。移动端采用 Chromium/CDP 多点触摸模拟，不是手机真机验收。

2026-10-24 已对本地 `127.0.0.1:5176/?manual=1` 的新场景集成执行该脚本：14 项通过、页面错误为零。真实开始手势后，检测到一次音效的播放 Promise 成功、`playing` 事件和播放时间推进；静音后没有新播放调用。设置打开会暂停、关闭后仍需明确继续；640 与 960 选项实际对应 640×360 和 960×540 的 canvas。证据保存在忽略的 `.qa/playtest/controls.json`。该结果只确认浏览器路径与控件，没有完成七种音效逐一人耳试听或全段音画同步验收。

人工试听时依次比较无配乐的斩击、普通挡击、精准招架、受伤、推撞、发炮与撞击。至少确认：从声音能区别挡击／招架／受伤；炮声没有盖住紧接着的火枪或刀兵读招；暂停恢复不重复补播旧事件；重复重开不叠加尾音；静音后没有未清理的持续音。没有真实参与者时保留为待验收，不写“已听过”或虚构五人测试。
