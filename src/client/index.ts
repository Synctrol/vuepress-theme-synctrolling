export {
  createResolveContentAsset,
  normalizeContentAssetRef,
  resolveContentAsset,
  setContentAssetMap,
  type ContentAssetMap,
} from './assets/resolve-content-asset.js'

export * from './composables/keys.js'
// Forbidden: export { default as Layout } from './layouts/Layout.vue'
// Forbidden: export BackgroundSurface.vue
// Forbidden: any other .vue SFC re-export

export { PlatformEmbed } from './components/platforms/PlatformEmbed.js'
export { PlatformLinks } from './components/platforms/PlatformLinks.js'
