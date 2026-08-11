import { describe, expect, it } from 'vitest'
import { synctrolTheme } from '../src/index'

describe('package smoke', () => {
  it('creates a named theme from resolved options', () => {
    const theme = synctrolTheme({
      siteUrl: 'https://synctrol.com',
      mainLocale: 'zh',
      copyright: 'SYNCTROL © 2026',
      locales: {
        zh: { lang: 'zh-CN', label: '中文' },
        en: { lang: 'en-US', label: 'English' },
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
    })
    expect(theme.name).toBe('vuepress-theme-synctrolling')
    expect(theme.define.__SYNCTROL_THEME_OPTIONS__).toMatchObject({
      siteUrl: 'https://synctrol.com',
      defaultColorMode: 'auto',
      showDrafts: false,
    })
  })
})
