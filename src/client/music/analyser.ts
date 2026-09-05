export const SPECTRUM_FFT_SIZE = 1024
export const SPECTRUM_BIN_COUNT = SPECTRUM_FFT_SIZE / 2
export const LOUDNESS_FLOOR_DB = -90

export function normalizeFrequencyBytes(
  bytes: Uint8Array,
  bins: number,
  out: Float32Array,
): void {
  const perBin = bytes.length / bins
  for (let i = 0; i < bins; i += 1) {
    const start = Math.floor(i * perBin)
    const end = Math.max(start + 1, Math.floor((i + 1) * perBin))
    let sum = 0
    for (let j = start; j < end; j += 1) sum += bytes[j]!
    out[i] = sum / (end - start) / 255
  }
}

/** RMS level of float samples in dBFS, floored to `LOUDNESS_FLOOR_DB`. */
export function computeLoudnessRmsDb(samples: ArrayLike<number>): number {
  let sumSquares = 0
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i]!
    sumSquares += sample * sample
  }
  const rms = Math.sqrt(sumSquares / Math.max(1, samples.length))
  if (rms <= 1e-5) return LOUDNESS_FLOOR_DB
  return Math.max(20 * Math.log10(rms), LOUDNESS_FLOOR_DB)
}

function resolveContext(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  return (
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  )
}

/**
 * Routes the background-music media element through a WebAudio graph with an
 * AnalyserNode, leaving the audible output unchanged. One graph per element.
 */
export class MusicSpectrumAnalyser {
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaElementAudioSourceNode | null = null
  private readonly bytes = new Uint8Array(SPECTRUM_BIN_COUNT)
  private readonly time = new Float32Array(SPECTRUM_FFT_SIZE)
  private binHzValue = 0

  /** Frequency resolution in Hz per frequency-bin of `read`. */
  get binHz(): number {
    return this.binHzValue
  }

  /** True once the graph is live for the given media element. */
  attach(media: HTMLMediaElement): boolean {
    if (this.source) return true
    const Context = resolveContext()
    const hasMediaType =
      typeof HTMLMediaElement !== 'undefined' &&
      media instanceof HTMLMediaElement
    if (!Context || !hasMediaType) return false
    try {
      const ctx = new Context()
      const source = ctx.createMediaElementSource(media)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = SPECTRUM_FFT_SIZE
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyser.connect(ctx.destination)
      this.ctx = ctx
      this.source = source
      this.analyser = analyser
      this.binHzValue = ctx.sampleRate / SPECTRUM_FFT_SIZE
      void ctx.resume().catch(() => {})
      return true
    } catch {
      return false
    }
  }

  /** Fills `out` with the latest normalized bin energies. */
  read(out: Float32Array): boolean {
    if (!this.analyser) return false
    this.analyser.getByteFrequencyData(this.bytes)
    normalizeFrequencyBytes(this.bytes, out.length, out)
    return true
  }

  /** Latest overall RMS loudness of the track in dBFS. */
  readLoudnessRmsDb(): number {
    if (!this.analyser) return LOUDNESS_FLOOR_DB
    if (typeof this.analyser.getFloatTimeDomainData === 'function') {
      this.analyser.getFloatTimeDomainData(this.time)
      return computeLoudnessRmsDb(this.time)
    }
    const byteTime = new Uint8Array(this.time.length)
    this.analyser.getByteTimeDomainData(byteTime)
    const mapped = new Float32Array(byteTime.length)
    for (let i = 0; i < byteTime.length; i += 1) {
      mapped[i] = (byteTime[i]! - 128) / 128
    }
    return computeLoudnessRmsDb(mapped)
  }

  /**
   * Best-effort unlock for contexts created outside a user gesture (retried
   * attaches): the next pointer/key activation resumes the suspended context.
   */
  resumeIfSuspended(): void {
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume().catch(() => {})
    }
  }

  detach(): void {
    try {
      this.source?.disconnect()
    } catch {
      /* already gone */
    }
    this.source = null
    this.analyser = null
    this.binHzValue = 0
    if (this.ctx) {
      void this.ctx.close().catch(() => {})
      this.ctx = null
    }
  }
}
