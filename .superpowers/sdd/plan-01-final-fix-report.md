# Plan 01 整体审查最终修复报告

日期：2026-08-11
分支：`cursor/synctrol-theme-design-ee11`
审查基线：`f94e4c4..c923222`

## 结论

Plan 01 整体审查列出的 Critical/Important 和紧邻低成本 Minor 已修复。生产
NodeNext 源码与 Bundler 测试项目均进入 `npm test` 门禁；运行时 options 采用
plain-object、own-property、危险键、枚举、布尔、数组、字符串和未知字段验证；
Node-only 注册项仍保留在 `ResolvedSynctrolThemeOptions`，但不再错误进入 VuePress
`define`；根 export 与 `./client` export 均有真实构建产物和导入 smoke。

没有修改后续计划文档，也没有实现 Background/Platform codegen。

## RED → GREEN

### A. 类型检查门禁

- RED：新增 package contract 回归后，`test:typecheck` 实际值仍只有
  `tsc -p tsconfig.test.json`，1 个测试按预期失败。
- GREEN：`npm test -- tests/package-contract.test.ts` 显示先执行
  `tsc -p tsconfig.json --noEmit`，再执行
  `tsc -p tsconfig.test.json --noEmit`，随后 package contract 通过。
- 提交：`ea18fe8 test: enforce production and test typechecks`
- 文件：`package.json`、`tests/package-contract.test.ts`

### D. Node/VuePress 版本契约

- RED：版本 contract 读取不到 `engines.node`，并检测到 rc.31 / Node 22 typings
  与目标契约不符。
- GREEN：通过 npm 安装 VuePress `2.0.0-rc.24` 和最新 Node 20 typings；
  package/lock 的 dev/peer range 均为 `^2.0.0-rc.24`，引擎为
  `^20.9.0 || >=22.0.0`。安装及后续验证没有 `EBADENGINE`。
- 提交：`b33ee8a fix: align Node and VuePress version contracts`
- 文件：`package.json`、`package-lock.json`、`README.md`、
  `tests/package-contract.test.ts`

### F. URL segment 安全

- RED：focused suite 中 11 个新增断言失败；原实现接受首尾空白、反斜杠、
  控制字符及 `%2F`/`%5C`。
- GREEN：focused options suite 当时 27/27 通过。release/news/tags 均覆盖代表性
  危险输入；合法 `Releases-2026` 原样保留。
- 提交：`9856176 fix: reject unsafe collection URL segments`
- 文件：`src/shared/options.ts`、`tests/shared/options.test.ts`

### B. 运行时 options 安全

- RED：新增 plain-object、原型键、未知字段、枚举、布尔、items 和关键字符串
  回归后，focused suite 48 个断言按预期失败。
- GREEN：focused options suite 75/75 通过，生产与测试 typecheck 同时通过。
- 提交：`b208667 fix: validate theme options at runtime`
- 文件：`src/shared/options-validation.ts`、`src/shared/options.ts`、
  `tests/shared/options.test.ts`
- 覆盖：
  - 顶层及关键嵌套配置必须为 plain object。
  - locale/mainLocale 使用 `Object.hasOwn`；拒绝 `__proto__`、`prototype`、
    `constructor`；resolved locales 使用 null-prototype 容器。
  - `defaultColorMode`、`loadStrategy`、`externalTarget` 枚举校验。
  - `showDrafts`、feeds 和全部 `enabled` 布尔校验。
  - navigation/social `items` 数组校验；platform types/backgrounds 对象校验。
  - siteUrl/mainLocale/lang/label 及 SEO、navigation/social 关键字符串校验。
  - 顶层与关键嵌套未知字段报完整字段路径；`contentDir`、`routes`、
    `routeTemplate`、`visualTokens`、`breakpoints`、
    `socialLinks.iconSize`、`release.artworkLoading` 均明确拒绝。
  - 既有默认值、部分 release/news/tags JS 嵌套默认行为及公开输入接口不变。

### E. Node-only 与 client payload 分层

- RED：新增 client options suite 时，`src/shared/client-options.ts` 不存在，
  suite 按预期无法加载。
- GREEN：新增 `ClientSynctrolThemeOptions` 与纯函数
  `toClientThemeOptions()`；focused client/smoke suite 3/3 通过。
- 自审 RED：发现 sparse array 会被 `JSON.stringify` 静默改写为 `null`，
  新增回归后 1 个断言按预期失败。
- 自审 GREEN：focused client suite 4/4 通过；保留字段中的函数、循环、非有限数、
  undefined/sparse entry 会明确报错。
