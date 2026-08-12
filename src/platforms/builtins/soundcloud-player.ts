import type { SoundCloudPlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { buildFallbackUrl } from '../urls.js'
import { SoundCloudPlayerPlatform } from '../../client/components/platforms/renderers/SoundCloudPlayerPlatform.js'
import {
  asEntryMap,
  createBase,
  invalid,
  optionalLabel,
  parseHttpsUrl,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const soundcloudPlayerType: PlatformTypeRegistration<SoundCloudPlayerEntry> =
  {
    validate(raw: unknown): SoundCloudPlayerEntry {
      const entry = asEntryMap(raw)
      rejectUnknown(entry, ['platform', 'label', 'url'])
      const platform = requirePlatformKey(entry)
      const { parsed, value } = parseHttpsUrl(
        entry.url,
        'soundcloud_player.url',
      )
      if (parsed.hostname !== 'soundcloud.com') {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'soundcloud_player.url must be HTTPS on soundcloud.com',
        )
      }
      const label = optionalLabel(entry)
      return { ...createBase(platform, label), url: value }
    },
    component: SoundCloudPlayerPlatform,
    cspOrigins() {
      return ['https://w.soundcloud.com']
    },
    fallbackUrl(entry) {
      return buildFallbackUrl('soundcloud_player', entry as unknown as Record<string, unknown>)
    },
  }
