# 苔光来信 · Mosslight Post

送几封信，认识林间的朋友，慢慢把小屋布置成家。

这是一个有限故事的轻探索与小屋养成游戏：四格行囊改变途中可选的路线，朋友送来陈设，采集的枝叶可以换些自己喜欢的物件。没有战斗、签到、喂养、现实倒计时或离线收益。

## 游玩

- 9 封有首尾的信、3 张路线图、6 位动物朋友。
- 5 种工具、4 格行囊；每段的精力与收获提前展示，只有能够完成送信并归家的选择才可前进。
- 途中可以退回上一处。到家才结算，第一次收到的礼物会自动放进空位。
- 12 种陈设、8 处可自由布置的位置、3 个故事解锁的院景。已拥有的陈设可多次摆放，不再收费。
- 第九封之后故事完成；仍可布置、保存小院图片、翻信和重访朋友。
- 手机触控、桌面鼠标与键盘操作；F 全屏、Esc 退出；遵循减少动态效果设置。

## 保存与声音

每一步保存在当前浏览器的 `mosslight-post-v1` 中，没有账号或云同步。关闭页面不扣资源。设置提供 JSON 导出、导入；换设备、清理浏览器数据或换域名前请先备份。

损坏存档不会被静默覆盖，可以下载原文或导入备份。使用 Web Locks 串行处理同源标签页写入，并同步其他标签页的进度。存储不可用或旧浏览器没有 Web Locks 时明确显示内存模式，仍能游玩与导出；此时不会让其他标签页覆盖尚未保存的本页进度。

音乐默认关闭，主动点按后播放；切到后台暂停。音乐、音效、像素图块与动物来自作者原始素材，没有生成图或自合成音乐，详见 [ASSET-CREDITS.md](ASSET-CREDITS.md)。

## 本地开发

源码目录：`E:\Proj\Active\MyWeb\mosslight-post`。

运行环境为 Node.js 22 或更新版本，静态站无需 npm 运行依赖：

```powershell
node --check src/app.js
npm test
npm run build
python -m http.server 4318 --bind 127.0.0.1 --directory dist
```

打开 `http://127.0.0.1:4318/`。浏览器测试需要 Python 的 Playwright 与 Chromium：

```powershell
python tests/browser-check.py http://127.0.0.1:4318/
```

`build.mjs` 只清理本项目的 `dist` 后复制 `src`。运行包只包含游戏与精选素材，不包含研究下载包、测试存档或截图。

## 设计与验证

先实读 89 个不同游戏的官方或作者页面，其中 80 个有明确 Web 入口；对其中 8 款作过短试玩。素材调研包含 20 个官方页面、12 个作者/来源组。它们是页面观察与有限试玩，不能等同于通关或长期留存研究。

[设计决策](docs/DESIGN.md) 记录淘汰方案、原型反证和最终范围。[研究索引](docs/research/index.json) 保留逐站来源。`tests/playthrough-plan.json` 是模型搜索得到的九信路线，浏览器测试通过可见控件完成整段故事，不把完成状态写进存档冒充游玩。

## 发布

平台：ChatGPT Sites。沿用 `.openai/hosting.json` 中已存在的 Site 身份，不另建重复站点。运行产物为 `dist`。

站点保留原部署的稳定地址：[苔光来信](https://foreseer-focus-desk.fresh-ape-5596.chatgpt.site)。本地发布验收记录在 `.qa/release.json`，包含实际版本、公开访问与验证结果；该证据文件不进入运行包。

Windows 使用 Sites 官方 `site-workflow.mjs` 时，在该进程内优先使用 `E:\Git\bin` 与 `E:\Git\usr\bin`，并设置 `TAR_OPTIONS=--force-local`。凭据仅通过工具返回及工作流隐藏 stdin 传递，不写入文件、命令参数或 Git。

入口站继续位于 `E:\Proj\Active\personal-web`，使用既有 Vercel Git 部署；新游戏公开可访问后再加入其 MyWeb 列表。
