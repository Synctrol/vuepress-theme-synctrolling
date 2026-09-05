import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackgroundMusic } from '../../../src/client/music/music'
import type { MusicAudioLike } from '../../../src/client/music/music'

interface FakeAudio extends MusicAudioLike {
  play: ReturnType<typeof vi.fn<() => Promise<void>>>
  pause: ReturnType<typeof vi.fn<() => void>>
  listeners: Map<string, Set<() => void>>
  emit(type: string): void
}

function createFakeAudio(): FakeAudio {
  const listeners = new Map<string, Set<() => void>>()
  const audio: FakeAudio = {
    loop: false,
    volume: 0,
    currentTime: 0,
    paused: true,
    src: '',
    play: vi.fn<() => Promise<void>>(async () => {}),
    pause: vi.fn<() => void>(() => {
      audio.paused = true
    }),
    addEventListener: (type, listener) => {
      const set = listeners.get(type) ?? new Set()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type, listener) => {
      listeners.get(type)?.delete(listener)
    },
    listeners,
    emit: (type) => {
      for (const listener of [...(listeners.get(type) ?? [])]) listener()
    },
  }
  return audio
}

describe('BackgroundMusic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts from the beginning with a fade-in when idle', async () => {
    const audio = createFakeAudio()
    const music = new BackgroundMusic({
      url: '/music/Beater.mp3',
      createAudio: () => audio,
    })
    music.start()
    expect(music.isPlaying()).toBe(true)
    expect(audio.src).toBe('/music/Beater.mp3')
    expect(audio.loop).toBe(true)
    expect(audio.currentTime).toBe(0)
    expect(audio.play).toHaveBeenCalledTimes(1)
    expect(audio.volume).toBe(0)
    vi.advanceTimersByTime(14 * 50)
    expect(audio.volume).toBe(0.8)
    music.dispose()
  })

  it('ignores a second start while already playing', async () => {
    const audio = createFakeAudio()
    const music = new BackgroundMusic({
      url: '/music/Beater.mp3',
      createAudio: () => audio,
    })
    music.start()
    music.start()
    expect(audio.play).toHaveBeenCalledTimes(1)
    music.dispose()
  })

  it('fades out, pauses, and rewinds on stop', () => {
    const audio = createFakeAudio()
    const music = new BackgroundMusic({
      url: '/music/Beater.mp3',
      createAudio: () => audio,
    })
    music.start()
    audio.currentTime = 120
    music.stop()
    expect(music.isPlaying()).toBe(false)
    vi.advanceTimersByTime(14 * 50)
    expect(audio.pause).toHaveBeenCalled()
    expect(audio.currentTime).toBe(0)
    music.dispose()
  })

  it('notifies listeners on state changes', () => {
    const audio = createFakeAudio()
    const music = new BackgroundMusic({
      url: '/music/Beater.mp3',
      createAudio: () => audio,
    })
    const listener = vi.fn()
    music.onChange(listener)
    music.start()
    expect(listener).toHaveBeenCalledTimes(1)
    music.stop()
    expect(listener).toHaveBeenCalledTimes(2)
    music.dispose()
  })

  it('falls back to stopped on play rejection and warns once', async () => {
    const audio = createFakeAudio()
    audio.play.mockRejectedValueOnce(new Error('NotAllowedError'))
    const warn = vi.fn()
    const music = new BackgroundMusic({
      url: '/music/Beater.mp3',
      createAudio: () => audio,
      log: { warn },
    })
    music.start()
    await Promise.resolve()
    await Promise.resolve()
    expect(music.isPlaying()).toBe(false)
    expect(warn).toHaveBeenCalledTimes(1)
    music.start()
    music.dispose()
  })

  it('falls back to stopped on the media error event', async () => {
    const audio = createFakeAudio()
    const music = new BackgroundMusic({
      url: '/music/Beater.mp3',
      createAudio: () => audio,
    })
    music.start()
    audio.emit('error')
    expect(music.isPlaying()).toBe(false)
    music.dispose()
  })
})
