import { describe, expect, it } from 'vitest'
import {
  readSoundEnabled,
  writeSoundEnabled,
  SOUND_ENABLED_STORAGE_KEY,
} from '../../../src/client/sounds/storage'
import type { SoundStorageLike } from '../../../src/client/sounds/storage'

function memoryStorage(initial: Record<string, string> = {}): SoundStorageLike {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

describe('sound preference storage', () => {
  it('reads stored on/off values', () => {
    expect(readSoundEnabled(memoryStorage({ 'synctrol:sounds': 'on' }), true)).toBe(true)
    expect(readSoundEnabled(memoryStorage({ 'synctrol:sounds': 'off' }), true)).toBe(false)
  })

  it('falls back when nothing or garbage is stored', () => {
    expect(readSoundEnabled(memoryStorage(), true)).toBe(true)
    expect(readSoundEnabled(memoryStorage(), false)).toBe(false)
    expect(
      readSoundEnabled(memoryStorage({ 'synctrol:sounds': 'maybe' }), true),
    ).toBe(true)
  })

  it('writes on/off under the fixed key', () => {
    const storage = memoryStorage()
    writeSoundEnabled(storage, true)
    expect(storage.getItem(SOUND_ENABLED_STORAGE_KEY)).toBe('on')
    writeSoundEnabled(storage, false)
    expect(storage.getItem(SOUND_ENABLED_STORAGE_KEY)).toBe('off')
  })
})
