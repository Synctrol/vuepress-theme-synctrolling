import type { Component } from 'vue'
import type { YouTubePlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { buildFallbackUrl } from '../urls.js'
import { createStubRenderer } from '../../client/components/platforms/renderers/placeholders.js'
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

export const youtubePlayerType: PlatformTypeRegistration<YouTubePlayerEntry> = {
  validate(raw: unknown): YouTubePlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'videoId', 'start', 'autoplay'])
    const platform = requirePlatformKey(entry)
    if (
      typeof entry.videoId !== 'string' ||
      !/^[A-Za-z0-9_-]{11}$/.test(entry.videoId)
    ) {
      invalid(
        'INVALID_PLATFORM_ENTRY',
        'youtube_player.videoId must be exactly 11 [A-Za-z0-9_-] characters',
      )
    }
    const start = optionalInteger(
      entry.start,
      0,
      'youtube_player.start must be a non-negative integer',
    )
    const label = optionalLabel(entry)
    return {
      ...createBase(platform, label),
      videoId: entry.videoId,
      ...(start === undefined ? {} : { start }),
      autoplay: assertAutoplay(entry.autoplay),
    }
  },
  component: createStubRenderer('YouTubePlayerPlatform') as Component,
  cspOrigins() {
    return ['https://www.youtube.com']
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('youtube_player', entry as unknown as Record<string, unknown>)
  },
}
