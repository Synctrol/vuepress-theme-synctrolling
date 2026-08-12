import type { PlatformTypeRegistration } from '../shared/options.js'
import { mergeCspDirectives, emptyCspJson, type SynctrolCspJson } from './csp.js'

export interface CspCollectable {
  type: string
  entry: Record<string, unknown>
}

export function collectCspFromEntries(
  items: CspCollectable[],
  types: Record<string, PlatformTypeRegistration>,
): SynctrolCspJson {
  const chunks = items.map(({ type, entry }) => {
    const reg = types[type]
    if (!reg) return emptyCspJson()
    const origins = reg.cspOrigins(entry as never).map(String)
    if (type === 'audio_player') {
      return { 'media-src': origins, 'frame-src': [], 'connect-src': [] }
    }
    if (type === 'link') {
      return emptyCspJson()
    }
    // v1: non-audio registration origins (built-in players + custom) → frame-src.
    // connect-src stays empty; custom types cannot contribute media/connect via cspOrigins().
    return {
      'frame-src': origins,
      'media-src': [],
      'connect-src': [],
    }
  })
  return mergeCspDirectives(chunks)
}
