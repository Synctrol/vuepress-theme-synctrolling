import { enMessages } from './messages.js'
import type {
  NavigationItem,
  PlatformTypeRegistration,
  SeoCollectionCopy,
  SocialLink,
  SynctrolThemeOptions,
} from './options.js'
import { CONTENT_TYPES } from './types.js'
import type { LocaleOptions, Multilanguage } from './types.js'

type PlainObject = Record<string, unknown>

const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

const TOP_LEVEL_FIELDS = [
  'siteUrl',
  'definitionsPath',
  'mainLocale',
  'locales',
  'showDrafts',
  'defaultColorMode',
  'copyright',
  'feeds',
  'navigation',
  'socialLinks',
  'release',
  'news',
  'platforms',
  'backgrounds',
  'seo',
] as const

const LOCALE_FIELDS = ['lang', 'label', 'dateFormat', 'messages'] as const
const MESSAGE_FIELDS = Object.keys(enMessages)
const FEED_FIELDS = ['rss', 'sitemap'] as const
const NAVIGATION_FIELDS = ['items', 'externalTarget'] as const
const NAVIGATION_ITEM_FIELDS = ['label', 'href'] as const
const SOCIAL_LINKS_FIELDS = ['items'] as const
const SOCIAL_LINK_FIELDS = ['label', 'icon', 'url'] as const
const RELEASE_FIELDS = ['urlSegment', 'index', 'artworkPlaceholder'] as const
const RELEASE_INDEX_FIELDS = [
  'enabled',
  'pagination',
  'mobileGridColumns',
  'desktopGridColumns',
] as const
const NEWS_FIELDS = ['urlSegment', 'index', 'tags'] as const
const NEWS_INDEX_FIELDS = ['enabled', 'pagination'] as const
const NEWS_TAG_FIELDS = ['urlSegment', 'index'] as const
const ENABLED_FIELDS = ['enabled'] as const
const PLATFORM_FIELDS = ['loadStrategy', 'types'] as const
const PLATFORM_TYPE_FIELDS = [
  'validate',
  'component',
  'cspOrigins',
  'fallbackUrl',
] as const
const SEO_FIELDS = [
  'name',
  'description',
  'defaultImage',
  'organization',
  'collections',
] as const
const SEO_ORGANIZATION_FIELDS = ['name', 'logo'] as const
const SEO_COLLECTION_FIELDS = ['release', 'news'] as const
const SEO_COLLECTION_COPY_FIELDS = ['title', 'description'] as const

function isPlainObject(value: unknown): value is PlainObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function assertPlainObject(
  value: unknown,
  field: string,
): asserts value is PlainObject {
  if (!isPlainObject(value)) {
    throw new Error(`Invalid ${field}: expected a plain object`)
  }
}

function assertSafeKey(key: string, field: string): void {
  if (DANGEROUS_KEYS.has(key)) {
    throw new Error(`Invalid ${field}: unsafe key "${key}"`)
  }
}

function assertDynamicKey(key: string, field: string): void {
  assertSafeKey(key, field)
  if (!key || key.trim() !== key) {
    throw new Error(`Invalid ${field}: expected a non-empty key`)
  }
}

function hasUnsafeRouteSemantics(value: string): boolean {
  return (
    !value ||
    value.trim() !== value ||
    DANGEROUS_KEYS.has(value) ||
    /[\\/?#\u0000-\u001f\u007f-\u009f]/.test(value) ||
    /%(?:2e|2f|5c)/i.test(value) ||
    value === '.' ||
    value === '..'
  )
}

export function assertRouteSegment(value: unknown, field: string): void {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${field}: ${String(value)}`)
  }

  let decoded = value
  while (true) {
    if (hasUnsafeRouteSemantics(decoded)) {
      throw new Error(`Invalid ${field}: ${value}`)
    }

    if (!decoded.includes('%')) return

    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) return
      decoded = next
    } catch {
      throw new Error(`Invalid ${field}: ${value}`)
    }
  }
}

function assertKnownFields(
  value: PlainObject,
  allowed: readonly string[],
  field: string,
): void {
  for (const key of Object.keys(value)) {
    const keyField = `${field}.${key}`
    assertSafeKey(key, keyField)
    if (!allowed.includes(key)) {
      throw new Error(`Unknown field ${keyField}`)
    }
  }
}

function assertSafeObjectKeys(value: PlainObject, field: string): void {
  for (const key of Object.keys(value)) {
    assertSafeKey(key, `${field}.${key}`)
  }
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid ${field}: expected a non-empty string`)
  }
}

