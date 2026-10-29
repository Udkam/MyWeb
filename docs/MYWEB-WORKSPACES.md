# MyWeb 工作区与源码入口

核对日期：2026-10-30。

`E:\Proj\Active\MyWeb` 是工作区容器，不是 Git 根。父目录只保留以下三个网站的工作区；开发文档、素材、依赖与验收资料写入各自工作区。进入子目录后先读其 README 与 AGENTS。

| 本地目录 | Udkam/MyWeb 分支 | 正式入口 |
| --- | --- | --- |
| `E:\Proj\Active\MyWeb\TetraMorph` | `codex/tetramorph`（仓库默认） | https://tetramorph.vercel.app/ |
| `E:\Proj\Active\MyWeb\cinder-below` | `codex/cinder-below` | https://foreseer.site/cinder-below/ |
| `E:\Proj\Active\MyWeb\spritelab` | `codex/spritelab` | https://foreseer.site/spritelab/ |

三个检出的 `origin` 均为 `https://github.com/Udkam/MyWeb.git`，分别跟踪同名远端分支。只在对应网站的分支工作，不把不同网站的产品树合并，也不重新建立目录专用的 `main`。TetraMorph 的 `legacy` 是已归档的旧独立仓库，不是当前发布目标。

个人门户独立位于 `E:\Proj\Active\personal-web`，使用 `Udkam/personal-web` 的 `main`。TetraMorph 使用独立 Vercel 项目；Cinder Below 和 SpriteLab 通过个人门户的导入脚本按精确源提交发布静态快照。只推送后两者的源码分支不会自动更新门户。

## 已停止的制作

2026-10-30，用户明确判定 **Cutlass Wake / IRONMOLT 验收不通过**，终止制作并要求删除本地文件及仓库备份。制作 Goal 已暂停，对话已标记“不通过·已停止”并归档；不继续打磨、扩章、部署或恢复该项目。

清理对象为 `cutlass-wake` 独立目录、游戏交接临时文件、远端 `codex/cutlass-wake`、旧策划 `codex/game-next`、目录专用 `main` 及失效的本地分支引用。没有新建源码备份。分支删除不等同于从 GitHub 的对象存储或平台缓存中彻底擦除历史提交；本次没有改写三个保留网站的提交历史。

当前三个正式站点的公开地址、产品源码和门户快照保持原状。本次清理范围为本地工作区与 GitHub 分支，未操作旧 Cutlass Wake 的 Vercel 历史部署。
