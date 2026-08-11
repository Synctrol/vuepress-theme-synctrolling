import { enMessages, zhMessages } from './messages.js'
import type {
  ContentType,
  LocaleKey,
  LocaleMessages,
  LocaleOptions,
  Multilanguage,
  PlatformEntryBase,
} from './types.js'

export type UrlSegment = string

export interface NavigationItem {
  label: Multilanguage
  href: Multilanguage
}

export interface NavigationOptions {
  items: NavigationItem[]
  externalTarget: '_blank' | '_self'
}

export interface SocialLink {
  label: Multilanguage
  icon: string
  url: string
}

export interface SocialLinksOptions {
  items: SocialLink[]
}

export interface ReleaseOptions {
  urlSegment: UrlSegment
  index: {
    enabled: boolean
    pagination: number | false
    mobileGridColumns: number
    desktopGridColumns: number
  }
  artworkPlaceholder?: string
}

export interface NewsOptions {
  urlSegment: UrlSegment
  index: {
    enabled: boolean
    pagination: number | false
  }
  tags: {
    urlSegment: UrlSegment
    index: {
      enabled: boolean
    }
  }
}

export interface PlatformTypeRegistration<
  T extends PlatformEntryBase = PlatformEntryBase,
> {
  validate(entry: unknown): T
  component: unknown
  cspOrigins(entry: T): string[]
  fallbackUrl?(entry: T): string
}

export interface PlatformsOptions {
  loadStrategy: 'interaction' | 'viewport'
  types: Record<string, PlatformTypeRegistration>
}

export interface SeoCollectionCopy {
  title: Multilanguage
  description: Multilanguage
}

export interface SeoOptions {
  name: Multilanguage
  description: Multilanguage
  defaultImage: string
  organization: {
    name: string
    logo: string
  }
  collections: {
    release: SeoCollectionCopy
    news: SeoCollectionCopy
  }
}

export type BackgroundLoader = () => Promise<unknown>

export interface SynctrolThemeOptions {
  siteUrl: string
  definitionsPath?: string
  mainLocale: LocaleKey
  locales: Record<LocaleKey, LocaleOptions>
  showDrafts?: boolean
  defaultColorMode?: 'auto' | 'light' | 'dark'
  copyright: Multilanguage
  feeds?: {
    rss: boolean
    sitemap: boolean
  }
  navigation?: NavigationOptions
  socialLinks?: SocialLinksOptions
  release?: ReleaseOptions
  news?: NewsOptions
  platforms?: PlatformsOptions
  backgrounds?: Partial<Record<ContentType, BackgroundLoader>>
  seo: SeoOptions
}

export interface ResolvedLocaleOptions {
  lang: string
  label: string
  dateFormat: Intl.DateTimeFormatOptions
  messages: LocaleMessages
}

export interface ResolvedSynctrolThemeOptions {
  siteUrl: string
  definitionsPath?: string
  mainLocale: LocaleKey
  locales: Record<LocaleKey, ResolvedLocaleOptions>
  showDrafts: boolean
  defaultColorMode: 'auto' | 'light' | 'dark'
  copyright: Multilanguage
  feeds: { rss: boolean; sitemap: boolean }
  navigation: NavigationOptions
  socialLinks: SocialLinksOptions
  release: ReleaseOptions
  news: NewsOptions
  platforms: PlatformsOptions
  backgrounds: Partial<Record<ContentType, BackgroundLoader>>
  seo: SeoOptions
}

const DEFAULT_MESSAGES: Record<'zh' | 'en', LocaleMessages> = {
  zh: zhMessages,
  en: enMessages,
}

