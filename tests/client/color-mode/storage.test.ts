import { beforeEach, describe, expect, it } from 'vitest'
import {
  COLOR_MODE_STORAGE_KEY,
  readColorModePreference,
  writeColorModePreference,
} from '../../../src/client/color-mode/storage'

describe('color mode storage', () => {
  const memory = new Map<string, string>()
  const storage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v)
    },
  }

  beforeEach(() => memory.clear())

  it('returns fallback when unset or invalid', () => {
    expect(readColorModePreference(storage, 'auto')).toBe('auto')
    memory.set(COLOR_MODE_STORAGE_KEY, 'nope')
    expect(readColorModePreference(storage, 'dark')).toBe('dark')
  })

  it('persists a valid preference', () => {
    writeColorModePreference(storage, 'light')
    expect(memory.get(COLOR_MODE_STORAGE_KEY)).toBe('light')
    expect(readColorModePreference(storage, 'auto')).toBe('light')
  })
})
