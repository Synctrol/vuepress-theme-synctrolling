export const SOUND_ENABLED_STORAGE_KEY = 'synctrol:sounds'

export interface SoundStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function readSoundEnabled(
  storage: SoundStorageLike,
  fallback: boolean,
): boolean {
  const raw = storage.getItem(SOUND_ENABLED_STORAGE_KEY)
  if (raw === 'on') return true
  if (raw === 'off') return false
  return fallback
}

export function writeSoundEnabled(
  storage: SoundStorageLike,
  enabled: boolean,
): void {
  storage.setItem(SOUND_ENABLED_STORAGE_KEY, enabled ? 'on' : 'off')
}
