import { describe, expect, it } from 'vitest'
import {
  isCrossPlatformAbsolute,
  resolveConfigRelativePath,
  toForwardSlashPath,
} from '../../src/compiler/path'

describe('toForwardSlashPath', () => {
  it('keeps POSIX-style paths unchanged', () => {
    expect(toForwardSlashPath('/site/.vuepress/backgrounds/host')).toBe(
      '/site/.vuepress/backgrounds/host',
    )
  })

  it('converts Windows drive paths to forward slashes', () => {
    expect(toForwardSlashPath('C:\\site\\.vuepress\\backgrounds\\host')).toBe(
      'C:/site/.vuepress/backgrounds/host',
    )
  })

  it('converts Windows UNC paths to forward slashes', () => {
    expect(toForwardSlashPath('\\\\server\\share\\site\\config.js')).toBe(
      '//server/share/site/config.js',
    )
  })

  it('leaves paths without backslashes untouched', () => {
    expect(toForwardSlashPath('./backgrounds/host')).toBe('./backgrounds/host')
  })
})

describe('isCrossPlatformAbsolute', () => {
  it('treats POSIX absolute paths as absolute on any host', () => {
    expect(isCrossPlatformAbsolute('/abs/backgrounds/host')).toBe(true)
  })

  it('treats Windows drive paths as absolute on any host', () => {
    expect(isCrossPlatformAbsolute('C:\\abs\\backgrounds\\host')).toBe(true)
    expect(isCrossPlatformAbsolute('C:/abs/backgrounds/host')).toBe(true)
  })

  it('treats relative paths as non-absolute', () => {
    expect(isCrossPlatformAbsolute('./backgrounds/host')).toBe(false)
    expect(isCrossPlatformAbsolute('backgrounds/host')).toBe(false)
  })
})

describe('resolveConfigRelativePath', () => {
  it('keeps Windows absolute backgrounds as-is even when configDir is Windows-styled', () => {
    expect(
      resolveConfigRelativePath(
        'C:\\site\\.vuepress',
        'C:\\abs\\backgrounds\\host',
      ),
    ).toBe('C:\\abs\\backgrounds\\host')
  })

  it('resolves relative backgrounds against a Windows-styled configDir without host cwd', () => {
    expect(
      resolveConfigRelativePath('C:\\site\\.vuepress', './backgrounds/host'),
    ).toBe('C:\\site\\.vuepress\\backgrounds\\host')
  })

  it('resolves relative backgrounds against a POSIX configDir', () => {
    expect(
      resolveConfigRelativePath('/site/.vuepress', './backgrounds/host'),
    ).toBe('/site/.vuepress/backgrounds/host')
  })
})