- 提交：
  - `f83cede fix: separate serializable client theme options`
  - `201d59f fix: reject lossy client option serialization`
- 文件：`src/shared/client-options.ts`、`src/index.ts`、
  `tests/shared/client-options.test.ts`
- 边界：
  - `ResolvedSynctrolThemeOptions` 仍保留 `backgrounds` loaders 和
    `platforms.types` registrations。
  - client payload 显式投影并移除 `backgrounds`、`platforms.types`、
    `definitionsPath`、`feeds`、`seo`，保留 `platforms.loadStrategy`。
  - `synctrolTheme().define.__SYNCTROL_THEME_OPTIONS__` 现在只接收该 client
    payload。
  - 实现没有使用 JSON roundtrip 丢弃函数；测试以 roundtrip 深等值证明没有静默
    丢字段，并单独验证 retained nested function 会被拒绝。

### C. package/client 构建边界

- RED：package contract 显示 `src/client/index.ts` 与根 `.gitignore` 不存在，
  2 个断言按预期失败。
- GREEN：package contract 4/4 通过；`npm run test:build-smoke` 实际执行 tsc，
  再经 package exports 导入根入口与 `./client`。
- 提交：`1c43941 build: provide importable client package entry`
- 文件：`.gitignore`、`package.json`、`scripts/smoke-built-exports.mjs`、
  `src/client/index.ts`、`tests/package-contract.test.ts`
- 临时 client barrel 只有 `export {}`，没有引入 CSS。

### G. 低成本一致性

- RED：`isMultilanguageMap(['第一张专辑'])` 实际返回 `true`，focused suite
  1 个断言按预期失败。
- GREEN：类型/根导出 focused suite 5/5 通过；参数现为 `unknown`，仅
  Object/null-prototype 普通对象返回 true，null、数组和 Date 返回 false。
- 提交：`a2796a3 fix: narrow multilanguage map detection`
- 文件：`src/shared/types.ts`、`tests/shared/types.test.ts`、
  `tests/public-exports.test.ts`
- 根入口回归直接导入并使用 zh/en messages、multilanguage resolver 和 options
  resolver。

## 最终验证

- Focused GREEN：
  - package contract：4/4
  - options：75/75
  - client payload：4/4
  - types + root public exports：5/5
- `npm test`：退出码 0；9 个测试文件、105 个测试全部通过。输出先后显示生产
  NodeNext 与 Bundler 测试 typecheck。
- `npm run build`：退出码 0。
- 直接动态导入 `./dist/index.js` 与 `./dist/client/index.js`：成功；根入口含
  `synctrolTheme`，临时 client 模块为空 export。
- `npm run test:build-smoke`：退出码 0；通过 package 自引用验证 `.` 与
  `./client` exports map。
- `npm pack --dry-run`：退出码 0；30 个文件，包含
  `dist/index.js/.d.ts` 和 `dist/client/index.js/.d.ts`。
- CSS 状态：包中包含 `src/client/styles/tokens.css`，但 dist 中没有
  `tokens.css`；这是因为当前 build 只有 tsc，tsc 不复制 CSS。本修复没有声称或
  模拟 CSS 复制。
- `git diff --check`：退出码 0。
- 上述测试、构建、导入和 pack 输出均无 `EBADENGINE`。

## 自审

- 逐项复核 A–G，未发现未覆盖的要求。
- 公开 `SynctrolThemeOptions`、`ResolvedSynctrolThemeOptions` 既有字段未删除；
  默认值与现有 partial nested JS 行为有回归保护。
- `dist/`、`node_modules/` 未暂存或提交；根 `.gitignore` 已覆盖。
- 未修改 `docs/superpowers/plans/*`。
- 每个逻辑变更显式暂存、独立提交并推送。

## 剩余架构事项

Plan 05/06/07 必须通过独立 codegen/virtual module 或 bundler integration 将
Background loaders、Platform validators/components/CSP/fallback 等函数注册传给
对应运行侧。本任务只阻止这些函数被错误塞进 JSON/define payload；**没有解决也
没有尝试实现函数传输**。

Plan 05 还需定义正式 client entry 与 CSS bundling/copy 流程。当前 tsc 仅生成 JS
和声明文件，CSS 只以 `src/` 文件进入 dry-run 包。

非阻塞顾虑：本次 npm 安装报告 dev dependency tree 仍有 5 个 audit finding
（3 moderate、1 high、1 critical）；它们未造成 `EBADENGINE`，也不属于本次
Plan 01 审查修复范围，建议单独做依赖安全评估。
