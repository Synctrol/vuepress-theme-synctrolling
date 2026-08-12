import { enMessages, zhMessages } from './messages.js'
import {
  assertRouteSegment,
  validateThemeOptions,
} from './options-validation.js'
import type { BackgroundLoader } from './background.js'
import type {
  ContentType,
  LocaleKey,
  LocaleMessages,
  LocaleOptions,
  Multilanguage,
  PlatformEntryBase,
} from './types.js'

export type { BackgroundLoader } from './background.js'

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
  const defaults = Object.hasOwn(DEFAULT_MESSAGES, localeKey)
    ? DEFAULT_MESSAGES[localeKey as 'zh' | 'en']
    : undefined
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
  return { ...partial } as LocaleMessages
}

function copyMultilanguage(value: Multilanguage): Multilanguage {
  return typeof value === 'string' ? value : { ...value }
}

function copySeoCollection(value: SeoCollectionCopy): SeoCollectionCopy {
  return {
    title: copyMultilanguage(value.title),
    description: copyMultilanguage(value.description),
  }
}

function copySeo(value: SeoOptions): SeoOptions {
  return {
    name: copyMultilanguage(value.name),
    description: copyMultilanguage(value.description),
    defaultImage: value.defaultImage,
    organization: { ...value.organization },
    collections: {
      release: copySeoCollection(value.collections.release),
      news: copySeoCollection(value.collections.news),
    },
  }
}

function copyPlatformTypes(
  types: Record<string, PlatformTypeRegistration> | undefined,
): Record<string, PlatformTypeRegistration> {
  return { ...(types ?? {}) }
}

export function resolveThemeOptions(
  input: SynctrolThemeOptions,
): ResolvedSynctrolThemeOptions {
  validateThemeOptions(input)

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

  assertRouteSegment(release.urlSegment, 'options.release.urlSegment')
  assertPagination(
    release.index.pagination,
    'options.release.index.pagination',
  )
  assertGridColumns(
    release.index.mobileGridColumns,
    'options.release.index.mobileGridColumns',
    3,
  )
  assertGridColumns(
    release.index.desktopGridColumns,
    'options.release.index.desktopGridColumns',
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

  assertRouteSegment(news.urlSegment, 'options.news.urlSegment')
  assertRouteSegment(news.tags.urlSegment, 'options.news.tags.urlSegment')
  assertPagination(news.index.pagination, 'options.news.index.pagination')

  const locales = Object.create(null) as Record<
    LocaleKey,
    ResolvedLocaleOptions
  >
  for (const [key, locale] of Object.entries(input.locales)) {
    locales[key] = {
      lang: locale.lang,
      label: locale.label,
      dateFormat: { ...(locale.dateFormat ?? { dateStyle: 'long' }) },
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
    copyright: copyMultilanguage(input.copyright),
    feeds: {
      rss: input.feeds?.rss ?? true,
      sitemap: input.feeds?.sitemap ?? true,
    },
    navigation: {
      externalTarget: input.navigation?.externalTarget ?? '_blank',
      items: (input.navigation?.items ?? []).map((item) => ({
        label: copyMultilanguage(item.label),
        href: copyMultilanguage(item.href),
      })),
    },
    socialLinks: {
      items: (input.socialLinks?.items ?? []).map((item) => ({
        label: copyMultilanguage(item.label),
        icon: item.icon,
        url: item.url,
      })),
    },
    release,
    news,
    platforms: {
      loadStrategy: input.platforms?.loadStrategy ?? 'interaction',
      types: copyPlatformTypes(input.platforms?.types),
    },
    backgrounds: { ...(input.backgrounds ?? {}) },
    seo: copySeo(input.seo),
  }
}
