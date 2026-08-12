import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('shell.css', () => {
  const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')

  it('defines desktop grid areas and golden-ratio columns/rows', () => {
    expect(css).toContain("grid-template-areas:")
    expect(css).toContain("'header header'")
    expect(css).toContain("'main navigation'")
    expect(css).toContain("'main footer'")
    expect(css).toContain("'dock dock'")
    expect(css).toContain('minmax(0, 1.618fr)')
    expect(css).toContain('minmax(280px, 1fr)')
    expect(css).toContain('var(--syn-dock-content-clearance)')
  })

  it('uses the mobile breakpoint at 768px and dock safe-area tokens', () => {
    expect(css).toContain('@media (max-width: 768px)')
    expect(css).toContain('var(--syn-dock-bottom)')
    expect(css).toContain('var(--syn-dock-left)')
    expect(css).toContain('var(--syn-dock-right)')
    expect(css).toContain('var(--syn-dock-gap)')
    expect(css).toContain('var(--syn-dock-control-size)')
    expect(css).toContain('@media (max-width: 360px)')
  })

  it('hides fixed docks while the drawer is open', () => {
    expect(css).toMatch(/\.syn-shell--drawer-open[\s\S]*\.syn-social-links/)
    expect(css).toMatch(/\.syn-shell--drawer-open[\s\S]*\.syn-language/)
  })
})
