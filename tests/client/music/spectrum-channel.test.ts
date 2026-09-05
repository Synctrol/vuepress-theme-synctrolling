import { describe, expect, it } from 'vitest'
import {
  computeLoudnessRmsDb,
  MusicSpectrumAnalyser,
  normalizeFrequencyBytes,
  SPECTRUM_BIN_COUNT,
} from '../../../src/client/music/analyser'
import {
  createSpectrumChannel,
  getBackgroundSpectrumChannel,
  startMusicSpectrumAnalysis,
} from '../../../src/client/music/spectrum-channel'

describe('normalizeFrequencyBytes', () => {
  it('maps byte groups into the requested number of 0..1 bins', () => {
    const bytes = new Uint8Array(256)
    for (let i = 0; i < 64; i += 1) bytes[i] = 255
    const out = new Float32Array(4)
    normalizeFrequencyBytes(bytes, 4, out)
    expect(out[0]).toBe(1)
    expect(out[1]).toBe(0)
    expect(out[2]).toBe(0)
    expect(out[3]).toBe(0)
  })

  it('normalizes uniform energy to the mid value', () => {
    const bytes = new Uint8Array(256).fill(128)
    const out = new Float32Array(8)
    normalizeFrequencyBytes(bytes, 8, out)
    for (const value of out) {
      expect(value).toBeCloseTo(128 / 255, 4)
    }
  })

  it('keeps a silent frame at zero', () => {
    const out = new Float32Array(8)
    normalizeFrequencyBytes(new Uint8Array(256), 8, out)
    expect(Array.from(out)).toEqual(Array(8).fill(0))
  })
})

describe('computeLoudnessRmsDb', () => {
  it('reports 0 dBFS for a full-scale constant signal', () => {
    expect(computeLoudnessRmsDb([1, 1, 1, 1])).toBeCloseTo(0, 4)
  })

  it('reports about -6 dB for half-scale samples', () => {
    expect(computeLoudnessRmsDb(new Float32Array(64).fill(0.5))).toBeCloseTo(
      -6.02,
      1,
    )
  })

  it('floors silence at -90 dB', () => {
    expect(computeLoudnessRmsDb([0, 0, 0, 0])).toBe(-90)
  })
})

describe('createSpectrumChannel', () => {
  it('starts inactive with a zeroed buffer and loudness floor', () => {
    const channel = createSpectrumChannel()
    expect(channel.active.value).toBe(false)
    expect(channel.frame.value).toBe(0)
    expect(channel.data).toHaveLength(SPECTRUM_BIN_COUNT)
    expect(Array.from(channel.data)).toEqual(Array(SPECTRUM_BIN_COUNT).fill(0))
    expect(channel.binHz).toBe(0)
    expect(channel.rmsDb).toBe(-90)
  })
})

describe('startMusicSpectrumAnalysis', () => {
  it('is idempotent and hands providers the same channel', () => {
    startMusicSpectrumAnalysis()
    const first = getBackgroundSpectrumChannel()
    startMusicSpectrumAnalysis()
    expect(getBackgroundSpectrumChannel()).toBe(first)
    expect(first).not.toBeNull()
  })
})

describe('MusicSpectrumAnalyser attach fallback', () => {
  it('returns false gracefully when no media source can be created', () => {
    const analyser = new MusicSpectrumAnalyser()
    // happy-dom provides no AudioContext/createMediaElementSource graph.
    expect(analyser.attach(null as unknown as HTMLMediaElement)).toBe(false)
  })
})
