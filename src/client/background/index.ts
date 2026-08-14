export type {
  BackgroundReactiveContext,
  BackgroundRequest,
  IBackgroundHost,
  BackgroundLoader,
  BackgroundModule,
  PageContentType,
} from '../../shared/background.js'
export { resolveBackgroundContentType } from './resolve-type.js'
export {
  readReducedMotion,
  subscribeReducedMotion,
  REDUCED_MOTION_QUERY,
} from './reduced-motion.js'
export { BackgroundRuntime } from './runtime.js'
export type {
  BackgroundRuntimeOptions,
  BackgroundRuntimeContextRefs,
} from './runtime.js'
export { useBackgroundRuntime } from './use-background-runtime.js'
export type { SynctrolClientPageData } from './types.js'
// Forbidden: export BackgroundSurface.vue
