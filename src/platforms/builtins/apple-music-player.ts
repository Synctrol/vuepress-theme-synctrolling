import type { AppleMusicPlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { buildFallbackUrl } from '../urls.js'
import { AppleMusicPlayerPlatform } from '../../client/components/platforms/renderers/AppleMusicPlayerPlatform.js'
import {
  asEntryMap,
  createBase,
  invalid,
  optionalLabel,
  parseHttpsUrl,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const appleMusicPlayerType: PlatformTypeRegistration<AppleMusicPlayerEntry> =
  {
    validate(raw: unknown): AppleMusicPlayerEntry {
      const entry = asEntryMap(raw)
      rejectUnknown(entry, ['platform', 'label', 'url'])
      const platform = requirePlatformKey(entry)
      const { parsed, value } = parseHttpsUrl(
        entry.url,
        'apple_music_player.url',
      )
      if (parsed.hostname !== 'music.apple.com') {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'apple_music_player.url must be HTTPS on music.apple.com',
        )
      }
      const label = optionalLabel(entry)
      return { ...createBase(platform, label), url: value }
    },
    component: AppleMusicPlayerPlatform,
    cspOrigins() {
      return ['https://embed.music.apple.com']
    },
    fallbackUrl(entry) {
      return buildFallbackUrl('apple_music_player', entry as unknown as Record<string, unknown>)
    },
  }
