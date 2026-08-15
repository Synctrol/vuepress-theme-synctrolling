import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import {
  assertRoutableSegment,
  encodePathSegment,
  encodeRouteSegment,
  resolveDetailPathSuffix,
} from '../../src/compiler/path-suffix'
import {
  homePackage,
  newsPackage,
  pagePackage,
  releasePackage,
  themeOptions,
} from '../helpers/route-fixtures'

function expectCode(action: () => unknown, code: string): void {
  try {
    action()
  } catch (error) {
    if (!isDiagnosticError(error)) throw error
    expect(error.diagnostics[0]?.code).toBe(code)
    return
  }
  throw new Error(`Expected ${code} diagnostic`)
}

describe('encodePathSegment', () => {
  it('percent-encodes a value as a single path segment', () => {
    expect(encodePathSegment('作品发布')).toBe(encodeURIComponent('作品发布'))
    expect(encodePathSegment('a/b')).toBe('a%2Fb')
  })

  it('encodes the five characters encodeURIComponent leaves unescaped', () => {
    expect(encodePathSegment('!')).toBe('%21')
    expect(encodePathSegment("'")).toBe('%27')
    expect(encodePathSegment('(')).toBe('%28')
    expect(encodePathSegment(')')).toBe('%29')
    expect(encodePathSegment('*')).toBe('%2A')
    expect(encodePathSegment("a!'()*b")).toBe('a%21%27%28%29%2Ab')
  })

  it('leaves RFC 3986 unreserved characters alone', () => {
    for (const value of ['a', 'Z', '0', '9', '-', '.', '_', '~']) {
      expect(encodePathSegment(value)).toBe(value)
    }
    expect(encodePathSegment('A-B_c.d~e9')).toBe('A-B_c.d~e9')
  })

  it('encodes reserved, space, and non-ASCII characters', () => {
    expect(encodePathSegment(' ')).toBe('%20')
    expect(encodePathSegment('#')).toBe('%23')
    expect(encodePathSegment('?')).toBe('%3F')
    expect(encodePathSegment('&')).toBe('%26')
    expect(encodePathSegment('=')).toBe('%3D')
    expect(encodePathSegment('+')).toBe('%2B')
    expect(encodePathSegment('%')).toBe('%25')
    expect(encodePathSegment('作')).toBe('%E4%BD%9C')
    expect(encodePathSegment('é')).toBe('%C3%A9')
  })

  it('uses uppercase hexadecimal for every escape', () => {
    const encoded = encodePathSegment("!'()*作é 空")
    const escapes = encoded.match(/%../g) ?? []

    expect(escapes.length).toBeGreaterThan(0)
    for (const escape of escapes) {
      expect(escape).toBe(escape.toUpperCase())
    }
  })
})

describe('assertRoutableSegment', () => {
  it('accepts unreserved, space, and non-ASCII segments', () => {
    for (const value of [
      'first-release',
      'A-B_c.d~e',
      'a b',
      '作品发布',
      'café',
      'ünïcode',
      'x_y',
    ]) {
      expect(assertRoutableSegment(value, 'slug')).toBe(value)
    }
  })

  it('rejects every character where strict encoding and VuePress disagree', () => {
    for (const char of [
      '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',',
      ':', ';', '<', '=', '>', '?', '@', '[', ']', '^', '`', '{', '|', '}',
      '\u0000', '\u001f', '\u007f',
    ]) {
      expectCode(
        () => assertRoutableSegment(`a${char}b`, 'slug'),
        'UNROUTABLE_SEGMENT',
      )
    }
  })

  it('rejects a leading underscore because VuePress strips it', () => {
    expectCode(() => assertRoutableSegment('_lead', 'slug'), 'UNROUTABLE_SEGMENT')
    expectCode(() => assertRoutableSegment('__lead', 'slug'), 'UNROUTABLE_SEGMENT')
    expect(assertRoutableSegment('lead_', 'slug')).toBe('lead_')
  })
})

describe('encodeRouteSegment', () => {
  it('gates then encodes', () => {
    expect(encodeRouteSegment('作品', 'slug')).toBe('%E4%BD%9C%E5%93%81')
    expect(encodeRouteSegment('日本語', 'locale')).toBe(
      '%E6%97%A5%E6%9C%AC%E8%AA%9E',
    )
    expectCode(() => encodeRouteSegment('a(b)', 'slug'), 'UNROUTABLE_SEGMENT')
  })

  it('rejects urlSegment values Plan 01 accepts but VuePress would rewrite', () => {
    // assertRouteSegment allows '*'; assertRoutableSegment does not.
    expectCode(
      () => encodeRouteSegment('x*y', 'options.release.urlSegment'),
      'UNROUTABLE_SEGMENT',
    )
    expectCode(
      () => encodeRouteSegment("a!'()*b", 'options.news.urlSegment'),
      'UNROUTABLE_SEGMENT',
    )
  })
})

