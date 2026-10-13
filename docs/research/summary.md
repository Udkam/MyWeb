# 532 条作者页研究：机制证据与取舍

整理日期：2026-10-14。四组最终有效记录共 **532 条、532 个唯一 URL**；它们支持机制比较和既有设计的来源追溯，不能证明 532 款游戏已经试玩，或每项宣传功能都真实有效。本文只解释现有 [DESIGN.md](../../DESIGN.md) 的取舍，不新增游戏机制，也不替实现和验收作结论。

## 读到了哪些可比较的规则

比“升级很多”更有辨识力的是变化对象与触发条件。[MagiCard](https://devsagi.itch.io/magicard) 描述七个主动卡槽，以及指向法术的修正卡；[spellloom](https://byte-jazz-games.itch.io/spellloom) 描述给两个法术装配 Essence／Aspect，形成反弹、连锁或范围效果。两者支持把行为变化写清楚，却不能证明任意搭配都有用，更不能用作者的组合数量替代逐项测试。

选择的代价也不相同。[Over/Under](https://fresh4.itch.io/over-under) 每次清房同时选升级与削弱；[Fair Squares](https://kindanice.itch.io/fair-squares) 描述玩家强化时敌人也强化；[Cavity Busters](https://spacemyfriend.itch.io/cavity-busters) 则把疾病选择与受伤条件联系起来。这些页面说明代价可以具体落在下一次战斗，但没有证明选项平衡，也没有证明玩家容易看懂。

“短局”尤其不能只当形容词。[Bucket Brawl](https://littlepuly.itch.io/bucket-brawl) 明示三分钟一场；[Damocles Gaze](https://punkcake.itch.io/damocles-gaze) 明示十二分钟、死亡不终止计时，最后九十秒用于 Boss；[WomboCombo](https://realwannabe.itch.io/wombocombo-demo) 虽使用短小的宣传措辞，Demo 一趟却明示一至两小时。三者的终点、失败后果和保存需求不同，不能用统一的“轻量肉鸽”替代比较。

## 对既有设计的来源映射

| 已有取舍 | 作者页提供的具体证据 | 这份研究不能代替的验证 |
| --- | --- | --- |
| 明确房间终点与战斗—奖励节奏 | [Looploop](https://certifiedbozo.itch.io/looploop) 明示第八房 Boss；[100 Bullet Dungeon](https://thoof.itch.io/100-bullet-dungeon) 将可回收弹药的成本留在房内，并在清房重置 | 本项目八房长度、难度递进和奖励出现频率仍需实际跑完；不是因为参考页有八房就已经合理 |
| 遗物优先改变弹丸／触发行为，并能看到组合结果 | [MagiCard](https://devsagi.itch.io/magicard) 的卡槽指向；[spellloom](https://byte-jazz-games.itch.io/spellloom) 的法术组件 | UI 上写有反弹或连锁不算实现证据；叠加、上限与可辨识度需逐项验收 |
| 给房间后的选择写出风险和收益 | [Over/Under](https://fresh4.itch.io/over-under) 的双向选择；[Fair Squares](https://kindanice.itch.io/fair-squares) 的双方强化 | 现有 Hunt／Refuge 和 Blood Pact 是项目自身选择，参考页没有验证其数值或最优解是否单一 |
| 以明确局长目标替代笼统的“短局” | [Bucket Brawl](https://littlepuly.itch.io/bucket-brawl)、[Damocles Gaze](https://punkcake.itch.io/damocles-gaze)、[WomboCombo](https://realwannabe.itch.io/wombocombo-demo) 给出不同的明示时长与终点 | DESIGN 中 4–7 分钟仍是待校准目标，不是这次阅读测得的本项目通关时间 |
| 将长期保留重点放在可选打法与有限解锁 | [Hollow Mine](https://paryszek.itch.io/hollow-mine) 保留蓝图、下局重新取得材料；[NIMRODS](https://fiveamp.itch.io/nimrods) 把前局制作的枪交给后续无人机 | 两种保留模型不能混为同一种“养成”；起始武器解锁是否足够有差异，需本项目实际体验 |
| 把暂停、重开、输入与保存作为完整性检查 | [Super Pixel Robot Rampage](https://firsttry.itch.io/sprr) 作者指出菜单不暂停；[Umberang](https://kristoff-red.itch.io/umberang) 公开缺少暂停／设置；[BLOOD DRIVE GOLF](https://bobamax.itch.io/blood-drive-golf) 明确 HTML Demo 不保存进度 | 能打开网页不等于可暂停、手机可操作或刷新后可恢复；需要独立浏览器操作证据 |

以上是来源与项目决策的对应关系，不是把参考作品中的全部系统搬入同一产品。[NIMRODS](https://fiveamp.itch.io/nimrods) 的跨局武器继承、[Count Down Dracula](https://guilloteam.itch.io/count-down-dracula) 的时间资源，以及 [Slime Crime](https://no-whone.itch.io/slime-crime) 的移动／开火／收尸互斥，分别增加不同的决策负担；现有设计并未因此获得加入所有这些系统的理由。

## 四款有限实际交互与一次失败启动

[Room Cleaner](https://spals.itch.io/room-cleaner) 的直接观察实际完成移动、踢门、拾枪、通过 FIGHT 门，并按 2 选择中间的首次升级卡。武器 HUD 由空白变为 12 发，门和交互提示也随状态改变；但教程房为无限生命，因此没有建立普通战斗难度、死亡重开或后期平衡证据。右键兼有踢、捡、扔等情境用途，首次拾取尝试落在另一个目标上；这支持检查交互目标提示，不等于证明所有情境输入都存在问题。

[100 Bullet Dungeon](https://thoof.itch.io/100-bullet-dungeon) 的直接观察进入教程并移动通过第一扇门，看到封闭房中的史莱姆追逐；无人操作期间死亡后，按 Space 回到标题。这确认启动、移动、进房和失败返回，未验证射击、清房或升级。直接嵌入视图在当时 882px 浏览器宽度下出现横向溢出，只能作为该视口的记录，不能外推到作者页全屏或所有设备。

[Bad Juju](https://sean-noonan.itch.io/bad-juju) 的补充记录实际进入房间、用键盘移动，观察到死亡提示，再按 R 返回初始布置。这支持“失败后可直接重试”的窄结论；射击尝试没有建立命中、击杀、松键换弹或 Juju 行为的直接证据，也没有清房或升级证据。

[Fair Squares](https://kindanice.itch.io/fair-squares) 的补充记录确认教程中的移动、目标射击反馈、弹药 10→2→0 和 fight! 门户的紫色转场。下一观察回到初始教程的原因不明，不能归类成已完成战斗波次、确认死亡或程序错误；也没有看到升级选择。因此其“敌我同步升级”在本包中仍属于作者页声明。

[Dead Estate CLASSIC](https://milkbar-lads.itch.io/dead-estate-classic) 仅进行启动尝试，嵌入游戏停在 GameMaker 标志，点击和 Enter 没有带来玩法画面。停留原因未建立；这一尝试不能计为实际玩法交互，更不能替作者页的机制声明作验证。

早期原报告收录为 [direct-observations.md](direct-observations.md)；后两款保留在 [playtest-report.md](playtest-report.md) 和 [playtest-report.json](playtest-report.json)。共 **4 款有限实际交互、1 次失败启动**，这些作者页已经属于 532 条记录，新增计数为 **0**。原 arena 报告的 15 张截图链接到包内 [QA 取证目录](../../.qa/research-playtests/)；root 三项观察没有另存截图，不为其声明图片证据。补充观察不提升其余台账条目的验证深度，作者页实际读过也不等于全部玩法已经验证。

## 阅读范围和样本边界

- root：132 条，多为作者正文前约 1,100–1,250 字符和元数据的广度阅读，部分长页补段；不能统一称为每页全文阅读。
- bullet：140 条，保留逐页机制、控制与未知项；组内简报明确区分未来计划、Demo 和完整版。
- dungeon：130 条，逐页记录作者描述与资料表，较远的回合制／平台动作等比较项及 excluded 不计入主台账。
- arena：130 条，作者描述与 More information 的页面阅读；嵌入区存在或 HTML5 标签不等于实际运行验证。

分组与原状态在 [ledger.jsonl](ledger.jsonl) 中保留。样本受 itch.io 标签、候选发现方式、作者自述和取样顺序影响，不是对全部动作游戏的随机抽样；机制出现频次不能直接解释为玩家偏好或成功率。

最终身份审计有 11 组标题近似候选、8 组人工判读记录，以及原型／完整版／模组观察名单；没有确认的同游戏重复。可确认的是 532 条有效页面记录与 URL 唯一性，不能据此声称已穷尽所有别名和版本关系。具体说明见 [README.md](README.md) 与 [身份审计副本](notes/identity-audit.json)。

原分组机制文字未经统一改写；原文摘录按不超过 25 英文词的上限收录。宣传内容规模、完整流程、打击感、公平性、手机舒适度、保存稳定性与长期乐趣仍需各自独立证据。研究文档不替当前实现、公开发布或产品验收作成功声明。
