import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import { assertSiteUrl } from '../../src/compiler/site-url'

function expectSiteUrlDiagnostic(value: string): void {
  try {
    assertSiteUrl(value)
  } catch (error) {
    if (!isDiagnosticError(error)) throw error
    expect(error.diagnostics[0]?.code).toBe('INVALID_SITE_URL')
    expect(error.diagnostics[0]?.severity).toBe('error')
    return
  }
  throw new Error(`Expected INVALID_SITE_URL for ${JSON.stringify(value)}`)
}

describe('assertSiteUrl', () => {
  it('accepts an origin without a trailing slash', () => {
    expect(assertSiteUrl('https://synctrol.com')).toBe('https://synctrol.com')
    expect(assertSiteUrl('http://localhost:8080')).toBe('http://localhost:8080')
  })

  it('normalizes a trailing slash instead of rejecting it, matching resolveThemeOptions', () => {
    expect(assertSiteUrl('https://synctrol.com/')).toBe('https://synctrol.com')
    expect(assertSiteUrl('https://synctrol.com//')).toBe('https://synctrol.com')
  })

  it('rejects empty, relative, non-http, and path-bearing values', () => {
    for (const bad of [
      '',
      '   ',
      '/synctrol.com',
      'synctrol.com',
      'ftp://synctrol.com',
      'javascript:alert(1)',
      'https://synctrol.com/docs',
      'https://synctrol.com/?a=1',
      'https://synctrol.com/#x',
      'https://user:pass@synctrol.com',
    ]) {
      expectSiteUrlDiagnostic(bad)
    }
  })
})
