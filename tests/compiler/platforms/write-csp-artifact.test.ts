import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  assertNoCspMetaInjection,
  writeSynctrolCspJson,
} from '../../../src/compiler/platforms/write-csp-artifact'

describe('writeSynctrolCspJson', () => {
  it('writes merged directive arrays to dest/synctrol-csp.json', () => {
    const dest = mkdtempSync(join(tmpdir(), 'synctrol-csp-'))
    const path = writeSynctrolCspJson(dest, {
      'frame-src': ['https://www.youtube.com'],
      'media-src': ["'self'"],
      'connect-src': [],
    })
    expect(path).toBe(join(dest, 'synctrol-csp.json'))
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      'frame-src': ['https://www.youtube.com'],
      'media-src': ["'self'"],
      'connect-src': [],
    })
    expect(existsSync(join(dest, 'index.html'))).toBe(false)
  })

  it('rejects HTML that injects a CSP meta tag in v1', () => {
    expect(() =>
      assertNoCspMetaInjection(
        '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'">',
      ),
    ).toThrow(/CSP meta/)
    expect(() => assertNoCspMetaInjection('<html><head></head></html>')).not.toThrow()
  })
})
