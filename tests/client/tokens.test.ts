import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('design tokens', () => {
  it('defines the fixed synctrol brand variables', () => {
    const css = readFileSync(
      resolve('src/client/styles/tokens.css'),
      'utf8',
    )
    expect(css).toContain('--syn-black: #000;')
    expect(css).toContain('--syn-white: #fff;')
    expect(css).toContain('--syn-border-strong: 3px solid currentColor;')
    expect(css).toContain('--syn-border-subtle: 1px solid currentColor;')
    expect(css).toContain('--syn-radius: 0;')
    expect(css).toContain('--syn-content-width: 760px;')
    expect(css).toContain('--syn-artwork-width: 660px;')
    expect(css).toContain('--syn-dock-content-clearance: 72px;')
    expect(css).toContain('--syn-dock-control-size: 40px;')
  })

  it('ports the reference bar/deco/gray tokens in light mode', () => {
    const css = readFileSync(
      resolve('src/client/styles/tokens.css'),
      'utf8',
    )
    expect(css).toContain('--syn-gray-300: #ddd;')
    expect(css).toContain('--syn-gray-500: #888;')
    expect(css).toContain('--syn-gray-700: #555;')
    expect(css).toContain('--syn-bar-bg: var(--syn-black);')
    expect(css).toContain('--syn-bar-fg: var(--syn-white);')
    expect(css).toContain('--syn-deco-bg: var(--syn-gray-300);')
    expect(css).toContain('--syn-deco-symbol-bg: var(--syn-black);')
    expect(css).toContain('--syn-deco-label-fg: var(--syn-black);')
    expect(css).toContain('--syn-sub-title-fg: var(--syn-gray-700);')
    expect(css).toContain('--syn-status-sub-fg: var(--syn-gray-500);')
  })

  it('inverts the tokens in dark mode', () => {
    const css = readFileSync(
      resolve('src/client/styles/tokens.css'),
      'utf8',
    )
    const dark = css.slice(css.indexOf(":root[data-theme='dark']"))
    expect(dark).toContain('--syn-gray-300: #1a1a1a;')
    expect(dark).toContain('--syn-gray-500: #999;')
    expect(dark).toContain('--syn-gray-700: #aaa;')
    expect(dark).toContain('--syn-bar-bg: var(--syn-white);')
    expect(dark).toContain('--syn-bar-fg: var(--syn-black);')
    expect(dark).toContain('--syn-deco-bg: var(--syn-gray-300);')
    expect(dark).toContain('--syn-deco-symbol-bg: var(--syn-white);')
    expect(dark).toContain('--syn-deco-label-fg: var(--syn-white);')
    expect(dark).toContain('--syn-sub-title-fg: var(--syn-gray-700);')
    expect(dark).toContain('--syn-status-sub-fg: var(--syn-gray-500);')
  })

  it('mirrors the reference prefers-color-scheme fallback', () => {
    const css = readFileSync(
      resolve('src/client/styles/tokens.css'),
      'utf8',
    )
    expect(css).toContain('@media (prefers-color-scheme: dark)')
    expect(css).toContain(':root:not([data-theme])')
  })
})