function assertUrlSegment(value: unknown, field: string): void {
  if (
    typeof value !== 'string' ||
    !value ||
    value.trim() !== value ||
    /[\\/?#\u0000-\u001f\u007f-\u009f]/.test(value) ||
    /%(?:2f|5c)/i.test(value) ||
    value === '.' ||
    value === '..'
  ) {
    throw new Error(`Invalid ${field}: ${String(value)}`)
  }
}

function assertPagination(value: number | false, field: string): void {
  if (value === false) return
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Invalid ${field}: ${value}`)
  }
}

function assertGridColumns(
  value: number,
  field: string,
  maximum: number,
): void {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`Invalid ${field}`)
  }
}

function resolveMessages(
  localeKey: LocaleKey,
  partial?: Partial<LocaleMessages>,
): LocaleMessages {
  const defaults = DEFAULT_MESSAGES[localeKey as 'zh' | 'en']
  if (defaults) {
    const resolved = { ...defaults }
    if (!partial) return resolved

    const keys = Object.keys(defaults) as Array<keyof LocaleMessages>
    for (const key of keys) {
      const override = partial[key]
      if (override === undefined) continue
      if (typeof override !== 'string') {
        throw new Error(`Locale ${localeKey} messages invalid ${key}`)
      }
      resolved[key] = override
    }
    return resolved
  }
  if (!partial) {
    throw new Error(`Locale ${localeKey} requires complete messages`)
  }
  const required = Object.keys(enMessages) as Array<keyof LocaleMessages>
  for (const key of required) {
    if (typeof partial[key] !== 'string') {
      throw new Error(`Locale ${localeKey} messages missing ${key}`)
    }
  }
  return partial as LocaleMessages
}

export function resolveThemeOptions(
  input: SynctrolThemeOptions,
): ResolvedSynctrolThemeOptions {
  if (!input.locales[input.mainLocale]) {
    throw new Error(`mainLocale ${input.mainLocale} is not configured`)
  }

  const release: ReleaseOptions = {
    urlSegment:
      input.release?.urlSegment === undefined
        ? 'releases'
        : input.release.urlSegment,
    index: {
      enabled: input.release?.index?.enabled ?? true,
      pagination: input.release?.index?.pagination ?? 12,
      mobileGridColumns: input.release?.index?.mobileGridColumns ?? 2,
      desktopGridColumns: input.release?.index?.desktopGridColumns ?? 3,
    },
    artworkPlaceholder: input.release?.artworkPlaceholder,
  }

  assertUrlSegment(release.urlSegment, 'release.urlSegment')
  assertPagination(release.index.pagination, 'release.index.pagination')
  assertGridColumns(
    release.index.mobileGridColumns,
    'mobileGridColumns',
    3,
  )
  assertGridColumns(
    release.index.desktopGridColumns,
    'desktopGridColumns',
    6,
  )

  const news: NewsOptions = {
    urlSegment:
      input.news?.urlSegment === undefined ? 'news' : input.news.urlSegment,
    index: {
      enabled: input.news?.index?.enabled ?? true,
      pagination: input.news?.index?.pagination ?? 12,
    },
    tags: {
      urlSegment:
        input.news?.tags?.urlSegment === undefined
          ? 'tags'
          : input.news.tags.urlSegment,
      index: {
        enabled: input.news?.tags?.index?.enabled ?? true,
      },
    },
  }

  assertUrlSegment(news.urlSegment, 'news.urlSegment')
  assertUrlSegment(news.tags.urlSegment, 'news.tags.urlSegment')
  assertPagination(news.index.pagination, 'news.index.pagination')

  const locales: Record<LocaleKey, ResolvedLocaleOptions> = {}
  for (const [key, locale] of Object.entries(input.locales)) {
    locales[key] = {
      lang: locale.lang,
      label: locale.label,
      dateFormat: locale.dateFormat ?? { dateStyle: 'long' },
      messages: resolveMessages(key, locale.messages),
    }
  }

  return {
    siteUrl: input.siteUrl.replace(/\/+$/, ''),
    definitionsPath: input.definitionsPath,
    mainLocale: input.mainLocale,
    locales,
    showDrafts: input.showDrafts ?? false,
    defaultColorMode: input.defaultColorMode ?? 'auto',
    copyright: input.copyright,
    feeds: {
      rss: input.feeds?.rss ?? true,
      sitemap: input.feeds?.sitemap ?? true,
    },
    navigation: {
      externalTarget: input.navigation?.externalTarget ?? '_blank',
      items: input.navigation?.items ?? [],
    },
    socialLinks: {
      items: input.socialLinks?.items ?? [],
    },
    release,
    news,
    platforms: {
      loadStrategy: input.platforms?.loadStrategy ?? 'interaction',
      types: input.platforms?.types ?? {},
    },
    backgrounds: input.backgrounds ?? {},
    seo: input.seo,
  }
}
