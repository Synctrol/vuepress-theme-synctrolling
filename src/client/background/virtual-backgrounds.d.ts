declare module 'virtual:synctrol-backgrounds' {
  import type { BackgroundLoader } from '../../shared/background.js'
  import type { ContentType } from '../../shared/types.js'
  const loaders: Partial<Record<ContentType, BackgroundLoader>>
  export default loaders
}

declare module '@synctrol/backgrounds' {
  export { default } from 'virtual:synctrol-backgrounds'
}
