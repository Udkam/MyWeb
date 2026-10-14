# Cinder Below

全视口像素动作肉鸽。五段共十五房、二十种普通怪物、十位独立首领、十二种叠加遗物和三把起始武器。打开即玩，每局以新种子生成遭遇与布局。默认中文，支持即时切换英文；游戏名保留 Cinder Below。

**Public site:** https://foreseer-focus-desk.fresh-ape-5596.chatgpt.site

**Canonical editable source:** `E:\Proj\Active\MyWeb\cinder-below`

The existing public ChatGPT Sites project and stable URL are retained. The old Focus Desk / Mosslight Post URL slug is not the game's title. This game replaces Mosslight Post; its complete earlier source remains in Git at `fb20b88e4e7c564eb9912d390c69678d52bdd5af`.

## Play

The interface defaults to Simplified Chinese while the game title stays **Cinder Below**. Use **EN / 中文** in the top toolbar or pause menu to switch immediately. The browser remembers this preference separately from game progress; existing version-1 saves and checkpoints remain compatible.

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse + hold left button | Aim and fire |
| Arrow keys | Keyboard-only aim and fire |
| Space / right mouse / Shift | Dash |
| E | Charged nova: damage and clear nearby hostile shots |
| Q / nearby touch button | Interact with optional discoveries |
| 1 / 2 / 3 | Select a relic |
| Escape / P | Pause |
| F | Toggle browser fullscreen |
| M | Toggle audio |

Phones have two independent sticks and separate Dash / Nova buttons. The game fills the browser viewport even where the Fullscreen API is unavailable. Portrait and landscape are supported; small screens can use landscape for more horizontal aiming space.

第一房用单波介绍操作，后续普通房有两波遭遇。每段两场普通战斗后，从该段两位首领中随机选一位；首领拥有独立招式循环和阶段机制。十二种碰撞布局采用种子洗牌并组合镜像，包含错层回廊、双庭院、环行裂隙与断桥。五段环境及异界采用不同铺层、遗迹、边缘和光色；普通攻击只用敌人自身蓄力动作提示，落石／落雷才显示圆形落点。

每次清房获得三选一遗物：分裂、弹射、穿透、追踪、连锁、灼烧、减速、爆炸、环刃、冲刺火迹、星爆和生命换伤害可叠加组合。救援旅人、三灯谜题、供奉、破墙宝箱和无伤幽灵均为可跳过的探索；详情放在暂停菜单“怪物与奇遇”。

房内奇遇有放大精灵、描边标记和清晰文字；侧边卡片说明触发条件、顺序、花费或奖励，靠近后显示 Q／触屏操作。手机横竖屏均为独立交互按钮，不与双摇杆重叠。配乐采用 Juhani Junkala 的四首现成 CC0 暗黑幻想录音，普通房低频紧张，Boss 使用独立战斗曲；换曲交叉淡化，同曲跨房及暂停后保留播放位置。

猎途每波增加敌人并获得更多余烬；庇所敌人较少，入场恢复一颗心。段间可选异界裂隙，下一房具有种子决定的临时法则：回声让双方子弹额外反弹；过载使星爆快速充能但敌弹加速；玻璃提高射击伤害但敌弹命中损失两颗心。出口会预告法则，离开异界后恢复普通规则。

累计清房 4／10 次解锁另外两把武器。无签到、等待计时或账号要求。余烬在本局供奉中可花费，累计收入仍单独记录，不能付费购买。

## Saves

进度保存在当前浏览器的 `cinder-below-v1` 中，设置提供 JSON 导出／导入。继续冒险从最近的房间入口重开；房内任务、消费和奖励也一起回到该入口，进入下一房后统一保存。旧版 run 的 v1 房间快照仍按原八房流程继续，新 run 使用 v2 十五房快照；外层游戏存档键及版本保持兼容。独立语言键 `cinder-below-language` 不影响进度。此前 Mosslight Post 的存档不修改。

Writes use the Web Locks API and revision checks. Another tab's update pauses this tab and asks the player to load the latest save or export the local one. Corrupt data is preserved; replacement requires confirmation. When storage or safe locking is unavailable, play continues in memory with a visible status and export. Cloud/account sync is not implemented.

## Local development

Node 22+ and Python 3 are sufficient for the source build; there are no npm runtime dependencies.

```text
npm run check
npm run test
npm run build
python -m http.server 4328 --bind 127.0.0.1
```

Open `http://127.0.0.1:4328/src/` for development or `/dist/` for the built version. Browser checks use an existing Python Playwright + Chromium installation:

```text
python tests/browser-ui-check.py
python tests/browser-storage-check.py
python tests/browser-combat-check.py
python tests/browser-language-check.py http://127.0.0.1:4328/src/?test=1
python tests/browser-adventure-check.py
```

测试使用 `?test=1` 与确定性 `advanceTime(ms)` 钩子。正常战斗通关测试只使用真实键鼠，不修改血量、敌人或世界。支线专用测试会明确标注房间入口存档夹具，与无作弊通关记录分别保存。`render_game_to_text()` 提供只读状态，不能据此把测试钩子称为自动游玩功能。

## Hosting and evidence

ChatGPT Sites project: `appgprj_6accfe11a0ec8191ab683ddd3e52de07`. `.openai/hosting.json` points to `dist`. The official Sites source workflow opens/synchronizes the existing repository, runs remaining checks, commits and pushes the exact source, and packages the static output. A saved archive-backed version is deployed with public access. Local build success alone does not establish deployment; `.qa/release.json` records the actual source/version/deployment evidence.

- [Design and module boundaries](DESIGN.md)
- [五段战斗、随机异界与探索设计](COMBAT-DESIGN.md)
- [十位首领的独立机制](BOSS-DESIGN.md)
- [本地工具核验与资源准备](TOOLS-AND-RESOURCES.md)
- [Implementation details](IMPLEMENTATION.md)
- [532-page research ledger and limitations](docs/research/README.md)
- [Downloaded art and audio licenses / hashes](ASSET-CREDITS.md)

Research and diagnostic screenshots stay outside `src` and the deployed artifact. `.qa` is ignored and retains acceptance evidence locally. Art and sound effects are original CC0 Ninja Adventure assets; music is existing CC0 work by Juhani Junkala. No art or music from The Binding of Isaac or Darkest Dungeon is used. See [map design](MAP-DESIGN.md), [art direction](ART-DIRECTION.md) and [music sources / processing](MUSIC-DIRECTION.md). New runs use mapVersion 2; existing checkpoints without this field retain their original six-layout geometry.
