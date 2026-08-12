import { resolveThemeOptions } from '../../src/shared/options'
import type {
  NewsOptions,
  ReleaseOptions,
  ResolvedSynctrolThemeOptions,
  SynctrolThemeOptions,
} from '../../src/shared/options'
import type {
  LocaleKey,
  LocaleMarkdown,
  LocaleOptions,
  RouteContentPackage,
} from '../../src/shared/types'

export interface ThemeOptionOverrides {
  siteUrl?: string
  mainLocale?: LocaleKey
  locales?: Record<LocaleKey, LocaleOptions>
  showDrafts?: boolean
  release?: {
    urlSegment?: string
    index?: Partial<ReleaseOptions['index']>
  }
  news?: {
    urlSegment?: string
    index?: Partial<NewsOptions['index']>
    tags?: { urlSegment?: string; index?: { enabled?: boolean } }
  }
}

export function baseLocales(): Record<LocaleKey, LocaleOptions> {
  return {
    zh: { lang: 'zh-CN', label: '中文' },
    en: { lang: 'en-US', label: 'English' },
  }
}

/**
 * Builds real resolved options through Plan 01's resolver, so fixtures inherit
 * the shipped defaults and validation instead of restating them.
 */
export function themeOptions(
  overrides: ThemeOptionOverrides = {},
): ResolvedSynctrolThemeOptions {
  const input = {
    siteUrl: overrides.siteUrl ?? 'https://synctrol.com',
    mainLocale: overrides.mainLocale ?? 'zh',
    locales: overrides.locales ?? baseLocales(),
    showDrafts: overrides.showDrafts ?? false,
    topbarText: '© Synctrol',
    seo: {
      name: 'Synctrol',
      description: 'Synctrol releases and news',
      defaultImage: '/images/og.png',
      organization: { name: 'Synctrol', logo: '/images/logo.png' },
      collections: {
        release: { title: 'Releases', description: 'All releases' },
        news: { title: 'News', description: 'All news' },
      },
    },
    ...(overrides.release === undefined ? {} : { release: overrides.release }),
    ...(overrides.news === undefined ? {} : { news: overrides.news }),
  } as SynctrolThemeOptions

  return resolveThemeOptions(input)
}

export function localeMarkdown(
  overrides: Partial<LocaleMarkdown> & Pick<LocaleMarkdown, 'title'>,
): LocaleMarkdown {
  const markdown: LocaleMarkdown = {
    filePath: overrides.filePath ?? '/content/example/zh.md',
    title: overrides.title,
    draft: overrides.draft ?? false,
    body: overrides.body ?? 'Body',
  }
  if (overrides.description !== undefined) {
    markdown.description = overrides.description
  }
  return markdown
}

function withIdentity(
  routePackage: RouteContentPackage,
  overrides: Partial<RouteContentPackage>,
): RouteContentPackage {
  if (overrides.identity !== undefined || routePackage.slug === null) {
    return routePackage
  }
  return { ...routePackage, identity: `${routePackage.type}:${routePackage.slug}` }
}

export function releasePackage(
  overrides: Partial<RouteContentPackage> = {},
): RouteContentPackage {
  const defaults: RouteContentPackage = {
    dir: '/content/releases/first-release',
    identity: 'release:first-release',
    type: 'release',
    slug: 'first-release',
    date: '2026-08-11',
    draft: false,
    tags: [],
    locales: {
      zh: localeMarkdown({ title: '第一张专辑', filePath: 'zh.md' }),
      en: localeMarkdown({ title: 'First Album', filePath: 'en.md' }),
    },
  }
  return withIdentity({ ...defaults, ...overrides }, overrides)
}

export function newsPackage(
  overrides: Partial<RouteContentPackage> = {},
): RouteContentPackage {
  const defaults: RouteContentPackage = {
    dir: '/content/news/launch',
    identity: 'news:launch',
    type: 'news',
    slug: 'launch',
    date: '2026-08-10',
    draft: false,
    tags: ['release'],
    locales: {
      zh: localeMarkdown({ title: '发布', filePath: 'zh.md' }),
      en: localeMarkdown({ title: 'Launch', filePath: 'en.md' }),
    },
  }
  return withIdentity({ ...defaults, ...overrides }, overrides)
}

export function pagePackage(
  overrides: Partial<RouteContentPackage> = {},
): RouteContentPackage {
  const defaults: RouteContentPackage = {
    dir: '/content/pages/about',
    identity: 'page:about',
    type: 'page',
    slug: 'about',
    draft: false,
    tags: [],
    locales: {
      zh: localeMarkdown({ title: '关于', filePath: 'zh.md' }),
      en: localeMarkdown({ title: 'About', filePath: 'en.md' }),
    },
  }
  return withIdentity({ ...defaults, ...overrides }, overrides)
}

export function homePackage(
  overrides: Partial<RouteContentPackage> = {},
): RouteContentPackage {
  const defaults: RouteContentPackage = {
    dir: '/content/home',
    identity: 'home',
    type: 'home',
    slug: null,
    draft: false,
    tags: [],
    locales: {
      zh: localeMarkdown({ title: '首页', description: '主页 SEO', filePath: 'zh.md' }),
      en: localeMarkdown({ title: 'Home', description: 'Home SEO', filePath: 'en.md' }),
    },
  }
  return { ...defaults, ...overrides }
}
