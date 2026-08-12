import type { Component } from 'vue'
import type { BilibiliPlayerEntry } from '../../shared/types.js'
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

export const bilibiliPlayerType: PlatformTypeRegistration<BilibiliPlayerEntry> =
  {
    validate(raw: unknown): BilibiliPlayerEntry {
      const entry = asEntryMap(raw)
      rejectUnknown(entry, ['platform', 'label', 'bvid', 'page', 'autoplay'])
      const platform = requirePlatformKey(entry)
      if (
        typeof entry.bvid !== 'string' ||
        !/^BV[A-Za-z0-9]{10}$/.test(entry.bvid)
      ) {
        invalid(
          'INVALID_PLATFORM_ENTRY',
          'bilibili_player.bvid must be BV followed by ten ASCII letters or digits',
        )
      }
      const page = optionalInteger(
        entry.page,
        1,
        'bilibili_player.page must be an integer >= 1',
      )
      const label = optionalLabel(entry)
      return {
        ...createBase(platform, label),
        bvid: entry.bvid,
        ...(page === undefined ? {} : { page }),
        autoplay: assertAutoplay(entry.autoplay),
      }
    },
    component: createStubRenderer('BilibiliPlayerPlatform') as Component,
    cspOrigins() {
      return ['https://player.bilibili.com']
    },
    fallbackUrl(entry) {
      return buildFallbackUrl('bilibili_player', entry as unknown as Record<string, unknown>)
    },
  }
