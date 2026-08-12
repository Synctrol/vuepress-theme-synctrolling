import { describe, expect, it } from 'vitest'
import { selectAssetPackageSources } from '../../../src/compiler/assets/select-asset-package-sources'
import type { CompiledPage } from '../../../src/shared/route-types'
import type {
  CompiledContentPackage,
  RouteContentPackage,
} from '../../../src/shared/types'

function url(routePath: string) {
  return {
    routePath,
    outputPath: `${routePath.slice(1)}index.html`,
    publicPath: routePath,
    absoluteUrl: `https://synctrol.com${routePath}`,
  }
}

describe('selectAssetPackageSources', () => {
  it('omits draft packages that do not contribute site pages', () => {
    const publishedCompiled: CompiledContentPackage = {
      dir: '/content/releases/first',
      identity: 'release:first',
      manifest: {
        type: 'release',
        slug: 'first',
        date: '2026-08-11',
        draft: false,
        cover: './assets/cover.webp',
      },
    }
    const draftCompiled: CompiledContentPackage = {
      dir: '/content/releases/secret',
      identity: 'release:secret',
      manifest: {
        type: 'release',
        slug: 'secret',
        date: '2026-08-10',
        draft: true,
        cover: './assets/missing.webp',
      },
    }
    const publishedRouted: RouteContentPackage = {
      dir: '/content/releases/first',
      identity: 'release:first',
      type: 'release',
      slug: 'first',
      date: '2026-08-11',
      draft: false,
      tags: [],
      cover: './assets/cover.webp',
      locales: {
        zh: {
          filePath: '/content/releases/first/zh.md',
          title: 'First',
          draft: false,
          body: 'ok',
        },
      },
    }
    const draftRouted: RouteContentPackage = {
      dir: '/content/releases/secret',
      identity: 'release:secret',
      type: 'release',
      slug: 'secret',
      date: '2026-08-10',
      draft: true,
      tags: [],
      cover: './assets/missing.webp',
      locales: {
        zh: {
          filePath: '/content/releases/secret/zh.md',
          title: 'Secret',
          draft: false,
          body: '<img src="./assets/bad.webp">',
        },
      },
    }
    const pages: CompiledPage[] = [
      {
        identity: 'release:first',
        locale: 'zh',
        contentType: 'release',
        url: url('/zh/releases/first/'),
        isFallback: false,
        isDraft: false,
        noindex: false,
        bodyLocale: 'zh',
        canonicalLocale: 'zh',
        packagePath: '/content/releases/first',
        slug: 'first',
        title: 'First',
      },
    ]

    const sources = selectAssetPackageSources({
      compiledPackages: [publishedCompiled, draftCompiled],
      packages: [publishedRouted, draftRouted],
      pages,
    })

    expect(sources).toHaveLength(1)
    expect(sources[0]?.packageDir).toBe('/content/releases/first')
    expect(sources[0]?.declaredPaths).toEqual(['./assets/cover.webp'])
  })

  it('limits locale Markdown to body locales used by published pages', () => {
    const compiled: CompiledContentPackage = {
      dir: '/content/releases/first',
      identity: 'release:first',
      manifest: {
        type: 'release',
        slug: 'first',
        date: '2026-08-11',
        draft: false,
      },
    }
    const routed: RouteContentPackage = {
      dir: '/content/releases/first',
      identity: 'release:first',
      type: 'release',
      slug: 'first',
      date: '2026-08-11',
      draft: false,
      tags: [],
      locales: {
        zh: {
          filePath: '/content/releases/first/zh.md',
          title: 'First',
          draft: false,
          body: 'zh body',
        },
        en: {
          filePath: '/content/releases/first/en.md',
          title: 'First EN',
          draft: true,
          body: '<img src="./assets/draft-only.webp">',
        },
      },
    }
    const pages: CompiledPage[] = [
      {
        identity: 'release:first',
        locale: 'zh',
        contentType: 'release',
        url: url('/zh/releases/first/'),
        isFallback: false,
        isDraft: false,
        noindex: false,
        bodyLocale: 'zh',
        canonicalLocale: 'zh',
        packagePath: '/content/releases/first',
        slug: 'first',
        title: 'First',
      },
      {
        identity: 'release:first',
        locale: 'en',
        contentType: 'release',
        url: url('/en/releases/first/'),
        isFallback: true,
        isDraft: false,
        noindex: true,
        bodyLocale: 'zh',
        canonicalLocale: 'zh',
        packagePath: '/content/releases/first',
        slug: 'first',
        title: 'First',
      },
    ]

    const sources = selectAssetPackageSources({
      compiledPackages: [compiled],
      packages: [routed],
      pages,
    })

    expect(sources).toHaveLength(1)
    expect(sources[0]?.localeMarkdown).toEqual([
      {
        filePath: '/content/releases/first/zh.md',
        body: 'zh body',
      },
    ])
  })
})
