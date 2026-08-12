import type { CompiledSite } from '../../src/compiler/compile-site-routes.js'
import type { ResolvedSynctrolThemeOptions } from '../../src/shared/options.js'
import type { CompiledPage } from '../../src/shared/route-types.js'
import type { ContentDefinitions, LocaleKey } from '../../src/shared/types.js'
import { enMessages, zhMessages } from '../../src/shared/messages.js'
import type { SeoContentContext } from '../../src/shared/seo/types.js'

export function definitions(
  overrides: Partial<ContentDefinitions> = {},
): ContentDefinitions {
  return {
    tags: {},
    platforms: {},
    ...overrides,
  }
}

export function resolvedOptions(
  overrides: Partial<ResolvedSynctrolThemeOptions> = {},
): ResolvedSynctrolThemeOptions {
  const base: ResolvedSynctrolThemeOptions = {
    siteUrl: 'https://synctrol.com',
    mainLocale: 'zh',
    locales: {
      zh: { lang: 'zh-CN', label: '中文', dateFormat: { dateStyle: 'long' }, messages: zhMessages },
      en: { lang: 'en-US', label: 'English', dateFormat: { dateStyle: 'long' }, messages: enMessages },
    },
    showDrafts: false,
    defaultColorMode: 'auto',
    topbarText: 'SYNCTROL (C) 2026',
    feeds: { rss: true, sitemap: true },
    navigation: { externalTarget: '_blank', items: [] },
    socialLinks: { items: [] },
    release: {
      urlSegment: 'releases',
      index: { enabled: true, pagination: 12, mobileGridColumns: 2, desktopGridColumns: 3 },
    },
    news: {
      urlSegment: 'news',
      index: { enabled: true, pagination: 12 },
      tags: { urlSegment: 'tags', index: { enabled: true } },
    },
    platforms: { loadStrategy: 'interaction', types: {} },
    backgrounds: {},
    seo: {
      name: { zh: 'Synctrol', en: 'Synctrol' },
      description: { zh: 'Synctrol 音乐团队官方网站', en: 'Official website of the Synctrol music team' },
      defaultImage: './assets/social-default.webp',
      organization: { name: 'Synctrol', logo: './assets/logo.svg' },
      collections: {
        release: { title: { zh: '作品', en: 'Releases' }, description: { zh: 'Synctrol 作品列表', en: 'Synctrol releases' } },
        news: { title: { zh: '新闻', en: 'News' }, description: { zh: 'Synctrol 新闻', en: 'Synctrol news' } },
      },
    },
  }

  return {
    ...base,
    ...overrides,
    locales: overrides.locales ?? base.locales,
    feeds: overrides.feeds ?? base.feeds,
    seo: overrides.seo ?? base.seo,
  }
}

export function url(absoluteUrl: string, routePath?: string): CompiledPage['url'] {
  const path = routePath ?? absoluteUrl.replace('https://synctrol.com', '')
  return {
    routePath: path,
    outputPath: `${path.slice(1)}index.html`.replace(/\/index\.html$/, '/index.html'),
    publicPath: path,
    absoluteUrl,
  }
}

export function page(
  overrides: Partial<CompiledPage> & Pick<CompiledPage, 'identity' | 'locale' | 'contentType' | 'url'>,
): CompiledPage {
  return {
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: overrides.locale,
    canonicalLocale: overrides.locale,
    title: overrides.title ?? String(overrides.identity),
    description: overrides.description,
    ...overrides,
  }
}

export function seoContentContext(
  overrides: Partial<SeoContentContext> = {},
): SeoContentContext {
  return {
    assets: {
      defaultImageAbsoluteUrl: 'https://synctrol.com/assets/global/social-default.hash.webp',
      organizationLogoAbsoluteUrl: 'https://synctrol.com/assets/global/logo.hash.svg',
      coverAbsoluteUrlByPackagePath: new Map(),
      ...overrides.assets,
    },
    definitions: definitions(overrides.definitions),
    bookByPackagePath: overrides.bookByPackagePath ?? new Map(),
    dateByPackagePath: overrides.dateByPackagePath ?? new Map(),
    updatedByPackagePath: overrides.updatedByPackagePath ?? new Map(),
  }
}

export function siteFixture(pages: CompiledPage[]): CompiledSite {
  return { pages, diagnostics: [], rootRouterHtml: '<!doctype html><html></html>' }
}

export const localeKeys = ['zh', 'en'] as LocaleKey[]
