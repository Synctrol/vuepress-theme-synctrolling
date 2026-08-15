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

const NETEASE_URL_PATTERN =
  /^https:\/\/music\.163\.com\/(?:#\/)?(song|album|playlist)\?([^#]*)$/

export type NeteaseResourceType = NeteasePlayerEntry['resourceType']

/**
 * Parse a `music.163.com` share link into `{ id, resourceType }`. Accepts
 * both the address-bar form (`/#/album?id=…`) and the plain form
 * (`/album?id=…`) for song, album, and playlist links. Returns undefined
 * when the link shape is not recognized or has no numeric `id`.
 */
export function normalizeNeteaseUrl(
  raw: unknown,
): { id: string; resourceType: NeteaseResourceType } | undefined {
  if (typeof raw !== 'string') return undefined
  const match = NETEASE_URL_PATTERN.exec(raw)
  if (!match) return undefined
  const params = new URLSearchParams(match[2] ?? '')
  const id = params.get('id')
  if (!id || !/^\d+$/.test(id)) return undefined
  return {
    id,
    resourceType: match[1] as NeteaseResourceType,
  }
}

export const neteasePlayerType: PlatformTypeRegistration<NeteasePlayerEntry> = {
  preview: true,
  validate(raw: unknown): NeteasePlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'id', 'resourceType', 'url'])
    const platform = requirePlatformKey(entry)

    let id: string
    let resourceType: NeteaseResourceType

    if (entry.url !== undefined) {
      if (entry.id !== undefined || entry.resourceType !== undefined) {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'netease_player: provide either url or id+resourceType, not both',
        )
      }
      const parsed = normalizeNeteaseUrl(entry.url)
      if (!parsed) {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'netease_player.url must be a music.163.com song|album|playlist link with a numeric id parameter',
        )
      }
      id = parsed.id
      resourceType = parsed.resourceType
    } else {
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
      id = entry.id
      resourceType = entry.resourceType
    }

    const label = optionalLabel(entry)
    return {
      ...createBase(platform, label),
      id,
      resourceType,
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
