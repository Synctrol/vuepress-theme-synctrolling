import { describe, expect, it } from 'vitest'
import {
  buildRootRouterScript,
  generateRootRouterHtml,
  LOCALE_STORAGE_KEY,
} from '../../src/compiler/root-router-html'
import {
  matchBrowserLocale,
  toLocaleTable,
} from '../../src/shared/match-browser-locale'
import { encodeRouteSegment } from '../../src/compiler/path-suffix'
import { enMessages } from '../../src/shared/messages'
import { joinPublicPath } from '../../src/shared/route-path'
import { baseLocales, themeOptions } from '../helpers/route-fixtures'

interface RunOptions {
  base?: string
  stored?: string | null
  languages?: string[]
  throwOnStorage?: boolean
  locales?: ReturnType<typeof toLocaleTable>
  mainLocale?: string
  homes?: Record<string, string>
}

function runScript(options: RunOptions = {}): string {
  const locales = options.locales ?? toLocaleTable(baseLocales())
  const base = options.base ?? '/'
  const homes =
    options.homes ??
    Object.fromEntries(
      locales.map((entry) => [
        entry.key,
        joinPublicPath(base, `/${encodeRouteSegment(entry.key, 'locale')}/`),
      ]),
    )
  const config = {
    mainLocale: options.mainLocale ?? 'zh',
    base,
    locales,
    homes,
  }
  const replaced: string[] = []
  const sandbox = {
    window: { __SYNCTROL_ROOT_ROUTER__: config },
    location: { replace: (target: string) => replaced.push(target) },
    navigator: { languages: options.languages ?? [], language: '' },
    localStorage: {
      getItem: (key: string) => {
        if (options.throwOnStorage === true) throw new Error('blocked')
        return key === LOCALE_STORAGE_KEY ? (options.stored ?? null) : null
      },
    },
  }

  const run = new Function(
    'window',
    'location',
    'navigator',
    'localStorage',
    buildRootRouterScript(),
  )
  run(sandbox.window, sandbox.location, sandbox.navigator, sandbox.localStorage)

  return replaced[0] ?? ''
}

describe('buildRootRouterScript', () => {
  it('uses a stored locale when it is a configured key', () => {
    expect(runScript({ stored: 'en', languages: ['zh-CN'] })).toBe('/en/')
  })

  it('ignores a stored value that is not a configured key', () => {
    expect(runScript({ stored: '../evil', languages: ['en-US'] })).toBe('/en/')
  })

  it('survives a throwing localStorage', () => {
    expect(runScript({ throwOnStorage: true, languages: ['en'] })).toBe('/en/')
  })

  it('falls back to mainLocale with no preferences', () => {
    expect(runScript({})).toBe('/zh/')
  })

  it('includes a non-root base in the redirect target', () => {
    expect(runScript({ base: '/docs/', stored: 'en' })).toBe('/docs/en/')
  })

  it('agrees with the shared matcher for every preference list', () => {
    const table = toLocaleTable(baseLocales())
    for (const languages of [
      ['en-GB'],
      ['zh-TW'],
      ['fr', 'en'],
      ['de'],
      ['EN'],
      ['zh_CN'],
    ]) {
      expect(runScript({ languages })).toBe(
        `/${matchBrowserLocale(languages, table, 'zh')}/`,
      )
    }
  })

  it('redirects a non-ASCII locale key to its encoded publicPath', () => {
    const locales = toLocaleTable({
      日本語: { lang: 'ja' },
      en: { lang: 'en-US' },
    })
    const encoded = encodeRouteSegment('日本語', 'locale')

    expect(
      runScript({
        locales,
        mainLocale: '日本語',
        stored: '日本語',
      }),
    ).toBe(`/${encoded}/`)

    expect(
      runScript({
        locales,
        mainLocale: '日本語',
        languages: ['ja'],
        base: '/docs/',
      }),
    ).toBe(`/docs/${encoded}/`)
  })
})

