import { describe, expect, it } from 'vitest'
import {
  resolveInternalPath,
  resolveLinkHref,
} from '../../../src/client/navigation/resolve-link-href'

describe('resolveLinkHref', () => {
  it('prepends the locale and base to internal leading-slash paths', () => {
    expect(
      resolveLinkHref({ href: '/releases/', locale: 'zh', base: '/' }),
    ).toEqual({ href: '/zh/releases/', external: false })
    expect(
      resolveLinkHref({ href: '/releases/', locale: 'en', base: '/repo/' }),
    ).toEqual({ href: '/repo/en/releases/', external: false })
  })

  it('passes external and scheme URLs through unchanged as external', () => {
    expect(
      resolveLinkHref({ href: 'https://example.com/x', locale: 'zh', base: '/' }),
    ).toEqual({ href: 'https://example.com/x', external: true })
    expect(
      resolveLinkHref({ href: 'mailto:a@b.com', locale: 'zh', base: '/' }),
    ).toEqual({ href: 'mailto:a@b.com', external: true })
    expect(
      resolveLinkHref({ href: '//cdn.example.com/x', locale: 'zh', base: '/' }),
    ).toEqual({ href: '//cdn.example.com/x', external: true })
  })

  it('passes hash and relative paths through unchanged', () => {
    expect(
      resolveLinkHref({ href: '#section', locale: 'zh', base: '/' }),
    ).toEqual({ href: '#section', external: false })
    expect(
      resolveLinkHref({ href: './local', locale: 'zh', base: '/' }),
    ).toEqual({ href: './local', external: false })
  })
})

describe('resolveInternalPath', () => {
  it('prepends an encoded locale and normalizes trailing slashes', () => {
    expect(resolveInternalPath('/docs/', 'zh', '/')).toBe('/zh/docs/')
    expect(resolveInternalPath('/docs', 'zh', '/')).toBe('/zh/docs')
  })
})
