import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { loadContentDefinitions } from '../../src/compiler/definitions.js'

describe('definitions without platforms', () => {
  it('keeps client layouts off the removed platforms contract', () => {
    const layout = readFileSync('src/client/layouts/Layout.vue', 'utf8')
    const releaseDetail = readFileSync(
      'src/client/layouts/ReleaseDetail.vue',
      'utf8',
    )

    expect(layout).not.toContain("ContentDefinitions['platforms']")
    expect(releaseDetail).not.toContain("ContentDefinitions['platforms']")
    expect(layout).toContain('resolvePlatformTypes()')
    expect(layout).not.toContain('resolvePlatformTypes({})')
  })

  it('loads tags-only definitions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'defs-'))
    const path = join(dir, 'definitions.yml')
    writeFileSync(
      path,
      `tags:\n  release:\n    title:\n      zh: 作品\n      en: Releases\n`,
    )
    const defs = loadContentDefinitions(path, 'zh')
    expect(defs.tags.release).toBeTruthy()
    expect(Object.hasOwn(defs, 'platforms')).toBe(false)
  })

  it('fails when platforms key is present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'defs-'))
    const path = join(dir, 'definitions.yml')
    writeFileSync(
      path,
      `tags: {}\nplatforms:\n  x:\n    category: digital\n    type: link\n    name: X\n`,
    )
    expect(() => loadContentDefinitions(path, 'zh')).toThrow(/platforms/i)
  })
})
