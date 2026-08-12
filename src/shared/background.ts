export interface BackgroundContext {
  element: HTMLElement
  route: string
  locale: string
  colorMode: 'light' | 'dark'
  reducedMotion: boolean
}

export interface BackgroundController {
  update(context: BackgroundContext): void
  dispose(): void
}

export type BackgroundModule = {
  default(context: BackgroundContext): BackgroundController
}

export type BackgroundLoader = () => Promise<BackgroundModule>
