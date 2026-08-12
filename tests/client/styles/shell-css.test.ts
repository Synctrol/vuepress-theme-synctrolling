import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('shell.css', () => {
  const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')

  it('defines desktop grid areas and golden-ratio columns/rows', () => {
    expect(css).toContain("grid-template-areas:")
    expect(css).toContain("'header header'")
    expect(css).toContain("'main navigation'")
    expect(css).toContain("'main .'")
    expect(css).toContain("'footer footer'")
    expect(css).toContain("'dock dock'")
    expect(css).toContain('minmax(0, 1.618fr)')
    expect(css).toContain('minmax(280px, 1fr)')
    expect(css).toContain('var(--syn-dock-content-clearance)')
  })

  it('lays the footer bar out like the reference bottom bar with the language switcher inside', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-site-footer\s*\{[^}]*display:\s*flex/)
    expect(css).toMatch(/\.syn-site-footer\s*\{[^}]*align-items:\s*center/)
    expect(css).toMatch(/\.syn-site-footer\s*\{[^}]*justify-content:\s*space-between/)
    expect(css).not.toMatch(/\.syn-language\s*\{[^}]*position:\s*fixed/)
    expect(css).toMatch(/\.syn-language\s*\{[^}]*position:\s*relative/)
  })

  it('styles the home logo with reference .logo/.logo-sub classes and full-width title cell', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-home-logo\s*\.logo\s*\{[^}]*font-size:\s*clamp\(48px,\s*9vw,\s*96px\)/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo\s*\{[^}]*font-weight:\s*900/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo-sub\s*\{[^}]*font-size:\s*14px/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo-sub\s*\{[^}]*text-transform:\s*uppercase/)
    expect(css).toMatch(/\.syn-main:has\(\.syn-home-logo\)[^{]*\.[^}]*max-width:\s*none/)
    expect(css).toMatch(/\.syn-formatter--home-logo\s*\{[^}]*display:\s*contents/)
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
    expect(css).toMatch(/\.syn-navigation__link:focus-visible[^{]*\{[^}]*background:\s*var\(--syn-deco-symbol-bg\)/)
    expect(css).toMatch(/\.syn-navigation__link:focus-visible[^{]*\{[^}]*color:\s*var\(--syn-deco-bg\)/)
    expect(css).toMatch(/\.syn-navigation__item\s*\+\s*\.syn-navigation__item\s*\{[^}]*border-block-start:\s*var\(--syn-border-strong\)/)
  })

  it('applies reference display metrics to the home logo', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-home-logo\s*\{[^}]*text-align:\s*right/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo\s*\{[^}]*font-size:\s*clamp\(48px,\s*9vw,\s*96px\)/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo\s*\{[^}]*font-weight:\s*900/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo\s*\{[^}]*line-height:\s*0\.9/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo\s*\{[^}]*letter-spacing:\s*-2px/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo-sub\s*\{[^}]*font-size:\s*14px/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo-sub\s*\{[^}]*letter-spacing:\s*4px/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo-sub\s*\{[^}]*text-transform:\s*uppercase/)
    expect(css).toMatch(/\.syn-home-logo\s*\.logo-sub\s*\{[^}]*color:\s*var\(--syn-sub-title-fg\)/)
  })

  it('aligns dock and language controls with reference letter-spacing and hover', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toMatch(/\.syn-social-links__link:hover[^{]*\{[^}]*background:\s*var\(--syn-deco-symbol-bg\)/)
    expect(css).toMatch(/\.syn-social-links__link:hover[^{]*\s*\.syn-social-links__icon[^{]*\{[^}]*filter:\s*invert\(1\)/)
    expect(css).toMatch(/:root\[data-theme='dark'\][^{]*\.syn-social-links__link:hover[^{]*\s*\.syn-social-links__icon[^{]*\{[^}]*filter:\s*invert\(0\)/)
    expect(css).toMatch(/\.syn-language__toggle\s*\{[^}]*letter-spacing:\s*1px/)
    expect(css).toMatch(/\.syn-language__option\s*\{[^}]*letter-spacing:\s*1px/)
    expect(css).toMatch(/\.syn-language__toggle:hover[^{]*\{[^}]*text-decoration:\s*underline/)
    expect(css).toMatch(/\.syn-nav-drawer__close\s*\{[^}]*letter-spacing:\s*1px/)
  })

  it('adds the reference 640px mobile breakpoint', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    const idx = css.indexOf('@media (max-width: 640px)')
    expect(idx).toBeGreaterThan(-1)
    const mobile = css.slice(idx)
    expect(mobile).toMatch(/\.syn-header\s*\{[^}]*font-size:\s*11px/)
    expect(mobile).toMatch(/\.syn-site-footer\s*\{[^}]*font-size:\s*11px/)
    expect(mobile).toMatch(/\.syn-home-logo\s*\.logo\s*\{[^}]*font-size:\s*52px/)
    expect(mobile).toMatch(/\.syn-navigation__link\s*\{[^}]*padding:\s*14px 16px/)
    expect(mobile).toMatch(/\.syn-home-logo\s*\.logo-sub\s*\{[^}]*font-size:\s*10px/)
  })
})