function assertOptionalString(value: unknown, field: string): void {
  if (value !== undefined) {
    assertNonEmptyString(value, field)
  }
}

function assertOptionalBoolean(value: unknown, field: string): void {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new Error(`Invalid ${field}: expected a boolean`)
  }
}

function assertOptionalEnum(
  value: unknown,
  allowed: readonly string[],
  field: string,
): void {
  if (value !== undefined && !allowed.includes(value as string)) {
    throw new Error(
      `Invalid ${field}: expected one of ${allowed.map((item) => `"${item}"`).join(', ')}`,
    )
  }
}

function assertArray(value: unknown, field: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${field}: expected an array`)
  }
}

function assertOptionalPagination(value: unknown, field: string): void {
  if (
    value !== undefined &&
    value !== false &&
    (!Number.isInteger(value) || (value as number) < 1)
  ) {
    throw new Error(`Invalid ${field}: expected a positive integer or false`)
  }
}

function assertOptionalGridColumns(value: unknown, field: string): void {
  if (
    value !== undefined &&
    (!Number.isInteger(value) || (value as number) < 1)
  ) {
    throw new Error(`Invalid ${field}: expected a positive integer`)
  }
}

function validateMultilanguage(
  value: unknown,
  field: string,
  mainLocale: string,
): void {
  if (typeof value === 'string') return

  assertPlainObject(value, field)
  if (
    !Object.hasOwn(value, mainLocale) ||
    typeof value[mainLocale] !== 'string'
  ) {
    throw new Error(
      `Invalid ${field}.${mainLocale}: expected an own string for mainLocale "${mainLocale}"`,
    )
  }

  for (const [key, text] of Object.entries(value)) {
    assertRouteSegment(key, `${field}.${key}`)
    if (typeof text !== 'string') {
      throw new Error(`Invalid ${field}.${key}: expected a string`)
    }
  }
}

function validateLocale(
  locale: unknown,
  localeKey: string,
): asserts locale is LocaleOptions {
  const field = `options.locales.${localeKey}`
  assertPlainObject(locale, field)
  assertKnownFields(locale, LOCALE_FIELDS, field)
  assertNonEmptyString(locale.lang, `${field}.lang`)
  assertNonEmptyString(locale.label, `${field}.label`)

  if (locale.dateFormat !== undefined) {
    assertPlainObject(locale.dateFormat, `${field}.dateFormat`)
    assertSafeObjectKeys(locale.dateFormat, `${field}.dateFormat`)
  }

  if (locale.messages !== undefined) {
    assertPlainObject(locale.messages, `${field}.messages`)
    assertKnownFields(locale.messages, MESSAGE_FIELDS, `${field}.messages`)
    for (const [key, message] of Object.entries(locale.messages)) {
      if (message !== undefined && typeof message !== 'string') {
        throw new Error(
          `Invalid ${field}.messages.${key}: expected a string or undefined`,
        )
      }
    }
  }
}

function validateLocales(input: SynctrolThemeOptions): void {
  assertPlainObject(input.locales, 'options.locales')
  for (const [localeKey, locale] of Object.entries(input.locales)) {
    assertRouteSegment(localeKey, `options.locales.${localeKey}`)
    validateLocale(locale, localeKey)
  }

  if (!Object.hasOwn(input.locales, input.mainLocale)) {
    throw new Error(`mainLocale ${input.mainLocale} is not configured as an own locale`)
  }
}

function validateFeeds(value: unknown): void {
  if (value === undefined) return
  assertPlainObject(value, 'options.feeds')
  assertKnownFields(value, FEED_FIELDS, 'options.feeds')
  assertOptionalBoolean(value.rss, 'options.feeds.rss')
  assertOptionalBoolean(value.sitemap, 'options.feeds.sitemap')
}

function validateNavigationItem(
  value: unknown,
  index: number,
  mainLocale: string,
): asserts value is NavigationItem {
  const field = `options.navigation.items[${index}]`
  assertPlainObject(value, field)
  assertKnownFields(value, NAVIGATION_ITEM_FIELDS, field)
  validateMultilanguage(value.label, `${field}.label`, mainLocale)
  validateMultilanguage(value.href, `${field}.href`, mainLocale)
}

function validateNavigation(value: unknown, mainLocale: string): void {
  if (value === undefined) return
  assertPlainObject(value, 'options.navigation')
  assertKnownFields(value, NAVIGATION_FIELDS, 'options.navigation')
  assertOptionalEnum(
    value.externalTarget,
    ['_blank', '_self'],
    'options.navigation.externalTarget',
  )

  if (value.items !== undefined) {
    assertArray(value.items, 'options.navigation.items')
    value.items.forEach((item, index) =>
      validateNavigationItem(item, index, mainLocale),
    )
  }
}

function validateSocialLink(
  value: unknown,
  index: number,
  mainLocale: string,
): asserts value is SocialLink {
  const field = `options.socialLinks.items[${index}]`
  assertPlainObject(value, field)
  assertKnownFields(value, SOCIAL_LINK_FIELDS, field)
  validateMultilanguage(value.label, `${field}.label`, mainLocale)
  assertNonEmptyString(value.icon, `${field}.icon`)
  assertNonEmptyString(value.url, `${field}.url`)
}

function validateSocialLinks(value: unknown, mainLocale: string): void {
  if (value === undefined) return
  assertPlainObject(value, 'options.socialLinks')
  assertKnownFields(value, SOCIAL_LINKS_FIELDS, 'options.socialLinks')

  if (value.items !== undefined) {
    assertArray(value.items, 'options.socialLinks.items')
    value.items.forEach((item, index) =>
      validateSocialLink(item, index, mainLocale),
    )
  }
}

function validateRelease(value: unknown): void {
  if (value === undefined) return
  assertPlainObject(value, 'options.release')
  assertKnownFields(value, RELEASE_FIELDS, 'options.release')
  if (value.urlSegment !== undefined) {
    assertRouteSegment(value.urlSegment, 'options.release.urlSegment')
  }
  assertOptionalString(
    value.artworkPlaceholder,
    'options.release.artworkPlaceholder',
  )

  if (value.index !== undefined) {
    assertPlainObject(value.index, 'options.release.index')
    assertKnownFields(
      value.index,
      RELEASE_INDEX_FIELDS,
      'options.release.index',
    )
    assertOptionalBoolean(
      value.index.enabled,
      'options.release.index.enabled',
    )
    assertOptionalPagination(
      value.index.pagination,
      'options.release.index.pagination',
    )
    assertOptionalGridColumns(
      value.index.mobileGridColumns,
      'options.release.index.mobileGridColumns',
    )
    assertOptionalGridColumns(
      value.index.desktopGridColumns,
      'options.release.index.desktopGridColumns',
    )
  }
}

function validateNews(value: unknown): void {
  if (value === undefined) return
  assertPlainObject(value, 'options.news')
  assertKnownFields(value, NEWS_FIELDS, 'options.news')
  if (value.urlSegment !== undefined) {
    assertRouteSegment(value.urlSegment, 'options.news.urlSegment')
  }

  if (value.index !== undefined) {
    assertPlainObject(value.index, 'options.news.index')
    assertKnownFields(value.index, NEWS_INDEX_FIELDS, 'options.news.index')
    assertOptionalBoolean(value.index.enabled, 'options.news.index.enabled')
    assertOptionalPagination(
      value.index.pagination,
      'options.news.index.pagination',
    )
  }

  if (value.tags !== undefined) {
    assertPlainObject(value.tags, 'options.news.tags')
    assertKnownFields(value.tags, NEWS_TAG_FIELDS, 'options.news.tags')
    if (value.tags.urlSegment !== undefined) {
      assertRouteSegment(
        value.tags.urlSegment,
        'options.news.tags.urlSegment',
      )
    }

    if (value.tags.index !== undefined) {
      assertPlainObject(value.tags.index, 'options.news.tags.index')
      assertKnownFields(
        value.tags.index,
        ENABLED_FIELDS,
        'options.news.tags.index',
      )
      assertOptionalBoolean(
        value.tags.index.enabled,
        'options.news.tags.index.enabled',
      )
    }
  }
}

function validatePlatformRegistration(
  value: unknown,
  platformType: string,
): asserts value is PlatformTypeRegistration {
  const field = `options.platforms.types.${platformType}`
  assertPlainObject(value, field)
  assertKnownFields(value, PLATFORM_TYPE_FIELDS, field)
  if (!Object.hasOwn(value, 'component')) {
    throw new Error(`Invalid ${field}.component: expected an own field`)
  }
  if (typeof value.validate !== 'function') {
    throw new Error(`Invalid ${field}.validate: expected a function`)
  }
  if (typeof value.cspOrigins !== 'function') {
    throw new Error(`Invalid ${field}.cspOrigins: expected a function`)
  }
  if (
    value.fallbackUrl !== undefined &&
    typeof value.fallbackUrl !== 'function'
  ) {
    throw new Error(`Invalid ${field}.fallbackUrl: expected a function`)
  }
}

function validatePlatforms(value: unknown): void {
  if (value === undefined) return
  assertPlainObject(value, 'options.platforms')
  assertKnownFields(value, PLATFORM_FIELDS, 'options.platforms')
  assertOptionalEnum(
    value.loadStrategy,
    ['interaction', 'viewport'],
    'options.platforms.loadStrategy',
  )

  if (value.types !== undefined) {
    assertPlainObject(value.types, 'options.platforms.types')
    for (const [platformType, registration] of Object.entries(value.types)) {
      assertDynamicKey(
        platformType,
        `options.platforms.types.${platformType}`,
      )
      validatePlatformRegistration(registration, platformType)
    }
  }
}

function validateBackgrounds(value: unknown): void {
  if (value === undefined) return
  assertPlainObject(value, 'options.backgrounds')
  assertKnownFields(value, CONTENT_TYPES, 'options.backgrounds')
  for (const [contentType, loader] of Object.entries(value)) {
    if (typeof loader !== 'function') {
      throw new Error(
        `Invalid options.backgrounds.${contentType}: expected a function`,
      )
    }
  }
}

function validateSeoCollectionCopy(
  value: unknown,
  collection: string,
  mainLocale: string,
): asserts value is SeoCollectionCopy {
  const field = `options.seo.collections.${collection}`
  assertPlainObject(value, field)
  assertKnownFields(value, SEO_COLLECTION_COPY_FIELDS, field)
  validateMultilanguage(value.title, `${field}.title`, mainLocale)
  validateMultilanguage(value.description, `${field}.description`, mainLocale)
}

function validateSeo(value: unknown, mainLocale: string): void {
  assertPlainObject(value, 'options.seo')
  assertKnownFields(value, SEO_FIELDS, 'options.seo')
  validateMultilanguage(value.name, 'options.seo.name', mainLocale)
  validateMultilanguage(
    value.description,
    'options.seo.description',
    mainLocale,
  )
  assertNonEmptyString(value.defaultImage, 'options.seo.defaultImage')

  assertPlainObject(value.organization, 'options.seo.organization')
  assertKnownFields(
    value.organization,
    SEO_ORGANIZATION_FIELDS,
    'options.seo.organization',
  )
  assertNonEmptyString(
    value.organization.name,
    'options.seo.organization.name',
  )
  assertNonEmptyString(
    value.organization.logo,
    'options.seo.organization.logo',
  )

  assertPlainObject(value.collections, 'options.seo.collections')
  assertKnownFields(
    value.collections,
    SEO_COLLECTION_FIELDS,
    'options.seo.collections',
  )
  validateSeoCollectionCopy(value.collections.release, 'release', mainLocale)
  validateSeoCollectionCopy(value.collections.news, 'news', mainLocale)
}

export function validateThemeOptions(input: SynctrolThemeOptions): void {
  assertPlainObject(input, 'options')
  assertKnownFields(input, TOP_LEVEL_FIELDS, 'options')
  assertNonEmptyString(input.siteUrl, 'options.siteUrl')
  assertOptionalString(input.definitionsPath, 'options.definitionsPath')
  assertNonEmptyString(input.mainLocale, 'options.mainLocale')
  assertRouteSegment(input.mainLocale, 'options.mainLocale')
  validateLocales(input)
  assertOptionalBoolean(input.showDrafts, 'options.showDrafts')
  assertOptionalEnum(
    input.defaultColorMode,
    ['auto', 'light', 'dark'],
    'options.defaultColorMode',
  )
  validateMultilanguage(input.copyright, 'options.copyright', input.mainLocale)
  validateFeeds(input.feeds)
  validateNavigation(input.navigation, input.mainLocale)
  validateSocialLinks(input.socialLinks, input.mainLocale)
  validateRelease(input.release)
  validateNews(input.news)
  validatePlatforms(input.platforms)
  validateBackgrounds(input.backgrounds)
  validateSeo(input.seo, input.mainLocale)
}
