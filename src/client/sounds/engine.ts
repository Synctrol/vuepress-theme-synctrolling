import { REDUCED_MOTION_QUERY } from '../background/reduced-motion.js'
import type { SoundKey } from '../../shared/options.js'
import { readSoundEnabled, writeSoundEnabled } from './storage.js'
import type { SoundStorageLike } from './storage.js'

export const SOUND_MIN_INTERVAL_MS = 80
export const SOUND_NAV_SUPPRESS_MS = 1000

/**
 * True when the browser reports an active user activation; undefined when the
 * API is unavailable (older browsers fall back to allowing the cue).
 */
function hasActiveUserGesture(): boolean | undefined {
  const activation = (
    typeof navigator === 'undefined' ? undefined : navigator
  ) as { userActivation?: { isActive?: boolean } } | undefined
  if (activation?.userActivation === undefined) return undefined
  return activation.userActivation.isActive === true
}

export interface SoundSourceLike {
  buffer: unknown
  connect(destination: unknown): void
  start(): void
}

export interface AudioContextLike {
  state?: string
  destination: unknown
  createBufferSource(): SoundSourceLike
  decodeAudioData(data: ArrayBuffer): Promise<unknown>
  suspend(): void | Promise<void>
  resume(): void | Promise<void>
  close(): void | Promise<void>
}

export interface SoundsEngineOptions {
  storage: SoundStorageLike
  /** Preference used when storage holds no value yet. */
  enabledFallback: boolean
  /** Configured public URLs per key. */
  urls: Partial<Record<SoundKey, string>>
  /** Absolute fetch URLs for the configured values (base already applied). */
  absoluteUrls: Partial<Record<SoundKey, string>>
  createContext: () => AudioContextLike | null
  fetchBuffer: (url: string) => Promise<ArrayBuffer>
  log?: Pick<Console, 'warn'>
  now?: () => number
}

function settle(result: void | Promise<void>): Promise<void> {
  return Promise.resolve(result).catch(() => {})
}

export class SoundsEngine {
  private readonly storage: SoundStorageLike
  private readonly enabledFallback: boolean
  private readonly urls: Partial<Record<SoundKey, string>>
  private readonly absoluteUrls: Partial<Record<SoundKey, string>>
  private readonly createContext: () => AudioContextLike | null
  private readonly fetchBuffer: (url: string) => Promise<ArrayBuffer>
  private readonly log?: Pick<Console, 'warn'>
  private readonly now: () => number

  private ctx: AudioContextLike | null = null
  private readonly buffers = new Map<string, unknown>()
  private readonly inflight = new Set<string>()
  private readonly failed = new Set<string>()
  private readonly warned = new Set<string>()
  private readonly lastStarted = new Map<SoundKey, number>()
  private enabled: boolean
  private reducedMotion = false
  private suppressionActive = false
  private suppressedUntil = 0
  private listeners = new Set<() => void>()
  private reducedUnsubscribe: (() => void) | null = null
  private disposed = false

  constructor(options: SoundsEngineOptions) {
    this.storage = options.storage
    this.enabledFallback = options.enabledFallback
    this.urls = options.urls
    this.absoluteUrls = options.absoluteUrls
    this.createContext = options.createContext
    this.fetchBuffer = options.fetchBuffer
    this.log = options.log
    this.now = options.now ?? (() => performance.now())
    this.enabled = readSoundEnabled(this.storage, this.enabledFallback)
  }

  start(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const media = window.matchMedia(REDUCED_MOTION_QUERY)
    this.reducedMotion = media.matches
    const onChange = (event: MediaQueryListEvent): void => {
      this.reducedMotion = event.matches
      this.suspendWhenMuted()
    }
    media.addEventListener('change', onChange)
    this.reducedUnsubscribe = () => {
      media.removeEventListener('change', onChange)
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled
    writeSoundEnabled(this.storage, enabled)
    this.suspendWhenMuted()
    for (const listener of this.listeners) listener()
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  isMuted(): boolean {
    return !this.enabled || this.reducedMotion
  }

  /**
   * Mark route changes that begin soon as silent (paginate/drawer clicks play
   * their own cue). The window expires by itself so a navigation that never
   * happens (e.g. clicking the current route) cannot silence a later one.
   */
  suppressNextNavigation(): void {
    this.suppressionActive = true
    this.suppressedUntil = this.now() + SOUND_NAV_SUPPRESS_MS
  }

  /** Consume the suppression when a route change actually fires. */
  consumeSuppressedNavigation(): boolean {
    if (!this.suppressionActive) return false
    this.suppressionActive = false
    if (this.now() > this.suppressedUntil) return false
    this.suppressedUntil = 0
    return true
  }

  play(key: SoundKey): void {
    if (this.disposed || this.isMuted()) return
    const url = this.urls[key]
    if (url === undefined) return
    // Cues outside a user gesture (initial panel auto-activation, viewport
    // reveals) are dropped instead of queued on a suspended context: they
    // would otherwise resurface glued onto a later gesture.
    if (hasActiveUserGesture() === false) return

    const now = this.now()
    const last = this.lastStarted.get(key)
    if (last !== undefined && now - last < SOUND_MIN_INTERVAL_MS) return
    this.lastStarted.set(key, now)

    if (!this.ctx) {
      this.ctx = this.createContext()
      if (!this.ctx) return
    }
    if (this.ctx.state === 'suspended') {
      void settle(this.ctx.resume())
    }

    const cached = this.buffers.get(url)
    if (cached !== undefined) {
      this.startSource(cached)
      return
    }
    if (this.failed.has(url) || this.inflight.has(url)) return

    const absoluteUrl = this.absoluteUrls[key] ?? url
    this.inflight.add(url)
    this.fetchBuffer(absoluteUrl)
      .then((data) => {
        if (!this.ctx || this.disposed) throw new Error('context gone')
        return this.ctx.decodeAudioData(data)
      })
      .then((buffer) => {
        this.inflight.delete(url)
        if (buffer === undefined || this.disposed) return
        this.buffers.set(url, buffer)
        if (!this.isMuted()) this.startSource(buffer)
      })
      .catch(() => {
        this.inflight.delete(url)
        this.failed.add(url)
        if (!this.warned.has(url)) {
          this.warned.add(url)
          this.log?.warn(
            `[vuepress-theme-synctrolling] sound cue "${key}" could not be loaded from ${absoluteUrl}`,
          )
        }
      })
  }

  private startSource(buffer: unknown): void {
    if (!this.ctx) return
    try {
      const source = this.ctx.createBufferSource()
      source.buffer = buffer
      source.connect(this.ctx.destination)
      source.start()
    } catch {
      /* a single broken buffer must not break interactions */
    }
  }

  private suspendWhenMuted(): void {
    if (!this.ctx) return
    if (this.isMuted()) {
      void settle(this.ctx.suspend())
    } else if (this.ctx.state === 'suspended') {
      void settle(this.ctx.resume())
    }
  }

  dispose(): void {
    this.disposed = true
    this.reducedUnsubscribe?.()
    this.reducedUnsubscribe = null
    this.listeners.clear()
    if (this.ctx) {
      void settle(this.ctx.close())
      this.ctx = null
    }
  }
}
