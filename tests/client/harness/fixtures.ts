import type { ResolvedSynctrolThemeOptions } from '../../../src/shared/options'
import { resolveThemeOptions } from '../../../src/shared/options'

export function fixtureThemeOptions(
  overrides: Partial<Parameters<typeof resolveThemeOptions>[0]> = {},
): ResolvedSynctrolThemeOptions {
  return resolveThemeOptions({
    siteUrl: 'https://synctrol.com',
    mainLocale: 'zh',
    copyright: { zh: '© 2026 Synctrol', en: '© 2026 Synctrol' },
    defaultColorMode: 'auto',
    locales: {
      zh: { lang: 'zh-CN', label: '中文' },
      en: { lang: 'en-US', label: 'English' },
    },
    navigation: {
      externalTarget: '_blank',
      items: [
        {
          label: { zh: '作品', en: 'Releases' },
          href: '/releases/',
        },
        {
          label: 'GitHub',
          href: 'https://github.com/synctrol',
        },
      ],
    },
    socialLinks: {
      items: [
        {
          label: 'GitHub',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
          url: 'https://github.com/synctrol',
        },
      ],
    },
    seo: {
      name: 'Synctrol',
      description: {
        zh: 'Synctrol 音乐团队官方网站',
        en: 'Official website of the Synctrol music team',
      },
      defaultImage: './assets/social-default.webp',
      organization: { name: 'Synctrol', logo: './assets/logo.svg' },
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
    ...overrides,
  })
}
