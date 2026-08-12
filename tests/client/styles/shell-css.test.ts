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

  it('styles header and footer as reference bars', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-header\s*\{[^}]*background:\s*var\(--syn-bar-bg\)/)
    expect(css).toMatch(/\.syn-header\s*\{[^}]*color:\s*var\(--syn-bar-fg\)/)
    expect(css).toMatch(/\.syn-header\s*\{[^}]*letter-spacing:\s*2px/)
    expect(css).toMatch(/\.syn-header\s*\{[^}]*padding:\s*10px 16px/)
    expect(css).toMatch(/\.syn-site-footer\s*\{[^}]*background:\s*var\(--syn-bar-bg\)/)
    expect(css).toMatch(/\.syn-site-footer\s*\{[^}]*color:\s*var\(--syn-bar-fg\)/)
    expect(css).toMatch(/\.syn-site-footer\s*\{[^}]*border-top:\s*var\(--syn-border-strong\)/)
  })

  it('styles the theme toggle like the reference theme-option', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-theme-mode__button\s*\{[^}]*font-size:\s*12px/)
    expect(css).toMatch(/\.syn-theme-mode__button\s*\{[^}]*letter-spacing:\s*1px/)
    expect(css).toMatch(/\.syn-theme-mode__button\s*\{[^}]*color:\s*inherit/)
    expect(css).toMatch(/\.syn-theme-mode__button:hover[^{]*\{[^}]*text-decoration:\s*underline/)
  })

  it('renders the navigation column as a deco link-panel column', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-navigation\s*\{[^}]*background:\s*var\(--syn-deco-bg\)/)
    expect(css).toMatch(/\.syn-navigation\s*\{[^}]*color:\s*var\(--syn-deco-label-fg\)/)
    expect(css).toMatch(/\.syn-navigation\s*\{[^}]*padding:\s*0/)
    expect(css).toMatch(/\.syn-navigation__link\s*\{[^}]*display:\s*block/)
    expect(css).toMatch(/\.syn-navigation__link\s*\{[^}]*padding:\s*20px 24px/)
    expect(css).toMatch(/\.syn-navigation__link\s*\{[^}]*font-size:\s*13px/)
    expect(css).toMatch(/\.syn-navigation__link\s*\{[^}]*letter-spacing:\s*2px/)
    expect(css).toMatch(/\.syn-navigation__link\s*\{[^}]*text-decoration:\s*none/)
    expect(css).toMatch(/\.syn-navigation__link:hover[^{]*\{[^}]*background:\s*var\(--syn-deco-symbol-bg\)/)
    expect(css).toMatch(/\.syn-navigation__link:hover[^{]*\{[^}]*color:\s*var\(--syn-deco-bg\)/)
    expect(css).toMatch(/\.syn-navigation__item\s*\+\s*\.syn-navigation__item\s*\{[^}]*border-block-start:\s*var\(--syn-border-strong\)/)
  })
})
