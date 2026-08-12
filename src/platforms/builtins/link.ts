import type { Component } from 'vue'
import type { LinkEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { buildFallbackUrl } from '../urls.js'
import { createStubRenderer } from '../../client/components/platforms/renderers/placeholders.js'
import {
  asEntryMap,
  assertHttpsUrl,
  createBase,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const linkType: PlatformTypeRegistration<LinkEntry> = {
  validate(raw: unknown): LinkEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'url'])
    const platform = requirePlatformKey(entry)
    const label = optionalLabel(entry)
    return {
      ...createBase(platform, label),
      url: assertHttpsUrl(entry.url, 'link.url'),
    }
  },
  component: createStubRenderer('LinkPlatform') as Component,
  cspOrigins() {
    return []
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('link', entry as unknown as Record<string, unknown>)
  },
}