describe('generateRootRouterHtml', () => {
  const options = themeOptions()

  it('emits visible language links and an inline redirect script', () => {
    const html = generateRootRouterHtml({ options, base: '/' })

    expect(html).toContain('href="/zh/"')
    expect(html).toContain('>中文</a>')
    expect(html).toContain('href="/en/"')
    expect(html).toContain('>English</a>')
    expect(html).toContain('location.replace')
    expect(html).toContain(LOCALE_STORAGE_KEY)
    expect(html).toContain('<html lang="zh-CN">')
  })

  it('loads no external script and no background module', () => {
    const html = generateRootRouterHtml({ options, base: '/' })

    expect(html).not.toMatch(/<script[^>]+src=/)
    expect(html).not.toMatch(/<link[^>]+rel="?modulepreload/)
  })

  it('prefixes language hrefs with the VuePress base', () => {
    const html = generateRootRouterHtml({ options, base: '/docs/' })

    expect(html).toContain('href="/docs/zh/"')
    expect(html).toContain('href="/docs/en/"')
    expect(html).toContain('"base":"/docs/"')
  })

  it('emits encoded hrefs and homes for a non-ASCII locale key', () => {
    // Plan 01 requires complete messages for non-zh/en locales (same as Tasks 7–8).
    const html = generateRootRouterHtml({
      options: themeOptions({
        mainLocale: '日本語',
        locales: {
          日本語: { lang: 'ja', label: '日本語', messages: { ...enMessages } },
          en: { lang: 'en-US', label: 'English' },
        },
      }),
      base: '/docs/',
    })
    const encoded = encodeRouteSegment('日本語', 'locale')

    expect(html).toContain(`href="/docs/${encoded}/"`)
    expect(html).not.toContain('href="/docs/日本語/"')
    expect(html).toContain(`"homes"`)
    // homes values are encoded publicPaths after base join (base=/docs/)
    expect(html).toContain(`"/docs/${encoded}/"`)
  })

  it('embeds locale key and lang metadata for negotiation', () => {
    const html = generateRootRouterHtml({ options, base: '/' })

    expect(html).toContain('"key":"zh"')
    expect(html).toContain('"lang":"zh-CN"')
    expect(html).toContain('"key":"en"')
    expect(html).toContain('"lang":"en-US"')
    expect(html).toContain('"mainLocale":"zh"')
  })

  it('escapes hostile locale metadata so it cannot terminate the script', () => {
    const html = generateRootRouterHtml({
      options: themeOptions({
        locales: {
          zh: { lang: 'zh-CN', label: '中文' },
          en: {
            lang: 'en-US</script><script>alert(1)</script>',
            label: '<img src=x onerror=alert(1)>',
          },
        },
      }),
      base: '/',
    })

    expect(html).not.toContain('</script><script>alert(1)')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('\\u003c/script\\u003e')
    expect(html).toContain('&lt;img src=x')
  })

  it('escapes ampersands and the U+2028/U+2029 line terminators in the inline JSON', () => {
    const html = generateRootRouterHtml({
      options: themeOptions({
        locales: {
          zh: { lang: 'zh-CN', label: '中文' },
          en: { lang: 'en-US&x\u2028y\u2029z', label: 'English' },
        },
      }),
      base: '/',
    })

    const config = html.slice(
      html.indexOf('__SYNCTROL_ROOT_ROUTER__'),
      html.indexOf('</script>'),
    )
    expect(config).toContain('\\u0026')
    expect(config).toContain('\\u2028')
    expect(config).toContain('\\u2029')
    expect(config).not.toContain('\u2028')
    expect(config).not.toContain('\u2029')
  })

  it('keeps the serialized config parseable back to the original values', () => {
    const hostile = 'en-US</script>&\u2028<b>'
    const html = generateRootRouterHtml({
      options: themeOptions({
        locales: {
          zh: { lang: 'zh-CN', label: '中文' },
          en: { lang: hostile, label: 'English' },
        },
      }),
      base: '/',
    })

    const start = html.indexOf('{', html.indexOf('__SYNCTROL_ROOT_ROUTER__'))
    const end = html.indexOf('};</script>', start)
    const parsed = JSON.parse(html.slice(start, end + 1)) as {
      locales: { key: string; lang: string }[]
    }

    expect(parsed.locales.find((entry) => entry.key === 'en')?.lang).toBe(hostile)
  })
})
