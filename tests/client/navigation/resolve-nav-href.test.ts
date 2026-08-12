import { describe, expect, it } from 'vitest'
import { isExternalHref } from '../../../src/client/navigation/is-external-href'
import { resolveNavHref } from '../../../src/client/navigation/resolve-nav-href'
import { encodePathSegment } from '../../../src/shared/encode-path-segment'

describe('isExternalHref', () => {
  it('detects absolute http(s) URLs', () => {
    expect(isExternalHref('https://github.com/synctrol')).toBe(true)
    expect(isExternalHref('http://example.com')).toBe(true)
    expect(isExternalHref('/releases/')).toBe(false)
  })
})

describe('resolveNavHref', () => {
  it('prefixes base + encoded locale for internal leading-slash paths', () => {
    expect(
      resolveNavHref({
        href: '/releases/',
        locale: 'zh',
        base: '/',
        mainLocale: 'zh',
      }),
    ).toEqual({ href: '/zh/releases/', external: false })

    expect(
      resolveNavHref({
        href: '/releases/',
        locale: 'en',
        base: '/docs/',
        mainLocale: 'zh',
      }),
    ).toEqual({ href: '/docs/en/releases/', external: false })
  })

  it('encodes non-ASCII locale segments (no raw CJK in href)', () => {
    const locale = '日本語'
    const encoded = encodePathSegment(locale)
    expect(
      resolveNavHref({
        href: '/releases/',
        locale,
        base: '/',
        mainLocale: 'zh',
      }),
    ).toEqual({ href: `/${encoded}/releases/`, external: false })
    expect(
      resolveNavHref({
        href: '/releases/',
        locale,
        base: '/',
        mainLocale: 'zh',
      }).href,
    ).not.toContain('日本語')
  })

  it('resolves Multilanguage href maps', () => {
    expect(
      resolveNavHref({
        href: { zh: '/releases/', en: '/works/' },
        locale: 'en',
        base: '/',
        mainLocale: 'zh',
      }),
    ).toEqual({ href: '/en/works/', external: false })
  })

  it('passes through external URLs unchanged', () => {
    expect(
      resolveNavHref({
        href: 'https://github.com/synctrol',
        locale: 'zh',
        base: '/',
        mainLocale: 'zh',
      }),
    ).toEqual({ href: 'https://github.com/synctrol', external: true })
  })

  it('rejects relative ./ and ../ navigation paths', () => {
    expect(() =>
      resolveNavHref({
        href: './releases/',
        locale: 'zh',
        base: '/',
        mainLocale: 'zh',
      }),
    ).toThrow(/\.\//)

    expect(() =>
      resolveNavHref({
        href: '../x/',
        locale: 'zh',
        base: '/',
        mainLocale: 'zh',
      }),
    ).toThrow(/\.\./)
  })
})
