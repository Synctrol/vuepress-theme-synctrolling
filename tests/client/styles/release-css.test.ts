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
