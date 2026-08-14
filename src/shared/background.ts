import type { Ref } from 'vue'
import type { ContentType } from './types.js'

export type PageContentType =
  | ContentType
  | 'release-collection'
  | 'news-collection'

export interface BackgroundReactiveContext {
  element: HTMLElement
  route: Ref<{ path: string; identity?: string }>
  contentType: Ref<{ raw: PageContentType; resolved: ContentType }>
  locale: Ref<string>
  colorMode: Ref<'light' | 'dark'>
  reducedMotion: Ref<boolean>
}

export interface BackgroundRequest {
  reason: 'init' | 'navigate'
  routePath: string
  contentType: { raw: PageContentType; resolved: ContentType }
  identity?: string
  locale: string
  colorMode: 'light' | 'dark'
  reducedMotion: boolean
}

export interface IBackgroundHost {
  request(request: BackgroundRequest): void
  dispose(): void
}

export type BackgroundModule = {
  default(context: BackgroundReactiveContext): IBackgroundHost
}

export type BackgroundLoader = () => Promise<BackgroundModule>
