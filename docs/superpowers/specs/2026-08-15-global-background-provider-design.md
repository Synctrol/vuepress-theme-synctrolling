# 全局背景提供者设计

日期:2026-08-15
状态:已批准

## 目标

把背景从「按内容类型拆分模块、主题负责类型切换」重构为「单一常驻全局背景提供者」。SPA 会话内提供者只加载一次，接收主题推送的「页面申请」，自行编排页面间背景切换（动画 / 交叉淡化 / 硬切）。背景可以是任意绘制来源（图片 / SVG / Canvas / WebGL / WebGPU）。

两个核心诉求：

1. SPA 内每次导航，主题向提供者发送一次「新页面申请」；提供者据此决定如何切换背景。
2. 任意页面打开（含硬加载）时，提供者提供正确的背景。

## 决策摘要

- 删除 `backgrounds` 按类型模块 map；新增单一配置项 `background: './backgrounds/host'`（模块路径字符串，breaking change）。
- 消费者实现 `IBackgroundHost` 接口；模块默认导出为工厂 `(context) => IBackgroundHost`（等价于 `(context) => new XXXHost(context)`，工厂体写在 host 模块文件里而非 config 内联）。
- 主题向提供者交付一个**响应式上下文**（Vue 只读 refs）供其自行 watch；每次导航（含首次挂载）以**同步** `request(snapshot)` 推送，不产生 Promise，动画混合交给提供者自理。
- 视口尺寸 / DPR 不进主题契约：提供者从自身绘图上下文读取，每个 `requestAnimationFrame` 自行适配；主题不监听 resize。
- 提供者加载失败回退纯色 `var(--syn-bg)`（保留现状）。
- SSR 不变：仅客户端初始化。

## 配置面

```ts
// config.ts
synctrolTheme({
  background: './backgrounds/host',
})
```

```ts
// backgrounds/host.ts —— 消费者写工厂，等价于 (context) => new XXXHost(context)
import type { BackgroundModule } from 'vuepress-theme-synctrolling'

const module: BackgroundModule = {
  default(context) {
    return new MyHost(context)
  },
}
export default module.default
```

- 不配置 `background` → 纯色背景。
- `background` 是模块路径字符串（相对 VuePress 配置目录），主题解析后生成客户端懒加载 `() => import(<abs path>)`。之所以是字符串而非内联 `() => import(...)` 工厂：VuePress 会用 esbuild 打包 config 文件，内联的动态 `import()` 会被改写（`Function.prototype.toString` 无法还原路径）；字符串字面量则原样保留。

## 契约（`src/shared/background.ts` 重写）

```ts
import type { Ref } from 'vue'

// 响应式上下文：init 时交给提供者，之后提供者自行 watch
interface BackgroundReactiveContext {
  element: HTMLElement
  route: Ref<{ path: string; identity?: string }>
  contentType: Ref<{ raw: PageContentType; resolved: ContentType }>
  locale: Ref<string>
  colorMode: Ref<'light' | 'dark'>
  reducedMotion: Ref<boolean>
}

// 页面申请快照：每次导航（含首次挂载）同步推送，无 Promise
interface BackgroundRequest {
  reason: 'init' | 'navigate'
  routePath: string
  contentType: { raw: PageContentType; resolved: ContentType }
  identity?: string
  locale: string
  colorMode: 'light' | 'dark'
  reducedMotion: boolean
}

interface IBackgroundHost {
  request(request: BackgroundRequest): void // 同步通知；并发/混合由 host 自理
  dispose(): void
}

type BackgroundModule = {
  default(context: BackgroundReactiveContext): IBackgroundHost
}

type BackgroundLoader = () => Promise<BackgroundModule>
```

