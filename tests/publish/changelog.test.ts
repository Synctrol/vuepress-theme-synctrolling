import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const log = readFileSync(resolve('CHANGELOG.md'), 'utf8')

describe('CHANGELOG', () => {
  it('bootstraps 0.1.0 as the first public release', () => {
    expect(log).toContain('# Changelog')
    expect(log).toContain('## [0.1.0] - 2026-08-11')
    expect(log).toContain('vuepress-theme-synctrolling')
    expect(log).toMatch(/First public release/i)
  })
})
