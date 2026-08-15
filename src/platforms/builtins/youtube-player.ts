import type { YouTubePlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { buildFallbackUrl } from '../urls.js'
import { YouTubePlayerPlatform } from '../../client/components/platforms/renderers/YouTubePlayerPlatform.js'
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

const YOUTUBE_WATCH_PATTERN =
  /^https:\/\/(?:www\.|m\.)?youtube\.com\/watch\?([^#]*)/
const YOUTUBE_SHORT_PATTERN = /^https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})/

/**
 * Extract the 11-character video id from a YouTube watch or youtu.be link.
 * Returns undefined when the link shape is not recognized.
 */
export function normalizeYoutubeUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const shortMatch = YOUTUBE_SHORT_PATTERN.exec(raw)
  if (shortMatch) return shortMatch[1]
  const watchMatch = YOUTUBE_WATCH_PATTERN.exec(raw)
  if (watchMatch) {
    const params = new URLSearchParams(watchMatch[1] ?? '')
    return params.get('v') ?? undefined
  }
  return undefined
}

export const youtubePlayerType: PlatformTypeRegistration<YouTubePlayerEntry> = {
  validate(raw: unknown): YouTubePlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'videoId', 'start', 'autoplay', 'url'])
    const platform = requirePlatformKey(entry)

    let videoId: string
    let start: number | undefined
    let autoplay: boolean

    if (entry.url !== undefined) {
      if (
        entry.videoId !== undefined ||
        entry.start !== undefined ||
        entry.autoplay !== undefined
      ) {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'youtube_player: provide either url or videoId/start/autoplay, not both',
        )
      }
      const parsed = normalizeYoutubeUrl(entry.url)
      if (!parsed) {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'youtube_player.url must be a youtube.com/watch?v=… or youtu.be/… link',
        )
      }
      videoId = parsed
      start = undefined
      autoplay = false
    } else {
      if (
        typeof entry.videoId !== 'string' ||
        !/^[A-Za-z0-9_-]{11}$/.test(entry.videoId)
      ) {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'youtube_player.videoId must be exactly 11 [A-Za-z0-9_-] characters',
        )
      }
      videoId = entry.videoId
      start = optionalInteger(
        entry.start,
        0,
        'youtube_player.start must be a non-negative integer',
      )
      autoplay = assertAutoplay(entry.autoplay)
    }

    const label = optionalLabel(entry)
    return {
      ...createBase(platform, label),
      videoId,
      ...(start === undefined ? {} : { start }),
      autoplay,
    }
  },
  component: YouTubePlayerPlatform,
  cspOrigins() {
    return ['https://www.youtube.com']
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('youtube_player', entry as unknown as Record<string, unknown>)
  },
}
