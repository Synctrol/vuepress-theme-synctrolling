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
    expect(css).toContain('--syn-border-strong: 3px solid var(--syn-black);')
    expect(css).toContain('--syn-border-subtle: 1px solid var(--syn-black);')
    expect(css).toContain('--syn-radius: 0;')
    expect(css).toContain('--syn-content-width: 760px;')
    expect(css).toContain('--syn-artwork-width: 500px;')
    expect(css).toContain('--syn-dock-gap: 12px;')
    expect(css).toContain('--syn-dock-control-size: 40px;')
    expect(css).not.toContain('--syn-dock-bottom')
    expect(css).not.toContain('--syn-dock-left')
    expect(css).not.toContain('--syn-dock-right')
    expect(css).not.toContain('--syn-dock-content-clearance')
    expect(css).not.toContain('currentColor')
  })

  it('ports the reference bar/deco/gray tokens in light mode', () => {
    const css = readFileSync(
      resolve('src/client/styles/tokens.css'),
      'utf8',
    )
    const light = css.slice(0, css.indexOf(":root[data-theme='dark']"))
    expect(light).toContain('--syn-border-strong: 3px solid var(--syn-black);')
    expect(light).toContain('--syn-border-subtle: 1px solid var(--syn-black);')
    expect(light).toContain('--syn-gray-300: #ddd;')
    expect(light).toContain('--syn-gray-500: #888;')
    expect(light).toContain('--syn-gray-700: #555;')
    expect(light).toContain('--syn-bar-bg: var(--syn-black);')
    expect(light).toContain('--syn-bar-fg: var(--syn-white);')
    expect(light).toContain('--syn-deco-bg: var(--syn-gray-300);')
    expect(light).toContain('--syn-deco-symbol-bg: var(--syn-black);')
    expect(light).toContain('--syn-deco-label-fg: var(--syn-black);')
    expect(light).toContain('--syn-sub-title-fg: var(--syn-gray-700);')
    expect(light).toContain('--syn-status-sub-fg: var(--syn-gray-500);')
  })

  it('inverts the tokens in dark mode', () => {
    const css = readFileSync(
      resolve('src/client/styles/tokens.css'),
      'utf8',
    )
    const start = css.indexOf(":root[data-theme='dark']")
    const end = css.indexOf('@media (prefers-color-scheme: dark)')
    const dark = css.slice(start, end)
    expect(dark).toContain('--syn-fg: var(--syn-white);')
    expect(dark).toContain('--syn-bg: var(--syn-black);')
    expect(dark).toContain('--syn-border-strong: 3px solid var(--syn-white);')
    expect(dark).toContain('--syn-border-subtle: 1px solid var(--syn-white);')
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
    const media = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'))
    expect(media).toContain(':root:not([data-theme])')
    expect(media).toContain('--syn-fg: var(--syn-white);')
    expect(media).toContain('--syn-bg: var(--syn-black);')
    expect(media).toContain('--syn-border-strong: 3px solid var(--syn-white);')
    expect(media).toContain('--syn-border-subtle: 1px solid var(--syn-white);')
    expect(media).toContain('--syn-gray-300: #1a1a1a;')
    expect(media).toContain('--syn-gray-500: #999;')
    expect(media).toContain('--syn-gray-700: #aaa;')
    expect(media).toContain('--syn-bar-bg: var(--syn-white);')
    expect(media).toContain('--syn-bar-fg: var(--syn-black);')
    expect(media).toContain('--syn-deco-bg: var(--syn-gray-300);')
    expect(media).toContain('--syn-deco-symbol-bg: var(--syn-white);')
    expect(media).toContain('--syn-deco-label-fg: var(--syn-white);')
    expect(media).toContain('--syn-sub-title-fg: var(--syn-gray-700);')
    expect(media).toContain('--syn-status-sub-fg: var(--syn-gray-500);')
  })
})
