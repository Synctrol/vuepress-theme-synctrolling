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
})
