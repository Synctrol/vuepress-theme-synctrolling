import type { BilibiliPlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { buildFallbackUrl } from '../urls.js'
import { BilibiliPlayerPlatform } from '../../client/components/platforms/renderers/BilibiliPlayerPlatform.js'
import {
  asEntryMap,
  assertAutoplay,
  createBase,
  invalid,
  optionalInteger,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

const BILIBILI_URL_PATTERN =
  /^https:\/\/(?:www\.|m\.)?bilibili\.com\/video\/(BV[A-Za-z0-9]{10})/

/**
 * Extract the BV id from a bilibili video page link. Returns undefined when
 * the link shape is not recognized.
 */
export function normalizeBilibiliUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const match = BILIBILI_URL_PATTERN.exec(raw)
  if (!match) return undefined
  return match[1]
}

export const bilibiliPlayerType: PlatformTypeRegistration<BilibiliPlayerEntry> =
  {
    validate(raw: unknown): BilibiliPlayerEntry {
      const entry = asEntryMap(raw)
      rejectUnknown(entry, ['platform', 'label', 'bvid', 'page', 'autoplay', 'url'])
      const platform = requirePlatformKey(entry)

      let bvid: string
      let page: number | undefined
      let autoplay: boolean

      if (entry.url !== undefined) {
        if (
          entry.bvid !== undefined ||
          entry.page !== undefined ||
          entry.autoplay !== undefined
        ) {
          invalid(
            'INVALID_PLATFORM_ENTRY',
            'bilibili_player: provide either url or bvid/page/autoplay, not both',
          )
        }
        const parsed = normalizeBilibiliUrl(entry.url)
        if (!parsed) {
          invalid(
            'INVALID_PLATFORM_ENTRY',
            'bilibili_player.url must be a bilibili.com/video/BV… link',
          )
        }
        bvid = parsed
        page = undefined
        autoplay = false
      } else {
        if (
          typeof entry.bvid !== 'string' ||
          !/^BV[A-Za-z0-9]{10}$/.test(entry.bvid)
        ) {
          invalid(
            'INVALID_PLATFORM_ENTRY',
            'bilibili_player.bvid must be BV followed by ten ASCII letters or digits',
          )
        }
        bvid = entry.bvid
        page = optionalInteger(
          entry.page,
          1,
          'bilibili_player.page must be an integer >= 1',
        )
        autoplay = assertAutoplay(entry.autoplay)
      }

      const label = optionalLabel(entry)
      return {
        ...createBase(platform, label),
        bvid,
        ...(page === undefined ? {} : { page }),
        autoplay,
      }
    },
    component: BilibiliPlayerPlatform,
    cspOrigins() {
      return ['https://player.bilibili.com']
    },
    fallbackUrl(entry) {
      return buildFallbackUrl('bilibili_player', entry as unknown as Record<string, unknown>)
    },
  }
