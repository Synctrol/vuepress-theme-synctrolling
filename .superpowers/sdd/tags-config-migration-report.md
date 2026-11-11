# 新闻标签配置迁移报告

## 状态

已将新闻标签词汇迁移到 `synctrolTheme({ tags })`。`tags` 默认 `{}`，标签键沿用安全路由段校验，每项仅允许 `title: Multilanguage`；`definitionsPath`、定义文件加载器及其公开导出均已删除。

内容编译器现在从解析后的主题选项接收 `ContentDefinitions = { tags }`。测试夹具、消费端冒烟配置、README、AGENTS 与 CHANGELOG 已同步，仓库中不再包含 `definitions.yml`。

## 验证

- `npm run test:typecheck`：通过
- 迁移核心测试：通过（7 个测试文件，169 个测试）
- `npx vitest run --exclude tests/client/styles/shell-css.test.ts`：通过（164 个测试文件，954 个测试，其中 5 个跳过）
- `npm run build`：通过
- `npm test`：迁移相关测试通过；唯一失败来自任务开始前已存在的 `src/client/styles/shell.css` 未提交图标按钮改动与 `tests/client/styles/shell-css.test.ts` 旧断言不一致，本次未覆盖该无关改动
