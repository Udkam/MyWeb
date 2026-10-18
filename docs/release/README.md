# 当前发布

- 游戏：https://tetramorph.vercel.app/
- 源码：https://github.com/Udkam/MyWeb/tree/codex/tetramorph
- 本地：`E:\Proj\Active\MyWeb\TetraMorph`；独立分支 `codex/tetramorph`。
- Git：`origin` 指向 `Udkam/MyWeb`；`legacy` 保留原 `Udkam/TetraMorph` 仓库。
  原仓库已设为 archived，只读保留完整历史。
- 托管：Vercel 项目 `tetramorph` 已连接 `Udkam/MyWeb`，Production Branch
  为 `codex/tetramorph`；现有域名保持不变。
- 平台验收：迁移提交 `ac7afcea` 已 Ready/current；首页、`/play`、`/endgames`
  返回 200，经典模式和残局界面实际可用。
- 构建：Node 24.x，`npm ci` → `npm run build`，仅发布 `dist/`。
- 配置：根目录 `vercel.json`；游戏/残局直达路径回退到首页，静态资源缺失保留 404。

## 分支构建过滤

Vercel 项目的 Ignored Build Step 使用 Custom 命令：

```sh
test "$VERCEL_GIT_COMMIT_REF" != "codex/tetramorph"
```

该步骤退出码为 `0` 时跳过构建，为 `1` 时继续构建。因此只有
`codex/tetramorph` 分支会构建，目录主分支及其他网站分支均跳过；不要反转判断。
Node 24、Vite、仓库根目录与 `dist/` 输出配置保持不变。

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
