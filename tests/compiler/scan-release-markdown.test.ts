import { describe, expect, it } from 'vitest'
import { scanReleaseMarkdown } from '../../src/compiler/scan-release-markdown'

describe('scanReleaseMarkdown', () => {
  it('extracts unique album src paths and Player attributes', () => {
    const sourcePath = '/content/releases/demo/zh.md'
    const result = scanReleaseMarkdown(
      [
        '<AlbumIdentity src="./album.yml" />',
        '<AlbumTracklist src="./album.yml"></AlbumTracklist>',
        "<AlbumCredit src='./credits.yml' />",
        '<AlbumCovers src="./album.yml" />',
        '<Player type="netease_player" url="https://music.163.com/#/album?id=123" />',
        '<Player type="youtube_player" videoId="abcdefghijk" autoplay="false" />',
      ].join('\n'),
      sourcePath,
    )

    expect(result.albumSrcPaths).toEqual([
      './album.yml',
      './credits.yml',
    ])
    expect(result.players).toEqual([
      {
        type: 'netease_player',
        attrs: {
          url: 'https://music.163.com/#/album?id=123',
        },
        sourcePath,
        line: 5,
      },
      {
        type: 'youtube_player',
        attrs: {
          videoId: 'abcdefghijk',
          autoplay: 'false',
        },
        sourcePath,
        line: 6,
      },
    ])
  })

  it('ignores Album and Player components inside HTML comments', () => {
    const result = scanReleaseMarkdown(
      [
        '<!-- <Player type="removed_player" /> -->',
        '<!--',
        '<AlbumIdentity src="./removed-album.yml" />',
        '-->',
        '<AlbumIdentity src="./album.yml" />',
        '<Player type="audio_player" src="./preview.mp3" />',
      ].join('\n'),
      '/content/releases/demo/zh.md',
    )

    expect(result.albumSrcPaths).toEqual(['./album.yml'])
    expect(result.players).toEqual([
      {
        type: 'audio_player',
        attrs: { src: './preview.mp3' },
        sourcePath: '/content/releases/demo/zh.md',
        line: 6,
      },
    ])
  })

  it('rejects Album components without a static src', () => {
    expect(() =>
      scanReleaseMarkdown(
        '<AlbumIdentity />',
        '/content/releases/demo/zh.md',
      ),
    ).toThrow(/AlbumIdentity.*src/)
  })

  it('rejects Player without a static type', () => {
    expect(() =>
      scanReleaseMarkdown(
        '<Player url="https://example.com" />',
        '/content/releases/demo/zh.md',
      ),
    ).toThrow(/Player.*type/)
  })
})
