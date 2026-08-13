import type { NeteasePlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { buildFallbackUrl } from '../urls.js'
import { NeteasePlayerPlatform } from '../../client/components/platforms/renderers/NeteasePlayerPlatform.js'
import {
  asEntryMap,
  createBase,
  invalid,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const neteasePlayerType: PlatformTypeRegistration<NeteasePlayerEntry> = {
  preview: true,
  validate(raw: unknown): NeteasePlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'id', 'resourceType'])
    const platform = requirePlatformKey(entry)
    if (typeof entry.id !== 'string' || !/^\d+$/.test(entry.id)) {
      invalid(
        'INVALID_PLATFORM_ENTRY',
        'netease_player.id must be a non-empty decimal digit string',
      )
    }
    if (
      entry.resourceType !== 'song' &&
      entry.resourceType !== 'album' &&
      entry.resourceType !== 'playlist'
    ) {
      invalid(
        'INVALID_PLATFORM_ENTRY',
        'netease_player.resourceType must be song|album|playlist',
      )
    }
    const label = optionalLabel(entry)
    return {
      ...createBase(platform, label),
      id: entry.id,
      resourceType: entry.resourceType,
    }
  },
  component: NeteasePlayerPlatform,
  cspOrigins() {
    return ['https://music.163.com']
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('netease_player', entry as unknown as Record<string, unknown>)
  },
}
