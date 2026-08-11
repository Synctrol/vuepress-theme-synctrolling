import { describe, expect, it } from 'vitest'
import { resolveThemeOptions } from '../../src/shared/options'
import { enMessages, zhMessages } from '../../src/shared/messages'

describe('resolveThemeOptions', () => {
  const base = {
    siteUrl: 'https://synctrol.com',
    mainLocale: 'zh',
    copyright: 'SYNCTROL © 2026',
    locales: {
      zh: { lang: 'zh-CN', label: '中文' },
      en: { lang: 'en-US', label: 'English' },
    },
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
  }

  it('fills collection, feed, color-mode, and platform defaults', () => {
    const options = resolveThemeOptions(base)
    expect(options.defaultColorMode).toBe('auto')
    expect(options.feeds).toEqual({ rss: true, sitemap: true })
    expect(options.release).toEqual({
      urlSegment: 'releases',
      index: {
        enabled: true,
        pagination: 12,
        mobileGridColumns: 2,
        desktopGridColumns: 3,
      },
    })
    expect(options.news).toEqual({
      urlSegment: 'news',
      index: {
        enabled: true,
        pagination: 12,
      },
      tags: {
        urlSegment: 'tags',
        index: { enabled: true },
      },
    })
    expect(options.platforms).toEqual({
      loadStrategy: 'interaction',
      types: {},
    })
    expect(options.navigation).toEqual({
      externalTarget: '_blank',
      items: [],
    })
    expect(options.socialLinks).toEqual({ items: [] })
  })

  it('merges locale message overrides onto zh/en defaults', () => {
    const options = resolveThemeOptions({
      ...base,
      locales: {
        zh: {
          lang: 'zh-CN',
          label: '中文',
          messages: { draft: '未发布' },
        },
        en: {
          lang: 'en-US',
          label: 'English',
        },
      },
    })
    expect(options.locales.zh.messages.draft).toBe('未发布')
    expect(options.locales.zh.messages.emptyNews).toBe(zhMessages.emptyNews)
    expect(options.locales.en.messages).toEqual(enMessages)
    expect(options.locales.zh.dateFormat).toEqual({ dateStyle: 'long' })
  })

  it('rejects invalid release grid columns and url segments', () => {
    expect(() =>
      resolveThemeOptions({
        ...base,
        release: {
          urlSegment: 'releases/extra',
          index: {
            enabled: true,
            pagination: 12,
            mobileGridColumns: 2,
            desktopGridColumns: 3,
          },
        },
      }),
    ).toThrow(/urlSegment/)

    expect(() =>
      resolveThemeOptions({
        ...base,
        release: {
          urlSegment: 'releases',
          index: {
            enabled: true,
            pagination: 12,
            mobileGridColumns: 4,
            desktopGridColumns: 3,
          },
        },
      }),
    ).toThrow(/mobileGridColumns/)
  })

  it.each([
    ['mobileGridColumns', 1.5, 3],
    ['desktopGridColumns', 2, 3.5],
  ] as const)(
    'rejects non-integer %s',
    (field, mobileGridColumns, desktopGridColumns) => {
      expect(() =>
        resolveThemeOptions({
          ...base,
          release: {
            urlSegment: 'releases',
            index: {
              enabled: true,
              pagination: 12,
              mobileGridColumns,
              desktopGridColumns,
            },
          },
        }),
      ).toThrow(new RegExp(field))
    },
  )

  it.each([0, 1.5])('rejects invalid pagination value %s', (pagination) => {
    expect(() =>
      resolveThemeOptions({
        ...base,
        news: {
          urlSegment: 'news',
          index: { enabled: true, pagination },
          tags: {
            urlSegment: 'tags',
            index: { enabled: true },
          },
        },
      }),
    ).toThrow(/pagination/)
  })

  it('requires complete messages for non-default locales', () => {
    expect(() =>
      resolveThemeOptions({
        ...base,
        locales: {
          ...base.locales,
          ja: {
            lang: 'ja-JP',
            label: '日本語',
            messages: { draft: '下書き' },
          },
        },
      }),
    ).toThrow(/messages/)
  })

  it('does not mutate the input object', () => {
    const input = {
      ...base,
      locales: {
        zh: { lang: 'zh-CN', label: '中文' },
        en: { lang: 'en-US', label: 'English' },
      },
    }
    const snapshot = JSON.parse(JSON.stringify(input))
    resolveThemeOptions(input)
    expect(input).toEqual(snapshot)
  })
})
