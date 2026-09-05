import { describe, expect, it } from 'vitest'
import { toForwardSlashPath } from '../../src/compiler/path'

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
