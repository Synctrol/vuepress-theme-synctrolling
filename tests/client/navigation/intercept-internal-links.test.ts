import { describe, expect, it } from 'vitest'
import {
  resolveRoutePathFromHref,
  shouldInterceptClick,
} from '../../../src/client/navigation/intercept-internal-links'

function anchor(attrs: Record<string, string> = {}): HTMLAnchorElement {
  const el = document.createElement('a')
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }
  return el
}

describe('resolveRoutePathFromHref', () => {
  it('resolves an internal absolute path for the root base', () => {
    expect(resolveRoutePathFromHref('/zh/releases/', '/')).toBe('/zh/releases/')
    expect(resolveRoutePathFromHref('/zh/releases/?page=2', '/')).toBe(
      '/zh/releases/?page=2',
    )
  })

  it('strips a non-root base prefix', () => {
    expect(resolveRoutePathFromHref('/repo/zh/releases/', '/repo/')).toBe(
      '/zh/releases/',
    )
  })

  it('returns null for external, hash, query, and non-path hrefs', () => {
    expect(resolveRoutePathFromHref('https://github.com/x', '/')).toBeNull()
    expect(resolveRoutePathFromHref('//github.com/x', '/')).toBeNull()
    expect(resolveRoutePathFromHref('mailto:a@b.com', '/')).toBeNull()
    expect(resolveRoutePathFromHref('#section', '/')).toBeNull()
    expect(resolveRoutePathFromHref('?page=2', '/')).toBeNull()
    expect(resolveRoutePathFromHref('relative/path', '/')).toBeNull()
    expect(resolveRoutePathFromHref('', '/')).toBeNull()
  })
})

describe('shouldInterceptClick', () => {
  const baseEvent = {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
  }

  it('intercepts a plain left click', () => {
    expect(shouldInterceptClick(baseEvent, anchor({ href: '/zh/' }))).toBe(true)
  })

  it('ignores modified clicks', () => {
    for (const key of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const) {
      expect(
        shouldInterceptClick({ ...baseEvent, [key]: true }, anchor({ href: '/zh/' })),
      ).toBe(false)
    }
  })

  it('ignores non-left buttons and prevented clicks', () => {
    expect(shouldInterceptClick({ ...baseEvent, button: 1 }, anchor({ href: '/zh/' }))).toBe(
      false,
    )
    expect(
      shouldInterceptClick(
        { ...baseEvent, defaultPrevented: true },
        anchor({ href: '/zh/' }),
      ),
    ).toBe(false)
  })

  it('ignores new-tab and download links', () => {
    expect(
      shouldInterceptClick(baseEvent, anchor({ href: '/zh/', target: '_blank' })),
    ).toBe(false)
    expect(
      shouldInterceptClick(baseEvent, anchor({ href: '/zh/', download: '' })),
    ).toBe(false)
  })
})
