# Cinder Below 研究证据包

整理日期：2026-10-14（Asia/Shanghai）。本包收录 **532 条实际读取作者游戏页后形成的研究记录，规范 URL 共 532 个且互不重复**。这是作者页研究计数，不是试玩数量，也不是已经证明彼此完全独立的 532 个游戏身份。

## 文件入口

- [summary.md](summary.md)：阅读发现、既有设计取舍的来源映射和证据限制。
- [ledger.jsonl](ledger.jsonl)：连续编号的完整台账，一行一个 JSON 对象。
- [manifest.json](manifest.json)：各输入文件的 SHA-256、分组数量、编号范围、交付文件校验值与验证结果。
- [notes/README.md](notes/README.md)：原分组简报和人工逐页笔记精选的说明。
- [notes/identity-audit.json](notes/identity-audit.json)：最终 532 条版本的身份去重审计副本。
- [direct-observations.md](direct-observations.md)：Room Cleaner、100 Bullet Dungeon 的有限实际交互，以及 Dead Estate CLASSIC 的失败启动记录。
- [playtest-report.md](playtest-report.md)、[playtest-report.json](playtest-report.json)：Bad Juju 与 Fair Squares 的两次短浏览器操作观察。

两组报告合计 **4 款有限实际交互＋1 次失败启动**，涉及的作者页已经在台账内，因此新增计数为 **0**。失败启动不作为玩法证据。

## 精确计数

| 分组 | 唯一计数源文件 | 条数 | 合并编号 |
| --- | --- | ---: | --- |
| root | `action-research/root/verified.jsonl` | 132 | CBR-0001—CBR-0132 |
| bullet | `action-research/bullet/records.jsonl` | 140 | CBR-0133—CBR-0272 |
| dungeon | `action-research/dungeon/verified.jsonl` | 130 | CBR-0273—CBR-0402 |
| arena | `action-research/arena/arena-reviewed.jsonl` | 130 | CBR-0403—CBR-0532 |
| 合计 | 仅以上四个已审读文件 | **532** | 连续、无缺号 |

`excluded`、`comparators`、候选列表、目录页、抓取成功但没有完成研读的页面，均不计入 532。分组简报是当时的工作快照，可能提及 50／100 条阶段、500 条目标或尚待身份复查；最终数量与复查状态以上表及 manifest 为准。精选笔记不是额外样本。

## 台账规则

合并固定采用 root、bullet、dungeon、arena 顺序，组内保留源文件行序。新增 `ledger_number`、`ledger_id`、`source_group`、`source_file`、`source_line` 和 `evidence_level` 以便定位来源。原记录中的 `observed_mechanics` **逐条原样保留**，包括原有字符串／数组类型；原状态、阅读方法、时间和可用内容哈希也保留，不把各组不同的状态名强行改成同一种验证。

唯一可能缩短的原字段是 `description_excerpt`：交付版同时限制为最多 25 个空白分词、最多 25 个英文词。英文词按字母词及内部连字符／撇号计数。触发缩短时，记录添加 `excerpt_truncated_for_publication` 与原摘录 SHA-256；完整原文不复制进交付包。源文件本身不修改。

`evidence_level=author_page_read` 描述这条台账的取证方式。保留的 `playtested:false` 或“not played”属于原阅读阶段；有限实际交互与失败启动由独立报告补充，不把短观察升级成全部机制实测。

## 去重及版本边界

最终审计记录 532 个唯一 URL、0 个完全相同 URL、0 组已确认的同游戏重复，同时保留 **11 组标题近似候选与 8 组人工判读记录**。后两组不是逐项一一对应，不能解释为“11 项中只剩 3 项”或“全部身份已获证明”。标题相近、作者相同都不足以直接合并；原型、移植、升级版和模组的版本关系另有观察名单。

版本观察名单中的 Don't Bite Me Bro! Deluxe 在本台账只有 Deluxe 这一条 URL，没有重复计入另一条免费本体记录。Card Retrieve 的更新版、Scalable Dungeons 的旧 Jam 版及 Help! 对应的 Colt Canyon 也没有作为第二条版本 URL 重复计入。版本观察名单继续保留，供以后扩充记录时复查。

## 阅读与操作观察的边界

作者页中的功能、数量、平衡、性能、联网、手机适配、存档能力与时长，首先都是作者声明。root 分组多为正文前约 1,100–1,250 字符加元数据的广度阅读，部分长页补读；其他组的方法以各条 `read_method` 和精选简报为准。正文实际读过，不代表所有长页逐段读完，更不代表实现逐项验收。标签、HTML5 标记或出现游戏嵌入区，也不能单独证明可玩。

补充观察按实际到达的状态分别记录：

- Room Cleaner：实际移动、踢开第一扇门、拾取手枪、通过 FIGHT 门，并按 2 选择首次升级。教程房为无限生命，不能据此判断普通战斗难度、死亡重开或后期平衡。
- 100 Bullet Dungeon：实际启动、教程移动、进入第一间封闭房，随后在无人操作期间死亡并按 Space 回标题。未验证射击、清房或升级；无人操作死亡不等于难度不公平。观察到的横向溢出仅限当时 882px 直接嵌入视口。
- Bad Juju：实际进入房间、移动、出现死亡提示并按 R 重开；未确认命中、击杀、换弹或 Juju 行为，也未清房或见到升级。
- Fair Squares：实际移动射击目标、弹药 10→2→0，并经过 fight! 门户转场。随后回到初始教程的原因没有观察清楚，未确认完整波次或升级选择。
- Dead Estate CLASSIC：嵌入游戏停在 GameMaker 标志，点击／Enter 未进入玩法；原因不明，**没有玩法验证贡献**。

上述记录不支持完整流程、全部作者声明或长期体验结论。Room Cleaner 确认到达一次升级选择，不应与其他三款的未到达状态混写。

原 arena 两款报告的 15 张截图在交付包的 QA 目录 [`.qa/research-playtests/`](../../.qa/research-playtests/)，报告和 manifest 均使用从 `docs/research/` 出发的 `../../.qa/research-playtests/<filename>`。已逐张核对 SHA-256；图片用于取证，不作为游戏素材或 runtime 资源。root 的三项观察只有原报告和当时的 CUA 工具输出，没有另存截图，本包没有为其补造图片证据。

本包不包含抓取正文、HTML、安装包或原始网页缓存。输入文件 SHA-256 固定的是本次整合使用的本地快照，不证明作者页面此后没有变化。校验交付文件时，在此目录对 manifest 的 `artifacts` 逐项重新计算 SHA-256；manifest 不记录自身哈希，以避免自引用。
