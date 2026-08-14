import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('release.css', () => {
  const css = readFileSync(resolve('src/client/styles/release.css'), 'utf8')

  it('uses the data-theme selector for dark-mode draft badge inversion', () => {
    expect(css).not.toMatch(/:root\.dark/)
    expect(css).toMatch(
      /:root\[data-theme='dark'\]\s*\.syn-draft-badge/,
    )
    expect(css).not.toMatch(
      /:root\[data-theme='dark'\]\s*\.syn-release-tile:hover/,
    )
  })

  it('defines the album section shell and two-column tracklist', () => {
    expect(css).toMatch(/\.syn-album-section\s*\{[^}]*border:\s*var\(--syn-border-strong\)/)
    expect(css).toMatch(/\.syn-album-track\s*\{[^}]*grid-template-columns:\s*auto\s+1fr/)
    expect(css).toMatch(/\.syn-album-track__artists\s*\{[^}]*font-size:\s*0\.75em/)
    expect(css).toMatch(/\.syn-album-track__label\s*\{[^}]*text-align:\s*right/)
    expect(css).toMatch(/\.syn-album-tracklist\s*\{[^}]*border:\s*0/)
    expect(css).toMatch(/\.syn-album-tracklist\s*\{[^}]*padding:\s*0/)
  })

  it('defines the reusable tabview shell with a mode-inverted selected tab', () => {
    expect(css).toMatch(/\.syn-tabview__bar\s*\{[^}]*margin:\s*-1rem\s+-1rem\s+1rem/)
    expect(css).toMatch(/\.syn-tabview__tab\[aria-selected='true'\]\s*\{[^}]*background:\s*var\(--syn-black\)/)
    expect(css).toMatch(/\.syn-tabview__tab\[aria-selected='true'\]\s*\{[^}]*color:\s*var\(--syn-white\)/)
    expect(css).toMatch(/:root\[data-theme='dark'\]\s*\.syn-tabview__tab\[aria-selected='true'\]\s*\{[^}]*background:\s*var\(--syn-white\)/)
    expect(css).toMatch(/:root\[data-theme='dark'\]\s*\.syn-tabview__tab\[aria-selected='true'\]\s*\{[^}]*color:\s*var\(--syn-black\)/)
    expect(css).not.toMatch(/syn-platform-tabs/)
  })

  it('defines standalone platform entries that fill the row', () => {
    expect(css).toMatch(/\.syn-platform-entry\s*\{[^}]*display:\s*block/)
    expect(css).toMatch(/\.syn-platform-entry\s*\+\s*\.syn-platform-entry\s*\{[^}]*margin-block-start/)
    expect(css).toMatch(/\.syn-platform-iframe\s*\{[^}]*display:\s*block/)
    expect(css).toMatch(/\.syn-platform-iframe\s*\{[^}]*width:\s*100%/)
    expect(css).toMatch(/\.syn-platform-iframe\s*\{[^}]*border:\s*0/)
    expect(css).toMatch(/\.syn-platform-embed__activate\s*\{[^}]*border:\s*0/)
    expect(css).toMatch(/\.syn-platform-embed__activate\s*\{[^}]*background:\s*transparent/)
    expect(css).toMatch(/\.syn-platform-link\s*\{[^}]*display:\s*block/)
  })

  it('defines block-level credit values', () => {
    expect(css).toMatch(/\.syn-album-credit__value\s*\{[^}]*display:\s*block/)
  })

  it('defines a borderless container-driven release grid with hover dimming', () => {
    expect(css).toMatch(/\.syn-release-index\s*\{[^}]*container-type:\s*inline-size/)
    expect(css).not.toMatch(/\.syn-release-index-grid\s*\{[^}]*border:/)
    expect(css).toMatch(/\.syn-release-index-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/)
    expect(css).toMatch(/@container\s*\(min-width:\s*480px\)[^{]*\{[^}]*repeat\(3,/)
    expect(css).toMatch(/@container\s*\(min-width:\s*640px\)[^{]*\{[^}]*repeat\(4,/)
    expect(css).toMatch(/\.syn-release-tile::after\s*\{[^}]*background:\s*var\(--syn-black\)/)
    expect(css).toMatch(/:root\[data-theme='dark'\]\s*\.syn-release-tile::after\s*\{[^}]*background:\s*var\(--syn-white\)/)
    expect(css).toMatch(/\.syn-release-tile:hover::after[^{]*\{[^}]*opacity:\s*0\.45/)
    expect(css).not.toMatch(/\.syn-release-tile:hover\s*\.syn-release-artwork[^{]*\{[^}]*opacity:\s*0\.35/)
    expect(css).toMatch(/\.syn-release-tile__title\s*\{[^}]*color:\s*var\(--syn-bg\)/)
    expect(css).toMatch(/\.syn-release-tile__title\s*\{[^}]*z-index:\s*1/)
    expect(css).toMatch(/\.syn-release-tile:hover\s*\.syn-release-tile__title[^{]*\{[^}]*opacity:\s*1/)
    expect(css).not.toMatch(/\.syn-release-index-grid__item\s*\{[^}]*border:/)
  })

  it('caps the detail artwork at 500px and keeps the identity tight', () => {
    expect(css).toMatch(/\.syn-release-detail-artwork\s*\{[^}]*max-width:\s*var\(--syn-artwork-width\)/)
    expect(css).toMatch(/\.syn-album-identity\s*\{[^}]*margin-block:\s*2rem/)
    expect(css).toMatch(/\.syn-album-identity\s*\{[^}]*padding:\s*0/)
    expect(css).toMatch(/\.syn-album-credit\s*\{[^}]*border:\s*0/)
    expect(css).toMatch(/\.syn-album-credit\s*\{[^}]*padding:\s*0/)
    expect(css).toMatch(/\.syn-album-covers\s*\{[^}]*border:\s*0/)
    expect(css).toMatch(/\.syn-album-covers\s*\{[^}]*padding:\s*0/)
    expect(css).toMatch(/\.syn-main:has\(\.syn-release-detail\)\s*>\s*\.cell\s*\{[^}]*max-width:\s*600px/)
  })

  it('defines the credit grid and covers grid', () => {
    expect(css).toMatch(/\.syn-album-credit__row\s*\{[^}]*display:\s*grid/)
    expect(css).toMatch(/\.syn-album-credit__row\s*\{[^}]*grid-template-columns:\s*1fr\s+1\.618fr/)
    expect(css).toMatch(/\.syn-album-covers\s+ul\s*[,{][^}]*display:\s*grid/)
  })

  it('drops the retired auto-render section shells', () => {
    expect(css).not.toMatch(/\.syn-album-discs\s*,/)
    expect(css).not.toMatch(/\.syn-gift-book-body/)
  })
})
