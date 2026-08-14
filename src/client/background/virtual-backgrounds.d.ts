declare module 'virtual:synctrol-backgrounds' {
  import type { BackgroundLoader } from '../../shared/background.js'
  const loader: BackgroundLoader | undefined
  export default loader
}

declare module '@synctrol/backgrounds' {
  export { default } from 'virtual:synctrol-backgrounds'
}
