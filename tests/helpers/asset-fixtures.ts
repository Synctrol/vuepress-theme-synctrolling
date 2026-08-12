import type { ContentType } from '../../src/shared/types'
import type { SynctrolThemeOptions } from '../../src/shared/options'
import { resolveThemeOptions } from '../../src/shared/options'
import type { AssetPackageSource } from '../../src/shared/asset-types'

/** Convenience re-exports for Plan 04 asset integration / helper wiring tests. */
export { collectPackageDeclaredPaths } from '../../src/compiler/assets/collect-package-refs'
export { compileAssets } from '../../src/compiler/assets/compile-assets'
export { toAssetPackageSource } from '../../src/compiler/assets/to-asset-package-source'
export { createResolveContentAsset } from '../../src/client/assets/resolve-content-asset'

export function themeOptions(
  overrides: Partial<SynctrolThemeOptions> = {},
) {
  return resolveThemeOptions({
    siteUrl: 'https://synctrol.com',
    mainLocale: 'zh',
    locales: {
      zh: { lang: 'zh-CN', label: '中文' },
      en: { lang: 'en-US', label: 'English' },
    },
    topbarText: '© Synctrol',
    seo: {
      name: { zh: 'Synctrol', en: 'Synctrol' },
      description: {
        zh: 'Synctrol 音乐团队官方网站',
        en: 'Official website of the Synctrol music team',
      },
      defaultImage: './assets/social-default.webp',
      organization: {
        name: 'Synctrol',
        logo: './assets/logo.svg',
      },
      collections: {
        release: {
          title: { zh: '作品', en: 'Releases' },
          description: { zh: 'Synctrol 作品列表', en: 'Synctrol releases' },
        },
        news: {
          title: { zh: '新闻', en: 'News' },
          description: { zh: 'Synctrol 新闻', en: 'Synctrol news' },
        },
      },
    },
    socialLinks: {
      items: [
        {
          label: { zh: 'GitHub', en: 'GitHub' },
          icon: './assets/github.svg',
          url: 'https://github.com/synctrol',
        },
      ],
    },
    release: {
      urlSegment: 'releases',
      index: {
        enabled: true,
        pagination: 12,
        mobileGridColumns: 2,
        desktopGridColumns: 3,
      },
      artworkPlaceholder: './assets/artwork-placeholder.svg',
    },
    ...overrides,
  })
}

export function packageSource(
  partial: Partial<AssetPackageSource> &
    Pick<AssetPackageSource, 'packageDir' | 'type'>,
): AssetPackageSource {
  return {
    slug: partial.type === 'home' ? null : (partial.slug ?? 'sample'),
    declaredPaths: [],
    localeMarkdown: [],
    ...partial,
  }
}

export function typedSlug(
  type: Exclude<ContentType, 'home'>,
  slug: string,
): { type: ContentType; slug: string } {
  return { type, slug }
}
