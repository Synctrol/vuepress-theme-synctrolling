import { joinSoundUrl } from '../sounds/runtime.js'
import { BackgroundMusic } from './music.js'
import type { MusicAudioLike } from './music.js'

export interface StartMusicRuntimeOptions {
  url: string
  base: string
  createAudio?: () => MusicAudioLike
  log?: Pick<Console, 'warn'>
}

function defaultCreateAudio(): MusicAudioLike {
  if (typeof window === 'undefined' || typeof window.Audio !== 'function') {
    throw new Error('Audio unavailable')
  }
  return new window.Audio() as unknown as MusicAudioLike
}

let music: BackgroundMusic | null = null
const listeners = new Set<() => void>()

function notifyListeners(): void {
  for (const listener of listeners) listener()
}

export function startMusicRuntime(options: StartMusicRuntimeOptions): void {
  if (music) stopMusicRuntime()
  music = new BackgroundMusic({
    url: joinSoundUrl(options.base, options.url),
    createAudio: options.createAudio ?? defaultCreateAudio,
    ...(options.log === undefined ? {} : { log: options.log }),
  })
  music.onChange(notifyListeners)
}

export function stopMusicRuntime(): void {
  music?.dispose()
  music = null
  listeners.clear()
}

export function isMusicPlaying(): boolean {
  return music?.isPlaying() ?? false
}

/** The live media element used by the player, when one exists. */
export function getMusicElement(): MusicAudioLike | null {
  return music?.getElement() ?? null
}

/** User-gesture entry point used by the topbar toggle. */
export function toggleMusic(): void {
  if (music === null) return
  if (music.isPlaying()) music.stop()
  else music.start()
}

export function onChangeMusicPlaying(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Test seam: install a stand-in player (or null to reset to no-op). */
export function setMusicRuntimeForTesting(instance: BackgroundMusic | null): void {
  stopMusicRuntime()
  music = instance
}
