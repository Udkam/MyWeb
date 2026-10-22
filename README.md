# SpriteLab · 像素动作工坊

直接在浏览器里亲手画角色、逐帧调动作，再用小舞台试跑。中文界面，无需登录。适用于小型游戏角色、像素动画练习和可导出的创作草稿。

公开使用：[SpriteLab](https://foreseer.site/spritelab/)。2026-10-16 已完成匿名生产验收；平台为 Vercel，运行资源全部同源托管。

## 源码仓库

源码：[Udkam/MyWeb · codex/spritelab](https://github.com/Udkam/MyWeb/tree/codex/spritelab)。本地目录为 `E:\Proj\Active\MyWeb\spritelab`，`origin` 指向 `https://github.com/Udkam/MyWeb.git`，当前分支跟踪 `origin/codex/spritelab`。

MyWeb 的每个网站使用独立目录和分支；仓库的 `main` 仅用于网站目录，不合并 SpriteLab 的产品树。2026-10-22 将本地原 `main` 更名为 `codex/spritelab` 并接入远端，保留原有全部提交历史。4c 入口站继续独立使用 `Udkam/personal-web` 的 `main`，公开快照仍由下述导入流程发布。

```sh
git clone --branch codex/spritelab --single-branch https://github.com/Udkam/MyWeb.git spritelab
cd spritelab
```

后续提交前先拉取本分支的远端状态，只精确暂存本轮文件并正常快进推送，不改写其他网站分支。仓库连接整理记录见 [CHANGELOG](docs/logs/CHANGELOG.md)。

## 开发

独立源码目录：`E:\Proj\Active\MyWeb\spritelab`。运行文件全部位于 `src`，没有在线 CDN、后端服务、用户文件上传或额外账户。

```sh
npm ci
npm run check
npm test
npm run build
npm run dev
```

使用 Node.js 22+；本地预览命令需要 Python 3。访问 `http://127.0.0.1:4392/`。`dist` 仅用于构建检查；发布导入器只读取已经提交的 `src`。

## 可用功能

- 三组可编辑原创模板：森林信使、苔芽团子、口袋火苗；也可新建 16/32/64 像素空白作品。
- 画笔、橡皮、连通填充、取色、直线、空心矩形、选区与移动，1–8 像素笔刷、左右对称、透明度、调色板、自定义颜色。
- 图层可增删、改名、排序、隐藏、调不透明度；逐帧复制、增删、排序、独立停留时间，动作分组，前后帧洋葱皮。
- 播放速度、单帧步进、三种预览背景；试跑时用方向键 / A D 移动，空格跳跃，触屏有对应按钮。
- 本机自动草稿、撤销重做、项目 JSON 下载与重新导入。
- 导入静态 PNG 或无间距的规则精灵图；导出透明 PNG 精灵图、帧坐标与时长 JSON、逐帧 PNG ZIP、当前帧和可编辑项目。

建议先复制一帧，再调整姿态；预览与画布分别显示播放帧和正在编辑的帧。导出不含网格、棋盘格、舞台背景或洋葱皮。PNG 本身不携带动画时长，需同时保留时长 JSON 或逐帧 ZIP 内的 `timing.json`。

## 数据与范围

草稿属于当前浏览器、当前站点；清理浏览器数据或换设备不会自动同步。需要长期保留时点击「保存项目」下载 `.spritelab.json`。新建或导入会明确询问是否替换草稿。IndexedDB 保存失败会显示错误，不声称保存成功。另留上一份成功保存的副本，用于当前草稿校验失败后的恢复。

作品最大 128×128，4 个图层、8 个动作，每动作最多 64 帧；全部图层和帧共最多 2,097,152 像素。每帧 30–2000ms。历史记录最多 40 步并受 32MiB 估算内存限制，大作品实际可撤销步数会减少。

PNG 输入最多 16MiB、单边 8192、总像素 2,097,152。支持灰度、调色板、RGB/RGBA 与 Adam7；16 位 PNG 转为高 8 位，不应用色彩配置文件，完全透明像素规范化为零。APNG 会明确拒绝。导入分格不包含外边距或帧间距。项目文件最多 32MiB。精灵图最大 16,777,216 像素，支持 1–8 整数倍最近邻放大。时长 JSON 是 SpriteLab 的开放描述数据，不声称直接兼容所有引擎。

## 发布

平台：Vercel，复用 4c 已有项目的 `/spritelab/`。生产验收结果记录在 `docs/ACCEPTANCE.md`；公开入口已通过资源哈希和真实浏览器文件往返检查。

```sh
# 在本独立目录提交已经验收的源文件，然后在 personal-web 执行：
node scripts/import-spritelab.mjs E:/Proj/Active/MyWeb/spritelab <source-commit>
```

导入器将精确源 SHA 和每文件 SHA256 写入公开 `release.json`。遵循入口站的检查顺序并正常推送 `main`。发布后验证真实 HTTP 资源哈希、匿名功能与下载，再加入 `src/data/sites.ts`。

## 结构与验收

- `src/core.js`：像素数据、笔画、合成、结构校验、历史。
- `src/io.js`：PNG 无损样本读写、精灵图、ZIP、项目和 IndexedDB。
- `src/stage.js`：逐帧播放、舞台与移动跳跃。
- `src/templates.js`：原创逐帧教学模板。
- `src/app.js`、`index.html`、`styles.css`：编辑器交互与响应式布局。
- `tests/*.test.mjs`：不依赖浏览器的逻辑及事件测试。
- `tests/io_acceptance.py`、`tests/ui_acceptance.py`：Python Playwright 浏览器验收；需要 Playwright、Chromium 和 Pillow。先启动预览服务，IO 脚本通过环境变量 `SPRITELAB_TEST_URL` 指定地址（默认本地 4392），UI 脚本传入 `--url http://127.0.0.1:4392/` 使用真实 HTTP。测试使用独立浏览器环境和生成的文件，不使用用户作品。
- `.qa/`：本地浏览器截图、实际下载、报告；不进入 Git 或运行目录。

源代码与原创示例采用 MIT 许可，第三方 fflate 许可随站同源提供，见 `src/vendor/NOTICE.md`。产品取舍见 `docs/PRODUCT-DECISION.md`。