- `PageContentType = ContentType | 'release-collection' | 'news-collection'`（沿用 `resolve-type.ts` 的类型）。
- `request` 快照里的 `locale` / `colorMode` / `reducedMotion` 是请求时刻的点拷贝，仅为 init 时不必依赖 ref 时序的便利；**持续变化以 refs 为准**，二者出现差异时 refs 是权威。
- `BackgroundReactiveContext` 引用 Vue `Ref`（type-only import，运行时擦除，Node 编译器侧安全）。

## 主题运行时

- `BackgroundRuntime`（`src/client/background/runtime.ts` 重写）：职责从「类型切换 + 模块生命周期」改为「加载一次提供者 + 转发页面申请」。保留加载的 generation guard 防过期挂载；`setHost` 时先涂纯色，异步 import 提供者，构造 host，成功后转发当前待发申请。
- `BackgroundSurface.vue`（由 `BackgroundHost.vue` 改名，避免与 `IBackgroundHost` 同名冲突）：挂载时 `mount(el)` 并 push 首次 `request({ reason: 'init' })`；导航时 push `request({ reason: 'navigate' })`；卸载时 `dispose()`。
- `useBackgroundRuntime` 组合式函数：从 `useData` / `useRoute` / colorMode / reducedMotion 构建响应式 refs，交给 runtime；导出 `runtime` 与 `requestInput`（完整的 `BackgroundRequest` 快照，但**只在页面身份变化时重新计算**，环境变化不触发 request）。
- 环境变化（colorMode / locale / reducedMotion）：只更新 refs，不发 request。
- 快速连续导航：主题每条都推，不串行化；排队 / 打断 / 混合由提供者内部处理。

## 数据流

```text
配置 background loader
  → 编译器提取路径 → 虚拟模块导出单一 loader
  → 客户端 useBackgroundRuntime 构建 refs + 实例化 runtime
  → BackgroundSurface 挂载 → runtime.mount(el) 加载提供者并构造 host
  → request({ reason: 'init' }) / 每次导航 request({ reason: 'navigate' })
  → host 内部按 contentType/route 编排视觉与过渡
  → 环境 refs 变化 → host watch 自行适配
  → 卸载 → host.dispose()
```

## 迁移（breaking）

- 公开选项：`backgrounds` 移除，`background` 新增；`backgrounds` 再出现时报 `UNKNOWN_FIELD`。
- 公开类型：移除 `BackgroundController`（`update` 语义消亡）；`BackgroundContext` 改名/重构为 `BackgroundReactiveContext`；新增 `BackgroundRequest`、`IBackgroundHost`。
- 编译器：`emit-virtual-module` / `vite-plugin` 从「按类型 map」改为「单一路径字符串 → 单 loader」；移除 `extract-loader-specifier`（源码级路径提取不可靠）。虚拟模块 id `virtual:synctrol-backgrounds` 与别名 `@synctrol/backgrounds` 保留，默认导出形状改为单 loader。
- `resolve-type.ts`：保留 `PageContentType` 与 `resolveBackgroundContentType`（resolution 变上下文字段，不再驱动模块切换）。
- 文档：`AGENTS.md`（`backgrounds` 选项说明）与 README 同步更新。

## 测试范围

- `tests/client/background/`：fixture 宿主（实现 `IBackgroundHost`）+ 重写现有用例：init request、导航 request、refs 响应 colorMode / reducedMotion、加载失败回退、无 contentType 不加载、dispose 清理。
- `tests/compiler/backgrounds/`：虚拟模块发射单 loader、loader 提取校验（`background` 报错文案）、vite plugin 单值。
- `tests/shared/`：options schema（`background` 合法、`backgrounds` → UNKNOWN_FIELD）、client-options 仍不携带 `background`（走 Vite plugin 而非 define JSON）。
- `tests/publish/`：README / 文档锁定（若涉及选项名变更）。

## 不在范围内（YAGNI）

- 主题不提供多背景并存 / 交叉淡化协调（提供者内部自理）。
- 主题不提供视口、滚动、指针、可见性输入（提供者自行监听）。
- 不改根语言路由器页（`/` 仍不加载背景，见原设计第 13 节）。
