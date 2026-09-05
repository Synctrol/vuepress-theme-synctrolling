# 符号化交互音效（Interaction Sound Effects）

日期：2026-09-05

> 更新 2026-09-05（二期）：接入作者提供的 9 个 wav 素材并新增**背景音乐**功能：
> 顶层选项 `music`（`'/'` 开头公开 URL，文件固定放消费站 `.vuepress/public/music/`），
> 顶栏「背景乐」chip 手动开（默认关、不持久化、必须手势触发）、循环 + 0.7s 淡入/淡出、
> 切页不中断、与交互音效并存；消息键 `musicOn` / `musicOff`。
>
> 更新 2026-09-05（三期）：**音乐频谱 → 背景可视化通道**。`music` 与
> `background` 同时配置时，媒体元素经 `createMediaElementSource → AnalyserNode`
> 分析；背景提供者上下文新增可选 `spectrum`（`active`/`frame` refs + 64 频段
> 0..1 的 `data`，rAF 刷新，随播放启停、reduced-motion 停用、停止清零）。Demo
> 的 flow 背景按低/中频能量做缩放/位移「呼吸」示例。

## 目标

主题内建一套「符号化」交互音效运行时：每个语义化交互键对应一个可选短音频，
缺文件则该键静默。音频素材由站点作者提供，主题只负责播放基础设施、触发接线、
总开关与无障碍降级。

## 决策（已与作者确认）

- 功能做进主题包；consumer-smoke fixture 暂不配真实音频（无配置时功能休眠）。
- 固定键位 9 键，可选文件：
  `navigate`、`menuOpen`、`menuClose`、`themeCycle`、`localeChange`、
  `paginate`、`tabSelect`、`accordionToggle`、`embedActivate`。
- 覆盖全部交互，无 hover 音。
- 顶栏 ThemeMode 旁提供 chip 总开关（默认开，localStorage 记忆，键
  `synctrol:sounds`，值 `on|off`）。
- `prefers-reduced-motion: reduce` 时全部静默并挂起 AudioContext。
- WebAudio 播放：仅在用户手势后创建/恢复上下文；缺省时全部调用为 no-op。
- 防连击：同一键 80ms 内重触发忽略；不同键可重叠。
- `navigate` 在路由 `afterEach` 成功后播放；分页点击与抽屉内链接选择只播各自
  语义键（`paginate` / `menuClose`）并抑制随后的 navigate。

## 触发映射

| 键 | 触发点 |
| --- | --- |
| navigate | 内部链接 SPA 导航成功（路由器 afterEach；被抑制场景除外） |
| menuOpen / menuClose | 汉堡菜单开/合（HeaderBar、NavDrawer Escape/视口回桌面、抽屉内选链） |
| themeCycle | ThemeMode cycle |
| localeChange | LanguageSwitcher 选定语言（整页跳转前） |
| paginate | PaginationNav 链接（data 标记分类） |
| tabSelect | TabView 实际切换面板 |
| accordionToggle | Accordion 展开/折叠 |
| embedActivate | PlatformEmbed 从 idle 首次激活 |

## 主题选项

```ts
sounds?: {
  enabled?: boolean   // 默认 true；作为未存储偏好时的初始值
  keys?: Partial<Record<SoundKey, string>>  // 站点公开 URL 路径，以 '/' 开头
}
```

音频文件放 `.vuepress/public/sounds/`，键值写如 `'/sounds/navigate.webm'`。
未知键、非法路径值是构建错误；文件缺失允许（对应键运行时静默）。
客户端经 `toClientThemeOptions` 注入 `sounds`；无任何键时开关不渲染、引擎休眠。

## 结构

- `src/shared/options.ts`：`SoundKey` / `SOUND_KEYS` / `SoundsOptions` + resolve
- `src/shared/options-validation.ts`：字段白名单与值校验
- `src/shared/types.ts`、`messages.ts`：新增 `soundOn` / `soundOff` 消息
- `src/shared/client-options.ts`：客户端选项拷贝（含 assertJsonSafe）
- `src/client/sounds/storage.ts`：偏好读写（纯函数）
- `src/client/sounds/engine.ts`：引擎（注入 storage/ctx/fetch/reduced/now）
- `src/client/sounds/runtime.ts`：浏览器单例接线 + `playSound(key)` + 测试替身入口
- `src/client/components/SoundToggle.vue`：chip 开关
- `src/client/music/music.ts`、`music/runtime.ts`、`components/MusicToggle.vue`：背景乐播放器与 chip
- `src/client/config.ts`：setup 中启动引擎、注册 afterEach
- `src/client/navigation/intercept-internal-links.ts`：点击分类（paginate/抽屉）
- 接线组件：HeaderBar、NavDrawer、ThemeMode、LanguageSwitcher、Accordion、
  TabView、PlatformEmbed、PaginationNav（链接标记）

## 测试

- `tests/shared/sounds-options.test.ts`：默认值、校验错误（未知键/坏值）
- `tests/client/sounds/storage.test.ts`、`engine.test.ts`（fake ctx 注入：
  开关、防重、reduced-motion、缺 URL、suppress navigate）
- `tests/client/sounds/sound-toggle.test.ts`：渲染/隐藏、点击持久化
- 组件 cue 断言（现有套件内小改动）：ThemeMode / Accordion / TabView /
  HeaderBar（开合）/ LanguageSwitcher / PlatformEmbed / 拦截分类与抽屉请求关闭

## 文档

README（中文，站点作者）加 `sounds` 选项行与音频小节；AGENTS.md 同步功能与
`.vuepress/public` 措辞（允许 `/sounds/` 固定名音频）；不重建已删除旧契约。
