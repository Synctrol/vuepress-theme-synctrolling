export const MUSIC_FADE_STEP_MS = 50
export const MUSIC_FADE_STEPS = 14
export const MUSIC_LEVEL = 0.8

export interface MusicAudioLike {
  loop: boolean
  volume: number
  currentTime: number
  paused: boolean
  src: string
  play(): Promise<void> | void
  pause(): void
  addEventListener(type: string, listener: () => void): void
  removeEventListener(type: string, listener: () => void): void
}

export interface BackgroundMusicOptions {
  url: string
  createAudio: () => MusicAudioLike
  log?: Pick<Console, 'warn'>
}

export class BackgroundMusic {
  private readonly url: string
  private readonly createAudio: () => MusicAudioLike
  private readonly log?: Pick<Console, 'warn'>

  private audio: MusicAudioLike | null = null
  private playing = false
  private fadeTimer: ReturnType<typeof setInterval> | null = null
  private stopped = false
  private warned = false
  private listeners = new Set<() => void>()

  constructor(options: BackgroundMusicOptions) {
    this.url = options.url
    this.createAudio = options.createAudio
    this.log = options.log
  }

  isPlaying(): boolean {
    return this.playing
  }

  /** The live media element (created lazily on the first start). */
  getElement(): MusicAudioLike | null {
    return this.audio
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Start (or restart) the track from the beginning with a fade-in. */
  start(): void {
    if (this.playing) return
    // Create the media element before notifying: subscribers (e.g. the
    // spectrum driver) attach their analyser synchronously inside the user
    // gesture that started the music and need the element to exist.
    const audio = this.ensureAudio()
    audio.currentTime = 0
    audio.volume = 0
    this.playing = true
    this.notify()
    const playResult = audio.play()
    if (playResult !== undefined) {
      playResult.catch(() => this.onFailure())
    }
    this.fadeTo(MUSIC_LEVEL)
  }

  /** Fade out, pause, and rewind the track. */
  stop(): void {
    if (!this.playing) return
    this.playing = false
    this.notify()
    this.fadeTo(0, () => {
      if (this.playing || !this.audio) return
      this.audio.pause()
      this.audio.currentTime = 0
    })
  }

  private ensureAudio(): MusicAudioLike {
    if (this.audio) return this.audio
    const audio = this.createAudio()
    audio.loop = true
    audio.src = this.url
    audio.addEventListener('error', () => this.onFailure())
    this.audio = audio
    return audio
  }

  private fadeTo(target: number, onDone?: () => void): void {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer)
      this.fadeTimer = null
    }
    const audio = this.audio
    if (!audio) {
      onDone?.()
      return
    }
    const start = audio.volume
    const delta = target - start
    let step = 0
    this.fadeTimer = setInterval(() => {
      step += 1
      audio.volume = Math.min(
        MUSIC_LEVEL,
        Math.max(0, start + (delta * step) / MUSIC_FADE_STEPS),
      )
      if (step >= MUSIC_FADE_STEPS) {
        if (this.fadeTimer) {
          clearInterval(this.fadeTimer)
          this.fadeTimer = null
        }
        onDone?.()
      }
    }, MUSIC_FADE_STEP_MS)
  }

  private onFailure(): void {
    const wasPlaying = this.playing
    this.playing = false
    this.notify()
    if (wasPlaying && !this.warned) {
      this.warned = true
      this.log?.warn(
        `[vuepress-theme-synctrolling] background music could not play: ${this.url}`,
      )
    }
  }

  dispose(): void {
    this.stopped = true
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer)
      this.fadeTimer = null
    }
    this.listeners.clear()
    this.audio?.pause()
    this.audio = null
  }

  private notify(): void {
    if (this.stopped) return
    for (const listener of this.listeners) listener()
  }
}
