import { describe, expect, it } from 'vitest'
import { parseAlbumMetadata } from '../../src/compiler/album-metadata'
import {
  isDiagnosticError,
  SynctrolDiagnosticError,
} from '../../src/compiler/diagnostics'

const albumPath = '/content/releases/example/album.yml'

function captureError(action: () => unknown): unknown {
  try {
    action()
    return undefined
  } catch (error) {
    return error
  }
}

function expectDiagnostic(
  action: () => unknown,
  code: string,
  message: string,
): void {
  const error = captureError(action)
  expect(error).toBeInstanceOf(SynctrolDiagnosticError)
  expect(isDiagnosticError(error)).toBe(true)
  if (isDiagnosticError(error)) {
    expect(error.diagnostics).toHaveLength(1)
    expect(error.diagnostics[0]).toMatchObject({
      severity: 'error',
      code,
      path: albumPath,
    })
    expect(error.diagnostics[0].message).toContain(message)
  }
}

describe('parseAlbumMetadata', () => {
  it('parses album display metadata and preserves disc and track order', () => {
    expect(parseAlbumMetadata({
      title: { zh: '第一张专辑', en: 'First Album' },
      copyright: '© 2026 Synctrol',
      credit: {
        catalogNumber: 'SYN-001',
        illustrator: ['Artist One', 'Artist Two'],
      },
      covers: ['./assets/front.webp', './assets/back.webp'],
      discs: [
        {
          title: { zh: '第一碟', en: 'Disc One' },
          desc: 'Main disc',
          tracks: [
            {
              title: { zh: '第一曲', en: 'Track One' },
              artists: ['Synctrol', 'Vocalist'],
              duration: 272,
              desc: 'Opening track',
              copyright: '© 2026 Synctrol',
            },
          ],
        },
        { title: 'Disc Two', tracks: [] },
      ],
    }, albumPath, 'zh')).toEqual({
      title: { zh: '第一张专辑', en: 'First Album' },
      copyright: '© 2026 Synctrol',
      credit: {
        catalogNumber: 'SYN-001',
        illustrator: ['Artist One', 'Artist Two'],
      },
      covers: ['./assets/front.webp', './assets/back.webp'],
      discs: [
        {
          title: { zh: '第一碟', en: 'Disc One' },
          desc: 'Main disc',
          tracks: [
            {
              title: { zh: '第一曲', en: 'Track One' },
              artists: ['Synctrol', 'Vocalist'],
              duration: 272,
              desc: 'Opening track',
              copyright: '© 2026 Synctrol',
            },
          ],
        },
        { title: 'Disc Two', tracks: [] },
      ],
    })
  })

  it('rejects links as an unknown field', () => {
    expectDiagnostic(
      () => parseAlbumMetadata(
        { title: 'Album', links: [] },
        albumPath,
        'zh',
      ),
      'UNKNOWN_FIELD',
      'Unknown field "links"',
    )
  })

  it('rejects unknown credit keys', () => {
    expectDiagnostic(
      () => parseAlbumMetadata(
        { title: 'Album', credit: { publisher: 'Synctrol' } },
        albumPath,
        'zh',
      ),
      'UNKNOWN_FIELD',
      'Unknown field "credit.publisher"',
    )
  })

  it('requires title', () => {
    expectDiagnostic(
      () => parseAlbumMetadata({}, albumPath, 'zh'),
      'INVALID_MULTILANGUAGE',
      'title must be a string or locale map',
    )
  })

  it('accepts credit values as strings or non-empty string arrays', () => {
    expect(parseAlbumMetadata({
      title: 'Album',
      credit: {
        producer: 'Synctrol',
        specialThanks: ['Fans', 'Family'],
      },
    }, albumPath, 'zh')).toEqual({
      title: 'Album',
      credit: {
        producer: 'Synctrol',
        specialThanks: ['Fans', 'Family'],
      },
      covers: [],
      discs: [],
    })
  })
})
