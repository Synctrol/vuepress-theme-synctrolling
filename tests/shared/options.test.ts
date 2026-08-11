import { describe, expect, it } from 'vitest'
import { resolveThemeOptions } from '../../src/shared/options'
import { enMessages, zhMessages } from '../../src/shared/messages'
import type { SynctrolThemeOptions } from '../../src/shared/options'

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

  const resolveRuntimeOptions = (input: unknown) =>
    resolveThemeOptions(input as SynctrolThemeOptions)

  const multilanguageLocations = [
    ['options.copyright', ['copyright']],
    ['options.navigation.items[0].label', ['navigation', 'items', 0, 'label']],
    ['options.navigation.items[0].href', ['navigation', 'items', 0, 'href']],
    ['options.socialLinks.items[0].label', ['socialLinks', 'items', 0, 'label']],
    ['options.seo.name', ['seo', 'name']],
    ['options.seo.description', ['seo', 'description']],
    [
      'options.seo.collections.release.title',
      ['seo', 'collections', 'release', 'title'],
    ],
    [
      'options.seo.collections.release.description',
      ['seo', 'collections', 'release', 'description'],
    ],
    [
      'options.seo.collections.news.title',
      ['seo', 'collections', 'news', 'title'],
    ],
    [
      'options.seo.collections.news.description',
      ['seo', 'collections', 'news', 'description'],
    ],
  ] as const

  const inputWithMultilanguageValue = (
    path: readonly (string | number)[],
    value: unknown,
  ): unknown => {
    const input = structuredClone({
      ...base,
      navigation: {
        externalTarget: '_blank',
        items: [{ label: 'About', href: '/about' }],
      },
      socialLinks: {
        items: [{ label: 'GitHub', icon: 'github', url: 'https://github.com' }],
      },
    }) as Record<string | number, unknown>
    let container = input

    for (const segment of path.slice(0, -1)) {
      container = container[segment] as Record<string | number, unknown>
    }
    container[path.at(-1)!] = value
    return input
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

  it('requires own, safe locale keys and creates a safe locale dictionary', () => {
    expect(() =>
      resolveRuntimeOptions({
        ...base,
        mainLocale: 'toString',
      }),
    ).toThrow(/mainLocale.*not configured/)

    const pollutedLocales = JSON.parse(`{
      "zh": { "lang": "zh-CN", "label": "中文" },
      "__proto__": { "lang": "en-US", "label": "Unsafe" }
    }`) as unknown

    expect(() =>
      resolveRuntimeOptions({
        ...base,
        locales: pollutedLocales,
      }),
    ).toThrow(/locales\.__proto__/)

    expect(() =>
      resolveRuntimeOptions({
        ...base,
        mainLocale: 'constructor',
      }),
    ).toThrow(/mainLocale.*constructor/)

    const options = resolveThemeOptions(base)
    expect(Object.getPrototypeOf(options.locales)).toBeNull()
    expect({ ...options.locales }).toEqual({
      zh: expect.objectContaining({ lang: 'zh-CN', label: '中文' }),
      en: expect.objectContaining({ lang: 'en-US', label: 'English' }),
    })
  })

  it.each(multilanguageLocations)(
    'requires an own mainLocale string at %s',
    (field, path) => {
      expect(() =>
        resolveRuntimeOptions(
          inputWithMultilanguageValue(path, { en: 'English only' }),
        ),
      ).toThrow(
        `Invalid ${field}.zh: expected an own string for mainLocale "zh"`,
      )
    },
  )

  it('does not accept an inherited mainLocale multilanguage value', () => {
    Object.defineProperty(Object.prototype, 'zh', {
      configurable: true,
      value: 'Inherited Chinese',
    })

    try {
      expect(() =>
        resolveRuntimeOptions({
          ...base,
          copyright: { en: 'English only' },
        }),
      ).toThrow(
        /Invalid options\.copyright\.zh: expected an own string for mainLocale "zh"/,
      )
    } finally {
      Reflect.deleteProperty(Object.prototype, 'zh')
    }
  })

  it('rejects a non-string mainLocale multilanguage value with its full path', () => {
    expect(() =>
      resolveRuntimeOptions({
        ...base,
        copyright: { zh: 42, en: 'English' },
      }),
    ).toThrow(
      /Invalid options\.copyright\.zh: expected an own string for mainLocale "zh"/,
    )
  })

  it('continues sharing scalar multilanguage values across locales', () => {
    expect(
      resolveThemeOptions({
        ...base,
        copyright: 'Shared copyright',
        seo: {
          ...base.seo,
          name: 'Shared name',
          description: 'Shared description',
          collections: {
            release: {
              title: 'Shared release title',
              description: 'Shared release description',
            },
            news: {
              title: 'Shared news title',
              description: 'Shared news description',
            },
          },
        },
      }).copyright,
    ).toBe('Shared copyright')
  })

  it.each([
    ['options', null],
    ['options', []],
    ['options.locales', { ...base, locales: [] }],
    [
      'options.locales.zh',
      { ...base, locales: { ...base.locales, zh: null } },
    ],
    ['options.feeds', { ...base, feeds: [] }],
    ['options.navigation', { ...base, navigation: null }],
    ['options.socialLinks', { ...base, socialLinks: [] }],
    ['options.release', { ...base, release: [] }],
    ['options.release.index', { ...base, release: { index: [] } }],
    ['options.news', { ...base, news: [] }],
    ['options.news.tags', { ...base, news: { tags: [] } }],
    ['options.platforms', { ...base, platforms: [] }],
    [
      'options.platforms.types',
      { ...base, platforms: { types: [] } },
    ],
    ['options.backgrounds', { ...base, backgrounds: [] }],
    ['options.seo', { ...base, seo: [] }],
    [
      'options.seo.organization',
      { ...base, seo: { ...base.seo, organization: [] } },
    ],
    [
      'options.seo.collections',
      { ...base, seo: { ...base.seo, collections: null } },
    ],
  ] as const)('rejects non-plain %s', (field, input) => {
    expect(() => resolveRuntimeOptions(input)).toThrow(
      new RegExp(field.replaceAll('.', '\\.')),
    )
  })

  it.each([
    ['options.contentDir', { ...base, contentDir: 'content' }],
    ['options.routes', { ...base, routes: {} }],
    ['options.routeTemplate', { ...base, routeTemplate: '/:locale/:slug' }],
    ['options.visualTokens', { ...base, visualTokens: {} }],
    ['options.breakpoints', { ...base, breakpoints: {} }],
    [
      'options.socialLinks.iconSize',
      { ...base, socialLinks: { items: [], iconSize: 24 } },
    ],
    [
      'options.release.artworkLoading',
      { ...base, release: { artworkLoading: 'lazy' } },
    ],
    [
      'options.release.routeTemplate',
      { ...base, release: { routeTemplate: '/release/:slug' } },
    ],
    [
      'options.locales.zh.fallback',
      {
        ...base,
        locales: {
          ...base.locales,
          zh: { ...base.locales.zh, fallback: true },
        },
      },
    ],
    [
      'options.release.index.pageSize',
      { ...base, release: { index: { pageSize: 12 } } },
    ],
    [
      'options.news.tags.routes',
      { ...base, news: { tags: { routes: {} } } },
    ],
    [
      'options.platforms.preload',
      { ...base, platforms: { preload: true } },
    ],
    [
      'options.seo.organization.url',
      {
        ...base,
        seo: {
          ...base.seo,
          organization: { ...base.seo.organization, url: base.siteUrl },
        },
      },
    ],
  ] as const)('rejects unsupported field %s', (field, input) => {
    expect(() => resolveRuntimeOptions(input)).toThrow(
      new RegExp(field.replaceAll('.', '\\.')),
    )
  })

  it.each([
    [
      'options.defaultColorMode',
      { ...base, defaultColorMode: 'sepia' },
    ],
    ['options.showDrafts', { ...base, showDrafts: 'false' }],
    ['options.feeds.rss', { ...base, feeds: { rss: 1 } }],
    ['options.feeds.sitemap', { ...base, feeds: { sitemap: 'yes' } }],
    [
      'options.navigation.externalTarget',
      { ...base, navigation: { externalTarget: '_parent' } },
    ],
    ['options.navigation.items', { ...base, navigation: { items: {} } }],
    ['options.socialLinks.items', { ...base, socialLinks: { items: {} } }],
    [
      'options.release.index.enabled',
      { ...base, release: { index: { enabled: 1 } } },
    ],
    [
      'options.news.index.enabled',
      { ...base, news: { index: { enabled: 'yes' } } },
    ],
    [
      'options.news.tags.index.enabled',
      { ...base, news: { tags: { index: { enabled: null } } } },
    ],
    [
      'options.platforms.loadStrategy',
      { ...base, platforms: { loadStrategy: 'immediate' } },
    ],
  ] as const)('rejects invalid enum, boolean, or array at %s', (field, input) => {
    expect(() => resolveRuntimeOptions(input)).toThrow(
      new RegExp(field.replaceAll('.', '\\.')),
    )
  })

  it.each([
    ['options.siteUrl', { ...base, siteUrl: 42 }],
    ['options.siteUrl', { ...base, siteUrl: '   ' }],
    ['options.mainLocale', { ...base, mainLocale: 42 }],
    ['options.mainLocale', { ...base, mainLocale: '' }],
    [
      'options.locales.zh.lang',
      {
        ...base,
        locales: { ...base.locales, zh: { lang: 42, label: '中文' } },
      },
    ],
    [
      'options.locales.zh.label',
      {
        ...base,
        locales: { ...base.locales, zh: { lang: 'zh-CN', label: null } },
      },
    ],
  ] as const)('rejects invalid required string at %s', (field, input) => {
    expect(() => resolveRuntimeOptions(input)).toThrow(
      new RegExp(field.replaceAll('.', '\\.')),
    )
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

  it('ignores undefined built-in message overrides', () => {
    const options = resolveThemeOptions({
      ...base,
      locales: {
        ...base.locales,
        zh: {
          lang: 'zh-CN',
          label: '中文',
          messages: { draft: undefined },
        },
      },
    })

    expect(options.locales.zh.messages.draft).toBe(zhMessages.draft)
    expect(Object.keys(options.locales.zh.messages)).toHaveLength(31)
    expect(
      Object.values(options.locales.zh.messages).every(
        (message) => typeof message === 'string',
      ),
    ).toBe(true)
  })

  it('rejects non-string built-in message overrides', () => {
    expect(() =>
      resolveThemeOptions({
        ...base,
        locales: {
          ...base.locales,
          zh: {
            lang: 'zh-CN',
            label: '中文',
            messages: {
              draft: 42 as unknown as string,
            },
          },
        },
      }),
    ).toThrow(/messages.*draft/)
  })

  it('defaults missing release and news nesting in runtime config', () => {
    const options = resolveThemeOptions({
      ...base,
      release: { urlSegment: 'catalog' },
      news: { urlSegment: 'updates' },
    } as unknown as SynctrolThemeOptions)

    expect(options.release).toMatchObject({
      urlSegment: 'catalog',
      index: {
        enabled: true,
        pagination: 12,
        mobileGridColumns: 2,
        desktopGridColumns: 3,
      },
    })
    expect(options.news).toEqual({
      urlSegment: 'updates',
      index: { enabled: true, pagination: 12 },
      tags: {
        urlSegment: 'tags',
        index: { enabled: true },
      },
    })
  })

  it('defaults missing news tag index in runtime config', () => {
    const options = resolveThemeOptions({
      ...base,
      news: {
        urlSegment: 'updates',
        tags: { urlSegment: 'topics' },
      },
    } as unknown as SynctrolThemeOptions)

    expect(options.news.tags).toEqual({
      urlSegment: 'topics',
      index: { enabled: true },
    })
  })

  it.each([42, null])(
    'rejects non-string url segment %s with a theme error',
    (urlSegment) => {
      expect(() =>
        resolveThemeOptions({
          ...base,
          release: {
            urlSegment: urlSegment as unknown as string,
            index: {
              enabled: true,
              pagination: 12,
              mobileGridColumns: 2,
              desktopGridColumns: 3,
            },
          },
        }),
      ).toThrow(/release\.urlSegment/)
    },
  )

  it('rejects leading or trailing whitespace without rewriting valid segments', () => {
    expect(() =>
      resolveThemeOptions({
        ...base,
        release: {
          urlSegment: ' releases',
          index: {
            enabled: true,
            pagination: 12,
            mobileGridColumns: 2,
            desktopGridColumns: 3,
          },
        },
      }),
    ).toThrow(/release\.urlSegment/)

    expect(() =>
      resolveThemeOptions({
        ...base,
        release: {
          urlSegment: 'releases ',
          index: {
            enabled: true,
            pagination: 12,
            mobileGridColumns: 2,
            desktopGridColumns: 3,
          },
        },
      }),
    ).toThrow(/release\.urlSegment/)

    const options = resolveThemeOptions({
      ...base,
      release: {
        urlSegment: 'Releases-2026',
        index: {
          enabled: true,
          pagination: 12,
          mobileGridColumns: 2,
          desktopGridColumns: 3,
        },
      },
    })
    expect(options.release.urlSegment).toBe('Releases-2026')
  })

  it.each([
    ['release', 'releases\\archive'],
    ['release', 'releases%2Farchive'],
    ['release', 'releases%5carchive'],
    ['release', 'releases\narchive'],
    ['news', 'news\\archive'],
    ['news', 'news%2farchive'],
    ['news', 'news\u0000archive'],
    ['tags', 'tags\\archive'],
    ['tags', 'tags%5Carchive'],
    ['tags', 'tags\u001farchive'],
  ] as const)('rejects unsafe %s url segment %j', (field, urlSegment) => {
    const collectionOptions =
      field === 'release'
        ? { release: { urlSegment } }
        : {
            news:
              field === 'news'
                ? { urlSegment }
                : { tags: { urlSegment } },
          }

    expect(() =>
      resolveThemeOptions({
        ...base,
        ...collectionOptions,
      } as unknown as SynctrolThemeOptions),
    ).toThrow(new RegExp(`${field === 'tags' ? 'tags' : field}.*urlSegment`))
  })

  it('removes all trailing slashes from siteUrl', () => {
    const options = resolveThemeOptions({
      ...base,
      siteUrl: 'https://synctrol.com///',
    })

    expect(options.siteUrl).toBe('https://synctrol.com')
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
