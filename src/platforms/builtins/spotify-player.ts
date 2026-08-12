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

export const spotifyPlayerType: PlatformTypeRegistration<SpotifyPlayerEntry> = {
  validate(raw: unknown): SpotifyPlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'uri'])
    const platform = requirePlatformKey(entry)
    if (
      typeof entry.uri !== 'string' ||
      !/^spotify:(album|track|playlist):[^:\s]+$/.test(entry.uri)
    ) {
      invalid(
        'INVALID_PLATFORM_ENTRY',
        'spotify_player.uri must be spotify:album|track|playlist:<non-empty resource ID>',
      )
    }
    const label = optionalLabel(entry)
    return { ...createBase(platform, label), uri: entry.uri }
  },
  component: SpotifyPlayerPlatform,
  cspOrigins() {
    return ['https://open.spotify.com']
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('spotify_player', entry as unknown as Record<string, unknown>)
  },
}
