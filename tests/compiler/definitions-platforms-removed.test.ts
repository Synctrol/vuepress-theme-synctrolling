import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('definitions without platforms', () => {
  it('keeps client layouts off the removed platforms contract', () => {
    const layout = readFileSync('src/client/layouts/Layout.vue', 'utf8')
    const releaseDetail = readFileSync(
      'src/client/layouts/ReleaseDetail.vue',
      'utf8',
    )

    expect(layout).not.toContain("ContentDefinitions['platforms']")
    expect(releaseDetail).not.toContain("ContentDefinitions['platforms']")
    expect(layout).not.toContain('resolvePlatformTypes')
  })
})
