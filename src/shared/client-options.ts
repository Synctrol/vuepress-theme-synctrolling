import type {
  NavigationOptions,
  NewsOptions,
  PlatformsOptions,
  ReleaseOptions,
  ResolvedLocaleOptions,
  ResolvedSynctrolThemeOptions,
  SocialLinksOptions,
} from './options.js'
import type { LocaleKey, Multilanguage } from './types.js'

export interface ClientPlatformsOptions {
  loadStrategy: PlatformsOptions['loadStrategy']
}

export interface ClientSynctrolThemeOptions {
  siteUrl: string
  mainLocale: LocaleKey
  locales: Record<LocaleKey, ResolvedLocaleOptions>
  showDrafts: boolean
  defaultColorMode: ResolvedSynctrolThemeOptions['defaultColorMode']
  copyright: Multilanguage
  navigation: NavigationOptions
  socialLinks: SocialLinksOptions
  release: ReleaseOptions
  news: NewsOptions
  platforms: ClientPlatformsOptions
}

function copyMultilanguage(value: Multilanguage): Multilanguage {
  return typeof value === 'string' ? value : { ...value }
}

function copyLocales(
  locales: ResolvedSynctrolThemeOptions['locales'],
): ClientSynctrolThemeOptions['locales'] {
  const clientLocales = Object.create(null) as Record<
    LocaleKey,
    ResolvedLocaleOptions
  >

  for (const [localeKey, locale] of Object.entries(locales)) {
    clientLocales[localeKey] = {
      lang: locale.lang,
      label: locale.label,
      dateFormat: { ...locale.dateFormat },
      messages: { ...locale.messages },
    }
  }

  return clientLocales
}

function copyNavigation(
  navigation: NavigationOptions,
): NavigationOptions {
  return {
    externalTarget: navigation.externalTarget,
    items: navigation.items.map((item) => ({
      label: copyMultilanguage(item.label),
      href: copyMultilanguage(item.href),
    })),
  }
}

function copySocialLinks(
  socialLinks: SocialLinksOptions,
): SocialLinksOptions {
  return {
    items: socialLinks.items.map((item) => ({
      label: copyMultilanguage(item.label),
      icon: item.icon,
      url: item.url,
    })),
  }
}

function copyRelease(release: ReleaseOptions): ReleaseOptions {
  return {
    urlSegment: release.urlSegment,
    index: { ...release.index },
    ...(release.artworkPlaceholder === undefined
      ? {}
      : { artworkPlaceholder: release.artworkPlaceholder }),
  }
}

function copyNews(news: NewsOptions): NewsOptions {
  return {
    urlSegment: news.urlSegment,
    index: { ...news.index },
    tags: {
      urlSegment: news.tags.urlSegment,
      index: { ...news.tags.index },
    },
  }
}

function assertJsonSafe(
  value: unknown,
  path: string,
  ancestors: Set<object>,
): void {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid ${path}: expected a finite JSON number`)
    }
    return
  }

  if (typeof value !== 'object') {
    throw new Error(`Invalid ${path}: value is not JSON-safe`)
  }

  if (ancestors.has(value)) {
    throw new Error(`Invalid ${path}: circular value is not JSON-safe`)
  }

  const prototype = Object.getPrototypeOf(value)
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new Error(`Invalid ${path}: expected a JSON object`)
  }

  ancestors.add(value)
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertJsonSafe(item, `${path}[${index}]`, ancestors),
    )
  } else {
    for (const [key, item] of Object.entries(value)) {
      assertJsonSafe(item, `${path}.${key}`, ancestors)
    }
  }
  ancestors.delete(value)
}

export function toClientThemeOptions(
  resolved: ResolvedSynctrolThemeOptions,
): ClientSynctrolThemeOptions {
  const clientOptions: ClientSynctrolThemeOptions = {
    siteUrl: resolved.siteUrl,
    mainLocale: resolved.mainLocale,
    locales: copyLocales(resolved.locales),
    showDrafts: resolved.showDrafts,
    defaultColorMode: resolved.defaultColorMode,
    copyright: copyMultilanguage(resolved.copyright),
    navigation: copyNavigation(resolved.navigation),
    socialLinks: copySocialLinks(resolved.socialLinks),
    release: copyRelease(resolved.release),
    news: copyNews(resolved.news),
    platforms: {
      loadStrategy: resolved.platforms.loadStrategy,
    },
  }

  assertJsonSafe(clientOptions, 'clientOptions', new Set())
  return clientOptions
}
