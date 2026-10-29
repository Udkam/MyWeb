# SpriteLab Changelog

## 2026-10-30

- 按用户要求清理 MyWeb 退役项目后，更新 README 的当前分支说明：仓库只保留三个正式网站分支，默认分支为 `codex/tetramorph`，工作区目录说明位于该分支的 `docs/MYWEB-WORKSPACES.md`。
- 本轮只更新仓库说明，没有修改 SpriteLab 产品源码或个人门户的已发布快照。

## 2026-10-22

- 将独立源码目录 `E:\Proj\Active\MyWeb\spritelab` 的本地 `main` 分支更名为 `codex/spritelab`，接入 `https://github.com/Udkam/MyWeb.git` 的同名远端分支。保留原有 `87309d8`、`14cd2b0` 两条提交及其完整历史，不将产品树合并到 MyWeb 的目录分支。
- 在 README 明确源码仓库、本地目录、分支跟踪及独立克隆方式。入口站仍是独立的 `Udkam/personal-web`，公开快照继续使用既有导入和 Vercel 发布流程。
- 本轮仅整理 Git 连接和上述文档，未修改运行源码、构建文件、存档格式、公开站点快照或生产部署。检查文档 UTF-8、相对链接、Git whitespace、远端分支 SHA 及工作区状态；未将此前产品验收冒充为本轮重新运行。
