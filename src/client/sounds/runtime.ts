import type { Router } from 'vue-router'
import type { SoundKey } from '../../shared/options.js'
import { SoundsEngine } from './engine.js'
import type { AudioContextLike, SoundsEngineOptions } from './engine.js'
import type { SoundStorageLike } from './storage.js'

export interface StartSoundsRuntimeOptions {
  keys: Partial<Record<SoundKey, string>>
  base: string
  enabledFallback: boolean
  storage: SoundStorageLike
  router?: Router
  createContext?: () => AudioContextLike | null
  fetchBuffer?: (url: string) => Promise<ArrayBuffer>
  log?: Pick<Console, 'warn'>
  now?: () => number
}

function defaultCreateContext(): AudioContextLike | null {
  if (typeof window === 'undefined') return null
  const ContextCtor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return ContextCtor ? new ContextCtor() : null
}

function defaultFetchBuffer(url: string): Promise<ArrayBuffer> {
  return fetch(url).then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.arrayBuffer()
  })
}

export function joinSoundUrl(base: string, url: string): string {
  if (base === '/' || base === '') return url
  return `${base.replace(/\/+$/, '')}${url}`
}

let engine: SoundsEngine | null = null
let startOptions: StartSoundsRuntimeOptions | null = null
const listeners = new Set<() => void>()

function notifyListeners(): void {
  for (const listener of listeners) listener()
}

export function startSoundsRuntime(options: StartSoundsRuntimeOptions): void {
  if (engine) stopSoundsRuntime()
  startOptions = options
  engine = new SoundsEngine({
    storage: options.storage,
    enabledFallback: options.enabledFallback,
    urls: { ...options.keys },
    absoluteUrls: Object.fromEntries(
      Object.entries(options.keys).map(([key, url]) => [
        key,
        joinSoundUrl(options.base, url as string),
      ]),
    ),
    createContext: options.createContext ?? defaultCreateContext,
    fetchBuffer: options.fetchBuffer ?? defaultFetchBuffer,
    ...(options.log === undefined ? {} : { log: options.log }),
    ...(options.now === undefined ? {} : { now: options.now }),
  } as SoundsEngineOptions)
  engine.onChange(notifyListeners)
  engine.start()
  if (options.router) {
    options.router.afterEach((to, from) => {
      if (!engine) return
      if (from.matched.length === 0) return
      if (engine.consumeSuppressedNavigation()) return
      engine.play('navigate')
    })
  }
}

export function stopSoundsRuntime(): void {
  engine?.dispose()
  engine = null
  startOptions = null
  listeners.clear()
}

export function playSound(key: SoundKey): void {
  engine?.play(key)
}

export function isSoundEnabled(): boolean {
  return engine?.isEnabled() ?? startOptions?.enabledFallback ?? true
}

export function setSoundEnabled(enabled: boolean): void {
  engine?.setEnabled(enabled)
  notifyListeners()
}

export function suppressNextNavigationSound(): void {
  engine?.suppressNextNavigation()
}

export function onChangeSoundEnabled(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Test seam: install a stand-in engine (or null to reset to no-op). */
export function setSoundsRuntimeForTesting(instance: SoundsEngine | null): void {
  stopSoundsRuntime()
  engine = instance
}
