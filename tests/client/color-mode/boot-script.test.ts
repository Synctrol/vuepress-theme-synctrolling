import { describe, expect, it } from 'vitest'
import { COLOR_MODE_STORAGE_KEY } from '../../../src/client/color-mode/storage'
import { buildColorModeBootScript } from '../../../src/client/color-mode/boot-script'

describe('buildColorModeBootScript', () => {
  it('embeds the storage key and default preference', () => {
    const script = buildColorModeBootScript('auto')
    expect(script).toContain(COLOR_MODE_STORAGE_KEY)
    expect(script).toContain("'auto'")
    expect(script).toContain('dataset.theme')
    expect(script).toMatch(/dataset\.theme=dark\?'dark':'light'/)
    // Storage failures must not force light: follow the OS preference instead.
    expect(script).toMatch(/catch\(e\)\{document\.documentElement\.dataset\.theme=window\.matchMedia\('\(prefers-color-scheme: dark\)'\)\.matches\?'dark':'light';?\}/)
    expect(script).toContain('prefers-color-scheme')
  })

  it('uses the configured default when storage is empty', () => {
    const script = buildColorModeBootScript('dark')
    expect(script).toContain("'dark'")
  })
})
