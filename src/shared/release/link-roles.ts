import type {
  ContentDefinitions,
  NormalizedPlatformEntry,
} from '../types.js'
import type { PlatformTypeRegistration } from '../options.js'

export function isPreviewEntry(
  entry: NormalizedPlatformEntry,
  definitions: ContentDefinitions['platforms'],
  platformTypes: Record<string, PlatformTypeRegistration>,
): boolean {
  const definition = definitions[entry.platform]
  if (definition === undefined) return false
  const registration = platformTypes[definition.type]
  return registration?.preview === true
}

export function splitPreviewLinks(
  entries: NormalizedPlatformEntry[],
  definitions: ContentDefinitions['platforms'],
  platformTypes: Record<string, PlatformTypeRegistration>,
): {
  previewLinks: NormalizedPlatformEntry[]
  platformLinks: NormalizedPlatformEntry[]
} {
  const previewLinks: NormalizedPlatformEntry[] = []
  const platformLinks: NormalizedPlatformEntry[] = []
  for (const entry of entries) {
    ;(isPreviewEntry(entry, definitions, platformTypes)
      ? previewLinks
      : platformLinks
    ).push(entry)
  }
  return { previewLinks, platformLinks }
}