describe('resolveDetailPathSuffix', () => {
  const options = themeOptions()

  it('uses the type default for release, news, page, and home', () => {
    expect(resolveDetailPathSuffix(releasePackage(), 'zh', options)).toBe(
      '/releases/first-release/',
    )
    expect(resolveDetailPathSuffix(newsPackage(), 'en', options)).toBe(
      '/article/launch/',
    )
    expect(resolveDetailPathSuffix(pagePackage(), 'zh', options)).toBe('/about/')
    expect(resolveDetailPathSuffix(homePackage(), 'zh', options)).toBe('/')
  })

  it('uses configured urlSegment values shared by every locale', () => {
    const custom = themeOptions({
      release: { urlSegment: 'works' },
      news: { articleUrlSegment: 'journal' },
    })

    expect(resolveDetailPathSuffix(releasePackage(), 'en', custom)).toBe(
      '/works/first-release/',
    )
    expect(resolveDetailPathSuffix(newsPackage(), 'zh', custom)).toBe(
      '/journal/launch/',
    )
  })

  it('applies a scalar path to every locale without inspecting locale-like segments', () => {
    const pkg = releasePackage({ path: '/zh/test/' })

    expect(resolveDetailPathSuffix(pkg, 'zh', options)).toBe('/zh/test/')
    expect(resolveDetailPathSuffix(pkg, 'en', options)).toBe('/zh/test/')
  })

  it('uses only the explicitly configured locale entry of a path map', () => {
    const pkg = releasePackage({
      path: { zh: '/custom/zh-only/', en: '/custom/en-only/' },
    })

    expect(resolveDetailPathSuffix(pkg, 'zh', options)).toBe('/custom/zh-only/')
    expect(resolveDetailPathSuffix(pkg, 'en', options)).toBe('/custom/en-only/')
  })

  it('falls back to the type default when a locale is missing from the path map', () => {
    expect(
      resolveDetailPathSuffix(releasePackage({ path: { zh: '/only-zh/' } }), 'en', options),
    ).toBe('/releases/first-release/')
  })

  it('ignores inherited path-map keys', () => {
    const pkg = releasePackage({ path: { zh: '/only-zh/' } })
    expect(resolveDetailPathSuffix(pkg, 'toString', options)).toBe(
      '/releases/first-release/',
    )
  })

  it('allows ordinary repeated names such as /zh/zh/test/', () => {
    expect(
      resolveDetailPathSuffix(releasePackage({ path: '/zh/zh/test/' }), 'zh', options),
    ).toBe('/zh/zh/test/')
  })

  it('rejects malformed page-specific paths', () => {
    for (const bad of [
      'no-slash',
      '/no-trailing',
      '/a?x/',
      '/a#x/',
      '/a//b/',
      '/a/../b/',
      '/a/./b/',
      '/a/%2e%2e/b/',
      '/',
    ]) {
      expectCode(
        () => resolveDetailPathSuffix(releasePackage({ path: bad }), 'zh', options),
        'INVALID_PATH',
      )
    }
  })

  it('rejects page-specific path segments VuePress would rewrite', () => {
    for (const bad of ['/a(b)/', '/a*b/', '/a!b/', '/_lead/', '/ok/a,b/']) {
      expectCode(
        () => resolveDetailPathSuffix(releasePackage({ path: bad }), 'zh', options),
        'UNROUTABLE_SEGMENT',
      )
    }
  })

  it('encodes page-specific path segments', () => {
    expect(
      resolveDetailPathSuffix(releasePackage({ path: '/作品/合集/' }), 'zh', options),
    ).toBe(`/${encodeURIComponent('作品')}/${encodeURIComponent('合集')}/`)
  })

  it('forbids remapping home', () => {
    expectCode(
      () => resolveDetailPathSuffix(homePackage({ path: '/anywhere/' }), 'zh', options),
      'HOME_PATH_REMAP',
    )
  })

  it('percent-encodes slugs as single segments', () => {
    expect(
      resolveDetailPathSuffix(releasePackage({ slug: '作品' }), 'zh', options),
    ).toBe(`/releases/${encodeURIComponent('作品')}/`)
  })

  it('fails when a non-home package has no slug', () => {
    expectCode(
      () => resolveDetailPathSuffix(releasePackage({ slug: null }), 'zh', options),
      'MISSING_SLUG',
    )
  })
})
