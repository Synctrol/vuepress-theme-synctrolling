import type { Ref } from 'vue'
import type { ContentType } from './types.js'

export type PageContentType =
  | ContentType
  | 'release-collection'
  | 'news-collection'

/**
 * Live spectrum of the background music, refreshed once per animation frame
 * while the track plays and motion is allowed. `data` is a fixed-size array
 * of normalized bin energies (0..1) mutated in place; providers read it in
 * their own animation loop or watch `frame`.
 */
export interface BackgroundSpectrumChannel {
  active: Ref<boolean>
  frame: Ref<number>
  /** Normalized energies (0..1), refreshed per animation frame. */
  data: Float32Array
  /** Frequency resolution in Hz per `data` entry (device sample-rate aware). */
  binHz: number
  /** Overall loudness of the track in dBFS RMS (about -90 when idle). */
  rmsDb: number
}

export interface BackgroundReactiveContext {
  element: HTMLElement
  route: Ref<{ path: string; identity?: string }>
  contentType: Ref<{ raw: PageContentType; resolved: ContentType }>
  locale: Ref<string>
  colorMode: Ref<'light' | 'dark'>
  reducedMotion: Ref<boolean>
  /** Present when the site configures both `music` and a background provider. */
  spectrum?: BackgroundSpectrumChannel
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
