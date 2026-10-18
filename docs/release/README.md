# 当前发布

- 游戏：https://tetramorph.vercel.app/
- 源码：https://github.com/Udkam/MyWeb/tree/codex/tetramorph
- 本地：`E:\Proj\Active\MyWeb\TetraMorph`；独立分支 `codex/tetramorph`。
- Git：`origin` 指向 `Udkam/MyWeb`；`legacy` 保留原 `Udkam/TetraMorph` 仓库，原完整历史不改写。
- 托管：保留 Vercel 项目 `tetramorph` 和现有域名；目标 Git 连接为
  `Udkam/MyWeb` / `codex/tetramorph`。平台重连与线上验收单独执行，不能仅凭源码上传声称连接已切换。
- 构建：Node 24.x，`npm ci` → `npm run build`，仅发布 `dist/`。
- 配置：根目录 `vercel.json`；游戏/残局直达路径回退到首页，静态资源缺失保留 404。

## 更新前

运行 `npm run typecheck`、`npm test`、`npm run build`、`npm run test:release`。
检查精确暂存路径、独立 QA 后推送；等待目标 SHA 的 Vercel success，并实际访问网站。
不要把旧部署失败邮件误认为当前部署失败，要核对邮件里的提交 SHA。

## 验证与回滚

检查首页、四模式、直达刷新、图标/字体、控制台和输入。
需要回滚时使用 Vercel 已验证部署或 Git revert，不强推，不改用户存档。
绑定新域名需要另外确认；localStorage 按域隔离，旧域进度不会自动迁移。

发布过程：[T39 记录](../agent-runs/t39-publication/STATE.md) / [QA](../agent-runs/t39-publication/QA.md)。
详细工程背景：[T38 发布候选说明](T38-RELEASE.md)（未上线等描述是当时历史状态）。
