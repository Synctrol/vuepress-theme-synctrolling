import type { AudioPlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { buildFallbackUrl } from '../urls.js'
import { AudioPlayerPlatform } from '../../client/components/platforms/renderers/AudioPlayerPlatform.js'
import {
  asEntryMap,
  assertAudioMime,
  assertAudioSource,
  assertAutoplay,
  createBase,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const audioPlayerType: PlatformTypeRegistration<AudioPlayerEntry> = {
  validate(raw: unknown): AudioPlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'src', 'mime', 'autoplay'])
    const platform = requirePlatformKey(entry)
    const src = assertAudioSource(entry.src)
    const mime =
      entry.mime === undefined ? undefined : assertAudioMime(entry.mime)
    const label = optionalLabel(entry)
    return {
      ...createBase(platform, label),
      src,
      ...(mime === undefined ? {} : { mime }),
      autoplay: assertAutoplay(entry.autoplay),
    }
  },
  component: AudioPlayerPlatform,
  cspOrigins(entry) {
    // Match assertAudioSource / parseHttpsUrl: scheme comparison is case-insensitive.
    if (/^https:\/\//i.test(entry.src)) {
      return [new URL(entry.src).origin]
    }
    return ["'self'"]
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('audio_player', entry as unknown as Record<string, unknown>)
  },
}
