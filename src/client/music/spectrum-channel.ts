import { ref } from 'vue'
import type { BackgroundSpectrumChannel } from '../../shared/background.js'
import {
  readReducedMotion,
  subscribeReducedMotion,
} from '../background/reduced-motion.js'
import {
  LOUDNESS_FLOOR_DB,
  MusicSpectrumAnalyser,
  SPECTRUM_BIN_COUNT,
} from './analyser.js'
import {
  getMusicElement,
  isMusicPlaying,
  onChangeMusicPlaying,
} from './runtime.js'

export function createSpectrumChannel(): BackgroundSpectrumChannel {
  return {
    active: ref(false),
    frame: ref(0),
    data: new Float32Array(SPECTRUM_BIN_COUNT),
    binHz: 0,
    rmsDb: LOUDNESS_FLOOR_DB,
  }
}

function zeroOut(channel: BackgroundSpectrumChannel): void {
  channel.data.fill(0)
  channel.rmsDb = LOUDNESS_FLOOR_DB
  channel.frame.value += 1
}

/**
 * Feeds the shared spectrum channel while the background music plays and
 * `prefers-reduced-motion` is off. Attaches the analyser to the live media
 * element on the playing transition (inside the user gesture that started the
 * music, so the routing context starts running). If the element is not there
 * yet, a short retry loop keeps trying; a context created outside a gesture
 * is resumed by the next pointer/key activation.
 */
class SpectrumDriver {
  private readonly channel: BackgroundSpectrumChannel
  private readonly analyser = new MusicSpectrumAnalyser()
  private playing = false
  private reducedMotion = false
  private attached = false
  private attachFailures = 0
  private rafId = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private unsubscribeMotion: (() => void) | null = null
  private unsubscribePlaying: (() => void) | null = null

  constructor(channel: BackgroundSpectrumChannel) {
    this.channel = channel
    this.channel.active.value = false
  }

  start(): void {
    this.reducedMotion = readReducedMotion()
    this.unsubscribeMotion = subscribeReducedMotion((reduced) => {
      this.reducedMotion = reduced
      this.sync()
    })
    this.unsubscribePlaying = onChangeMusicPlaying(() => {
      const wasPlaying = this.playing
      this.playing = isMusicPlaying()
      if (this.playing && !wasPlaying) this.attachFailures = 0
      this.sync()
    })
    this.playing = isMusicPlaying()
    this.sync()
  }

  dispose(): void {
    this.stopCapture()
    this.clearRetry()
    this.unsubscribeMotion?.()
    this.unsubscribeMotion = null
    this.unsubscribePlaying?.()
    this.unsubscribePlaying = null
    this.analyser.detach()
    this.attached = false
    this.channel.active.value = false
    zeroOut(this.channel)
  }

  private shouldRun(): boolean {
    return this.playing && !this.reducedMotion
  }

  private sync(): void {
    if (!this.shouldRun()) {
      this.stopCapture()
      this.clearRetry()
      return
    }
    if (!this.attached && this.tryAttach()) {
      this.clearRetry()
    }
    if (this.attached) {
      this.startCapture()
    } else {
      this.scheduleRetry()
    }
  }

  private tryAttach(): boolean {
    const element = getMusicElement()
    if (
      typeof HTMLMediaElement === 'undefined' ||
      !(element instanceof HTMLMediaElement)
    ) {
      return false
    }
    if (this.analyser.attach(element)) {
      this.attached = true
      this.attachFailures = 0
      this.channel.binHz = this.analyser.binHz
      return true
    }
    this.attachFailures += 1
    return false
  }

  private scheduleRetry(): void {
    if (this.retryTimer !== null) return
    if (this.attachFailures >= 100) return
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.sync()
    }, 120)
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
  }

  private startCapture(): void {
    if (this.rafId) return
    const tick = () => {
      if (!this.shouldRun() || !this.attached) {
        this.rafId = 0
        this.stopCapture()
        this.sync()
        return
      }
      this.analyser.resumeIfSuspended()
      if (this.analyser.read(this.channel.data)) {
        this.channel.active.value = true
        this.channel.rmsDb = this.analyser.readLoudnessRmsDb()
        this.channel.frame.value += 1
      }
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private stopCapture(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    if (this.channel.active.value) {
      this.channel.active.value = false
      zeroOut(this.channel)
    }
  }
}

let channel: BackgroundSpectrumChannel | null = null
let driver: SpectrumDriver | null = null

/** Channel read by background providers; null until analysis was started. */
export function getBackgroundSpectrumChannel(): BackgroundSpectrumChannel | null {
  return channel
}

/** Idempotent: wires the analyser to the background music runtime. */
export function startMusicSpectrumAnalysis(): void {
  if (driver) return
  channel = createSpectrumChannel()
  driver = new SpectrumDriver(channel)
  driver.start()
}
