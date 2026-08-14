import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('release.css', () => {
  const css = readFileSync(resolve('src/client/styles/release.css'), 'utf8')

  it('uses the data-theme selector for dark-mode hover inversion', () => {
    expect(css).not.toMatch(/:root\.dark/)
    expect(css).toMatch(
      /:root\[data-theme='dark'\]\s*\.syn-release-tile:hover/,
    )
    expect(css).toMatch(
      /:root\[data-theme='dark'\]\s*\.syn-release-tile:focus-visible/,
    )
    expect(css).toMatch(
      /:root\[data-theme='dark'\]\s*\.syn-draft-badge/,
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

  it('defines the reusable tabview shell with a light selected tab', () => {
    expect(css).toMatch(/\.syn-tabview__bar\s*\{[^}]*margin:\s*-1rem\s+-1rem\s+1rem/)
    expect(css).toMatch(/\.syn-tabview__tab\[aria-selected='true'\]\s*\{[^}]*background:\s*var\(--syn-white\)/)
    expect(css).toMatch(/\.syn-tabview__tab\[aria-selected='true'\]\s*\{[^}]*color:\s*var\(--syn-black\)/)
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

  it('caps the detail artwork at 500px and keeps the identity tight', () => {
    expect(css).toMatch(/\.syn-release-detail-artwork\s*\{[^}]*max-width:\s*var\(--syn-artwork-width\)/)
    expect(css).toMatch(/\.syn-album-identity\s*\{[^}]*margin-block:\s*2rem/)
    expect(css).toMatch(/\.syn-album-identity\s*\{[^}]*padding:\s*0/)
    expect(css).toMatch(/\.syn-album-credit\s*\{[^}]*border:\s*0/)
    expect(css).toMatch(/\.syn-album-credit\s*\{[^}]*padding:\s*0/)
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
