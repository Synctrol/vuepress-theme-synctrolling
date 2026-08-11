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
})
