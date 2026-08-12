import type { CompiledPage } from '../../src/shared/route-types'
import type { ContentDefinitions, RouteContentPackage } from '../../src/shared/types'

export { newsPackage, pagePackage, homePackage, themeOptions } from './route-fixtures'

export const newsDefinitions: ContentDefinitions = {
  tags: {
    release: { title: { zh: '作品发布', en: 'Releases' } },
    tour: { title: { zh: '巡演', en: 'Tour' } },
  },
  platforms: {},
}

export function newsDetailPage(
  pkg: RouteContentPackage,
  locale: string,
  overrides: Partial<CompiledPage> = {},
): CompiledPage {
  const bodyLocale = overrides.bodyLocale ?? (overrides.isFallback ? 'zh' : locale)
  const body = pkg.locales[bodyLocale]!
  return {
    identity: `news:${pkg.slug}`,
    locale,
    contentType: 'news',
    url: {
      routePath: `/${locale}/news/${pkg.slug}/`,
      outputPath: `${locale}/news/${pkg.slug}/index.html`,
      publicPath: `/base/${locale}/news/${pkg.slug}/`,
      absoluteUrl: `https://synctrol.com/base/${locale}/news/${pkg.slug}/`,
    },
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale,
    canonicalLocale: bodyLocale,
    packagePath: pkg.dir,
    slug: pkg.slug,
    title: body.title,
    description: body.description,
    ...overrides,
  }
}

export function tagArchivePage(tag: string, locale = 'en'): CompiledPage {
  return {
    identity: `news-tag:${tag}`,
    locale,
    contentType: 'news-collection',
    url: {
      routePath: `/${locale}/news/tags/${tag}/`,
      outputPath: `${locale}/news/tags/${tag}/index.html`,
      publicPath: `/base/${locale}/news/tags/${tag}/`,
      absoluteUrl: `https://synctrol.com/base/${locale}/news/tags/${tag}/`,
    },
    isFallback: false,
    isDraft: false,
    noindex: false,
    bodyLocale: locale,
    canonicalLocale: locale,
    title: `news-tag:${tag}`,
    collection: { page: 1, pageCount: 1, itemIdentities: [], tag },
  }
}
