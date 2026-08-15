import type { SpotifyPlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { buildFallbackUrl } from '../urls.js'
import { SpotifyPlayerPlatform } from '../../client/components/platforms/renderers/SpotifyPlayerPlatform.js'
import {
  asEntryMap,
  createBase,
  invalid,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

const SPOTIFY_URI_PATTERN = /^spotify:(album|track|playlist):[^:\s]+$/
const SPOTIFY_URL_PATTERN =
  /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(album|track|playlist)\/([A-Za-z0-9]+)\/?(?:\?.*)?$/

/**
 * Normalize a Spotify reference to the canonical `spotify:<kind>:<id>` URI.
 * Accepts both the URI form and `https://open.spotify.com/<kind>/<id>` URLs
 * (with optional `intl-xx` prefix, trailing slash, or query string), so users
 * can paste share links directly. Returns undefined for anything else.
 */
export function normalizeSpotifyUri(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const urlMatch = SPOTIFY_URL_PATTERN.exec(raw)
  if (urlMatch) {
    return `spotify:${urlMatch[1]}:${urlMatch[2]}`
  }
  if (SPOTIFY_URI_PATTERN.test(raw)) {
    return raw
  }
  return undefined
}

export const spotifyPlayerType: PlatformTypeRegistration<SpotifyPlayerEntry> = {
  validate(raw: unknown): SpotifyPlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'uri'])
    const platform = requirePlatformKey(entry)
    const uri = normalizeSpotifyUri(entry.uri)
    if (uri === undefined) {
      invalid(
        'INVALID_PLATFORM_ENTRY',
        'spotify_player.uri must be spotify:<album|track|playlist>:<id> or an https://open.spotify.com/<album|track|playlist>/<id> URL',
      )
    }
    const label = optionalLabel(entry)
    return { ...createBase(platform, label), uri }
  },
  component: SpotifyPlayerPlatform,
  cspOrigins() {
    return ['https://open.spotify.com']
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('spotify_player', entry as unknown as Record<string, unknown>)
  },
}
