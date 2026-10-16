# SpriteLab

此目录是独立编辑源。公开快照位于 `E:\Proj\Active\personal-web\public\spritelab`，不要在那里直接修改。

- 使用 UTF-8。运行代码放在 `src`，第三方许可随源码保留，不上传用户作品。
- 项目数据为 `core.js` 校验的 JSON 格式。变更格式需迁移与导入测试，不静默丢失图层或逐帧时长。
- 像素为无符号 `0xRRGGBBAA`，完全透明为0。导出透明 PNG 不经 Canvas 预乘/反预乘往返。
- 修改后依次运行 `npm run check`、`npm test`、`npm run build`。交互和导出改动需真实浏览器验收，并检查实际下载内容。
- `.qa`、`dist`、截图、凭据和用户数据不提交，不进入站点快照。清理仅限本任务已核实路径。
- 独立源提交后通过入口站 `scripts/import-spritelab.mjs` 导入精确 SHA，完成入口站全部检查，再由原 Vercel Git 集成发布。
- 部署、源码提交和功能验收分别记录；只有生产 URL 与资源实际验证成功才能声称已上线。
