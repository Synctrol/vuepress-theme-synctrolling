import { describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../../src/compiler/diagnostics'
import {
  assertNoRawHtmlRelativeAssets,
  extractMarkdownAssetRefs,
} from '../../../src/compiler/assets/markdown-assets'

describe('extractMarkdownAssetRefs', () => {
  it('extracts Markdown image refs under ./assets/', () => {
    const body = 'Hello ![Alt](./assets/image.webp) and text'
    expect(extractMarkdownAssetRefs(body)).toEqual(['./assets/image.webp'])
  })

  it('extracts Markdown download/link refs under assets/', () => {
    const body = 'Get the [sheet](assets/notes.pdf) please'
    expect(extractMarkdownAssetRefs(body)).toEqual(['assets/notes.pdf'])
  })

  it('ignores absolute http(s) links, in-page anchors, and ordinary route links', () => {
    const body = [
      '[site](https://synctrol.com)',
      '[top](#section)',
      '![remote](https://cdn.example.com/a.webp)',
      '[News](../news/)',
      '[Home](/zh/)',
      '[Detail](./other-page/)',
    ].join('\n')
    expect(extractMarkdownAssetRefs(body)).toEqual([])
  })

  it('deduplicates repeated refs', () => {
    const body = '![A](./assets/a.webp) ![B](./assets/a.webp)'
    expect(extractMarkdownAssetRefs(body)).toEqual(['./assets/a.webp'])
  })
})

describe('assertNoRawHtmlRelativeAssets', () => {
  it('allows Markdown-only relative assets', () => {
    expect(() =>
      assertNoRawHtmlRelativeAssets(
        '![Ok](./assets/ok.webp)',
        '/content/home/zh.md',
      ),
    ).not.toThrow()
  })

  it('allows root-absolute hrefs inside Vue component tags', () => {
    expect(() =>
      assertNoRawHtmlRelativeAssets(
        '<ButtonGroup align="center"><Button href="/releases/">作品</Button></ButtonGroup>',
        '/content/news/formats/zh.md',
      ),
    ).not.toThrow()
  })

  it('extracts package asset refs passed as component props', () => {
    expect(
      extractMarkdownAssetRefs(
        '<NewAlbumReleased title="X" background="./assets/new-album.svg" />',
      ),
    ).toEqual(['./assets/new-album.svg'])
  })

  it('rejects raw HTML img src relative attributes', () => {
    try {
      assertNoRawHtmlRelativeAssets(
        '<img src="./assets/bad.webp" alt="x">',
        '/content/home/zh.md',
      )
      expect.unreachable('expected raw html rejection')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0]?.code).toBe('ASSET_RAW_HTML_RELATIVE')
        expect(error.diagnostics[0]?.path).toBe('/content/home/zh.md')
      }
    }
  })

  it('rejects unquoted raw HTML relative attributes', () => {
    const samples = [
      '<img src=./assets/bad.webp>',
      '<img src=../assets/bad.webp alt=x>',
      '<a href=/assets/file.pdf>x</a>',
      '<video poster=./assets/still.webp></video>',
    ]
    for (const html of samples) {
      expect(() =>
        assertNoRawHtmlRelativeAssets(html, '/content/home/zh.md'),
      ).toThrow(/ASSET_RAW_HTML_RELATIVE|raw HTML/i)
    }
  })

  it('rejects bare package asset refs in raw HTML (quoted and unquoted)', () => {
    const samples = [
      '<img src=assets/bad.webp>',
      '<img src="assets/bad.webp">',
    ]
    for (const html of samples) {
      expect(() =>
        assertNoRawHtmlRelativeAssets(html, '/content/home/zh.md'),
      ).toThrow(/ASSET_RAW_HTML_RELATIVE|raw HTML/i)
    }
  })

  it('rejects raw HTML source/href/poster relative attributes', () => {
    const samples = [
      '<audio src="./assets/a.mp3"></audio>',
      '<a href="./assets/file.pdf">x</a>',
      '<video poster="./assets/still.webp"></video>',
      '<source src="./assets/clip.mp4">',
    ]
    for (const html of samples) {
      expect(() =>
        assertNoRawHtmlRelativeAssets(html, '/content/news/x/en.md'),
      ).toThrow(/ASSET_RAW_HTML_RELATIVE|raw HTML/i)
    }
  })

  it('allows absolute https attributes in raw HTML', () => {
    expect(() =>
      assertNoRawHtmlRelativeAssets(
        '<img src="https://cdn.example.com/a.webp" alt="x">',
        '/content/home/zh.md',
      ),
    ).not.toThrow()
  })
})
