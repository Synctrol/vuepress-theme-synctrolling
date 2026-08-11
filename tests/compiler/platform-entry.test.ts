import { describe, expect, it } from 'vitest'
import {
  isDiagnosticError,
  SynctrolDiagnosticError,
} from '../../src/compiler/diagnostics'
import { validatePlatformEntry } from '../../src/compiler/platform-entry'
import type {
  ContentDefinitions,
  PlatformCategory,
  PlatformDefinition,
} from '../../src/shared/types'

const path = '/content/releases/example/book.yml'

function createDefinitions(
  entries: Record<string, PlatformDefinition>,
): ContentDefinitions {
  const platforms = Object.create(null) as Record<string, PlatformDefinition>
  for (const key of Object.keys(entries)) {
    Object.defineProperty(platforms, key, {
      configurable: true,
      enumerable: true,
      value: entries[key],
      writable: true,
    })
  }
  return {
    tags: Object.create(null) as ContentDefinitions['tags'],
    platforms,
  }
}

const defs = createDefinitions({
  store: { category: 'physical', type: 'link', name: 'Store' },
  audio: { category: 'digital', type: 'audio_player', name: 'Audio' },
  youtube: {
    category: 'digital',
    type: 'youtube_player',
    name: 'YouTube',
  },
  bilibili: {
    category: 'digital',
    type: 'bilibili_player',
    name: 'Bilibili',
  },
  apple: {
    category: 'digital',
    type: 'apple_music_player',
    name: 'Apple Music',
  },
  spotify: {
    category: 'digital',
    type: 'spotify_player',
    name: 'Spotify',
  },
  soundcloud: {
    category: 'digital',
    type: 'soundcloud_player',
    name: 'SoundCloud',
  },
  netease: {
    category: 'digital',
    type: 'netease_player',
    name: 'Netease',
  },
  custom: {
    category: 'digital',
    type: 'vendor/custom-player',
    name: 'Custom',
  },
})

function validate(
  entry: unknown,
  category: PlatformCategory = 'digital',
  definitions = defs,
) {
  return validatePlatformEntry(entry, definitions, 'zh', path, category)
}

function expectDiagnostic(
  action: () => unknown,
  code: string,
  message?: string,
): void {
  try {
    action()
    expect.unreachable('should have thrown')
  } catch (error) {
    expect(error).toBeInstanceOf(SynctrolDiagnosticError)
    expect(isDiagnosticError(error)).toBe(true)
    if (isDiagnosticError(error)) {
      expect(error.diagnostics).toHaveLength(1)
      expect(error.diagnostics[0]).toMatchObject({
        severity: 'error',
        code,
        path,
      })
      expect(error.diagnostics[0].message).toEqual(expect.any(String))
      if (message !== undefined) {
        expect(error.diagnostics[0].message).toContain(message)
      }
    }
  }
}

describe('validatePlatformEntry built-in schemas', () => {
  it.each([
    [
      'link',
      { platform: 'store', url: 'https://shop.example/item?sku=1#buy' },
      'physical' as const,
      {
        platform: 'store',
        url: 'https://shop.example/item?sku=1#buy',
      },
    ],
    [
      'audio_player',
      {
        platform: 'audio',
        src: './assets/disc/song.flac',
        mime: 'audio/flac',
      },
      'digital' as const,
      {
        platform: 'audio',
        src: './assets/disc/song.flac',
        mime: 'audio/flac',
        autoplay: false,
      },
    ],
    [
      'youtube_player',
      {
        platform: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        start: 0,
        autoplay: true,
      },
      'digital' as const,
      {
        platform: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        start: 0,
        autoplay: true,
      },
    ],
    [
      'bilibili_player',
      { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', page: 1 },
      'digital' as const,
      {
        platform: 'bilibili',
        bvid: 'BV1xxxxxxxxx',
        page: 1,
        autoplay: false,
      },
    ],
    [
      'apple_music_player',
      {
        platform: 'apple',
        url: 'https://music.apple.com/us/album/example/123',
      },
      'digital' as const,
      {
        platform: 'apple',
        url: 'https://music.apple.com/us/album/example/123',
      },
    ],
    [
      'spotify_player',
      { platform: 'spotify', uri: 'spotify:album:4aawyAB9vmqN3uQ7FjRGTy' },
      'digital' as const,
      {
        platform: 'spotify',
        uri: 'spotify:album:4aawyAB9vmqN3uQ7FjRGTy',
      },
    ],
    [
      'soundcloud_player',
      {
        platform: 'soundcloud',
        url: 'https://soundcloud.com/artist/track',
      },
      'digital' as const,
      {
        platform: 'soundcloud',
        url: 'https://soundcloud.com/artist/track',
      },
    ],
    [
      'netease_player',
      { platform: 'netease', id: '00123', resourceType: 'playlist' },
      'digital' as const,
      {
        platform: 'netease',
        id: '00123',
        resourceType: 'playlist',
      },
    ],
  ])('normalizes valid %s entries', (_type, raw, category, expected) => {
    const normalized = validate(raw, category)

    expect(normalized).toEqual(expected)
    expect(Object.values(normalized)).not.toContain(undefined)
  })

  it('accepts null-prototype mappings with own non-enumerable data fields', () => {
    const entry = Object.create(null) as Record<string, unknown>
    Object.defineProperties(entry, {
      platform: { value: 'store' },
      url: { value: 'https://shop.example/item' },
    })

    expect(validate(entry, 'physical')).toEqual({
      platform: 'store',
      url: 'https://shop.example/item',
    })
  })

  it('defaults every supported autoplay field to false and omits other absent optionals', () => {
    const audio = validate({ platform: 'audio', src: './assets/song.mp3' })
    const youtube = validate({
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
    })
    const bilibili = validate({
      platform: 'bilibili',
      bvid: 'BV1xxxxxxxxx',
    })

    expect(audio).toEqual({
      platform: 'audio',
      src: './assets/song.mp3',
      autoplay: false,
    })
    expect(youtube).toEqual({
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      autoplay: false,
    })
    expect(bilibili).toEqual({
      platform: 'bilibili',
      bvid: 'BV1xxxxxxxxx',
      autoplay: false,
    })
  })

  it('preserves an explicit empty scalar label and copies locale-map labels', () => {
    const empty = validate(
      { platform: 'store', label: '', url: 'https://shop.example/item' },
      'physical',
    )
    const inputLabel = { zh: '购买', en: 'Buy' }
    const localized = validate({
      platform: 'audio',
      label: inputLabel,
      src: './assets/song.mp3',
    })

    expect(empty).toEqual({
      platform: 'store',
      label: '',
      url: 'https://shop.example/item',
    })
    expect(localized.label).toEqual({ zh: '购买', en: 'Buy' })
    expect(localized.label).not.toBe(inputLabel)

    inputLabel.zh = '已修改'
    expect(localized.label).toEqual({ zh: '购买', en: 'Buy' })
  })

  it('omits label so callers can fall back to the platform definition name', () => {
    const normalized = validate(
      { platform: 'store', url: 'https://shop.example/item' },
      'physical',
    )

    expect(Object.hasOwn(normalized, 'label')).toBe(false)
    expect(defs.platforms.store.name).toBe('Store')
  })

  it('isolates normalized output from later input mutation', () => {
    const input = {
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      start: 30,
      label: { zh: '视频' },
    }
    const normalized = validate(input)

    input.platform = 'soundcloud'
    input.videoId = 'aaaaaaaaaaa'
    input.start = 99
    input.label.zh = '修改'

    expect(normalized).toEqual({
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      start: 30,
      autoplay: false,
      label: { zh: '视频' },
    })
  })
})

describe('validatePlatformEntry mapping and registry safety', () => {
  it.each([
    ['null', null],
    ['array', []],
    ['date', new Date(0)],
    ['class instance', new (class Entry {})()],
    ['function', () => undefined],
  ])('rejects a %s entry instead of a plain mapping', (_label, entry) => {
    expectDiagnostic(
      () => validate(entry),
      'INVALID_PLATFORM_ENTRY',
      'plain mapping',
    )
  })

  it('reads only own data fields and never invokes accessors', () => {
    let getterCalled = false
    const entry = {
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
    }
    Object.defineProperty(entry, 'start', {
      enumerable: true,
      get() {
        getterCalled = true
        return 0
      },
    })

    expectDiagnostic(
      () => validate(entry),
      'INVALID_PLATFORM_ENTRY',
      'own data properties',
    )
    expect(getterCalled).toBe(false)
  })

  it('does not let Object.prototype.value disguise an accessor as a data field', () => {
    const original = Object.getOwnPropertyDescriptor(Object.prototype, 'value')
    const entry = {
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
    }
    Object.defineProperty(entry, 'start', {
      enumerable: true,
      get() {
        return 30
      },
    })
    Object.defineProperty(Object.prototype, 'value', {
      configurable: true,
      value: 0,
      writable: true,
    })

    let caught: unknown
    try {
      validate(entry)
    } catch (error) {
      caught = error
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(Object.prototype, 'value')
      } else {
        Object.defineProperty(Object.prototype, 'value', original)
      }
    }

    expectDiagnostic(
      () => {
        throw caught
      },
      'INVALID_PLATFORM_ENTRY',
      'own data properties',
    )
  })

  it('does not accept inherited entry fields', () => {
    const original = Object.getOwnPropertyDescriptor(
      Object.prototype,
      'platform',
    )
    Object.defineProperty(Object.prototype, 'platform', {
      configurable: true,
      value: 'youtube',
      writable: true,
    })

    try {
      expectDiagnostic(
        () => validate({ videoId: 'dQw4w9WgXcQ' }),
        'INVALID_PLATFORM_ENTRY',
        'platform',
      )
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(Object.prototype, 'platform')
      } else {
        Object.defineProperty(Object.prototype, 'platform', original)
      }
    }
  })

  it('converts reflection trap failures into structured diagnostics', () => {
    const entry = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error('reflection secret')
        },
      },
    )

    expectDiagnostic(
      () => validate(entry),
      'INVALID_PLATFORM_ENTRY',
      'inspected safely',
    )
  })

  it.each([
    ['missing platform', { url: 'https://example.com' }],
    ['empty platform', { platform: '', url: 'https://example.com' }],
    ['numeric platform', { platform: 1, url: 'https://example.com' }],
  ])('rejects %s', (_label, entry) => {
    expectDiagnostic(
      () => validate(entry),
      'INVALID_PLATFORM_ENTRY',
      'platform',
    )
  })

  it('rejects undeclared platforms and inherited definitions', () => {
    expectDiagnostic(
      () => validate({ platform: 'missing', url: 'https://example.com' }),
      'UNKNOWN_PLATFORM',
      '"missing"',
    )
    expectDiagnostic(
      () =>
        validate(
          { platform: 'constructor', url: 'https://example.com' },
          'digital',
          {
            tags: {},
            platforms: {},
          },
        ),
      'UNKNOWN_PLATFORM',
      '"constructor"',
    )

    const inheritedPlatforms = Object.create({
      ghost: {
        category: 'digital',
        type: 'link',
        name: 'Ghost',
      },
    }) as Record<string, PlatformDefinition>
    expectDiagnostic(
      () =>
        validate(
          { platform: 'ghost', url: 'https://example.com' },
          'digital',
          { tags: {}, platforms: inheritedPlatforms },
        ),
      'UNKNOWN_PLATFORM',
      '"ghost"',
    )
  })

  it('rejects category mismatches before validating type-specific fields', () => {
    expectDiagnostic(
      () =>
        validate(
          { platform: 'store', url: 'not checked first' },
          'digital',
        ),
      'PLATFORM_CATEGORY_MISMATCH',
      'physical but digital is required',
    )
  })

  it('leaves custom definitions for Plan 07 registration', () => {
    expectDiagnostic(
      () => validate({ platform: 'custom' }),
      'UNKNOWN_PLATFORM_TYPE',
      'vendor/custom-player',
    )
  })

  const entriesByType = [
    [
      'link',
      { platform: 'store', url: 'https://shop.example/item' },
      'physical' as const,
    ],
    [
      'audio_player',
      { platform: 'audio', src: './assets/song.mp3' },
      'digital' as const,
    ],
    [
      'youtube_player',
      { platform: 'youtube', videoId: 'dQw4w9WgXcQ' },
      'digital' as const,
    ],
    [
      'bilibili_player',
      { platform: 'bilibili', bvid: 'BV1xxxxxxxxx' },
      'digital' as const,
    ],
    [
      'apple_music_player',
      { platform: 'apple', url: 'https://music.apple.com/us/album/x/1' },
      'digital' as const,
    ],
    [
      'spotify_player',
      { platform: 'spotify', uri: 'spotify:track:abc123' },
      'digital' as const,
    ],
    [
      'soundcloud_player',
      { platform: 'soundcloud', url: 'https://soundcloud.com/artist/track' },
      'digital' as const,
    ],
    [
      'netease_player',
      { platform: 'netease', id: '1', resourceType: 'song' },
      'digital' as const,
    ],
  ] as const

  it.each(entriesByType)('rejects unknown %s fields', (_type, valid, category) => {
    expectDiagnostic(
      () => validate({ ...valid, unexpected: true }, category),
      'UNKNOWN_FIELD',
      '"unexpected"',
    )
  })

  it('rejects non-enumerable and symbol unknown fields', () => {
    const nonEnumerable = {
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
    }
    Object.defineProperty(nonEnumerable, 'hidden', { value: true })
    expectDiagnostic(
      () => validate(nonEnumerable),
      'UNKNOWN_FIELD',
      '"hidden"',
    )

    const symbolField = {
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      [Symbol('hidden')]: true,
    }
    expectDiagnostic(
      () => validate(symbolField),
      'UNKNOWN_FIELD',
      'Symbol(hidden)',
    )
  })
})

describe('validatePlatformEntry URL and asset constraints', () => {
  it.each([
    ['HTTP', 'http://example.com/item', 'absolute HTTPS URL'],
    ['relative', './item', 'absolute HTTPS URL'],
    ['protocol-relative', '//example.com/item', 'absolute HTTPS URL'],
    ['opaque HTTPS spelling', 'https:example.com/item', 'absolute HTTPS URL'],
    ['missing hostname', 'https:///', 'absolute HTTPS URL'],
    [
      'credentials',
      'https://user:password@example.com/item',
      'credentials',
    ],
    ['leading whitespace', ' https://example.com/item', 'absolute HTTPS URL'],
    ['trailing whitespace', 'https://example.com/item ', 'absolute HTTPS URL'],
    ['embedded control', 'https://example.com/\u0000item', 'absolute HTTPS URL'],
    ['malformed port', 'https://example.com:bad/item', 'absolute HTTPS URL'],
  ])('rejects %s link URLs with a structured diagnostic', (_label, url, message) => {
    expectDiagnostic(
      () => validate({ platform: 'store', url }, 'physical'),
      'INVALID_PLATFORM_ENTRY',
      message,
    )
  })

  it.each([
    ['subdomain spoof', 'https://music.apple.com.evil.example/album/1'],
    ['suffix spoof', 'https://evil-music.apple.com/album/1'],
    ['trailing-dot host', 'https://music.apple.com./album/1'],
  ])('rejects Apple Music %s', (_label, url) => {
    expectDiagnostic(
      () => validate({ platform: 'apple', url }),
      'INVALID_PLATFORM_ENTRY',
      'music.apple.com',
    )
  })

  it.each([
    ['subdomain spoof', 'https://soundcloud.com.evil.example/track'],
    ['suffix spoof', 'https://evil-soundcloud.com/track'],
    ['trailing-dot host', 'https://soundcloud.com./track'],
  ])('rejects SoundCloud %s', (_label, url) => {
    expectDiagnostic(
      () => validate({ platform: 'soundcloud', url }),
      'INVALID_PLATFORM_ENTRY',
      'soundcloud.com',
    )
  })

  it('rejects credentials before provider hostname checks', () => {
    expectDiagnostic(
      () =>
        validate({
          platform: 'apple',
          url: 'https://music.apple.com@evil.example/album/1',
        }),
      'INVALID_PLATFORM_ENTRY',
      'credentials',
    )
  })

  it.each([
    ['empty', ''],
    ['dot directory only', './'],
    ['parent-relative', '../assets/song.mp3'],
    ['root-absolute', '/assets/song.mp3'],
    ['bare relative', 'assets/song.mp3'],
    ['Windows-relative', '.\\assets\\song.mp3'],
    ['backslash', './assets\\song.mp3'],
    ['literal traversal', './assets/../secret.mp3'],
    ['encoded traversal', './assets/%2e%2e/secret.mp3'],
    ['double-encoded traversal', './assets/%252e%252e/secret.mp3'],
    ['query', './assets/song.mp3?download=1'],
    ['hash', './assets/song.mp3#clip'],
  ])('rejects %s audio asset paths', (_label, src) => {
    expectDiagnostic(
      () => validate({ platform: 'audio', src }),
      'INVALID_PLATFORM_ENTRY',
      'package-relative asset or absolute HTTPS URL',
    )
  })

  it('accepts a strict absolute HTTPS audio source unchanged', () => {
    const src = 'https://cdn.example.com/audio/song.mp3?version=1#clip'

    expect(validate({ platform: 'audio', src })).toEqual({
      platform: 'audio',
      src,
      autoplay: false,
    })
  })

  it.each([
    ['empty', ''],
    ['prefix only', 'audio/'],
    ['wrong top-level type', 'video/mp4'],
    ['surrounding whitespace', ' audio/mpeg'],
    ['embedded whitespace', 'audio/m peg'],
  ])('rejects %s audio MIME values', (_label, mime) => {
    expectDiagnostic(
      () =>
        validate({
          platform: 'audio',
          src: './assets/song.mp3',
          mime,
        }),
      'INVALID_PLATFORM_ENTRY',
      'audio_player.mime',
    )
  })
})

describe('validatePlatformEntry scalar constraints', () => {
  it.each([
    ['youtube short ID', { platform: 'youtube', videoId: 'short' }],
    [
      'youtube invalid character',
      { platform: 'youtube', videoId: 'dQw4w9WgXc!' },
    ],
    ['bilibili short bvid', { platform: 'bilibili', bvid: 'BV123' }],
    [
      'bilibili invalid character',
      { platform: 'bilibili', bvid: 'BV1xxxxxxxx!' },
    ],
  ])('rejects %s', (_label, entry) => {
    expectDiagnostic(
      () => validate(entry),
      'INVALID_PLATFORM_ENTRY',
    )
  })

  it.each([
    ['negative youtube start', { platform: 'youtube', videoId: 'dQw4w9WgXcQ', start: -1 }],
    ['fractional youtube start', { platform: 'youtube', videoId: 'dQw4w9WgXcQ', start: 0.5 }],
    ['NaN youtube start', { platform: 'youtube', videoId: 'dQw4w9WgXcQ', start: Number.NaN }],
    ['infinite youtube start', { platform: 'youtube', videoId: 'dQw4w9WgXcQ', start: Number.POSITIVE_INFINITY }],
    ['zero bilibili page', { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', page: 0 }],
    ['negative bilibili page', { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', page: -1 }],
    ['fractional bilibili page', { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', page: 1.5 }],
  ])('rejects %s numeric boundaries', (_label, entry) => {
    expectDiagnostic(
      () => validate(entry),
      'INVALID_PLATFORM_ENTRY',
    )
  })

  it.each([
    ['audio_player', { platform: 'audio', src: './assets/song.mp3', autoplay: 1 }],
    ['youtube_player', { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: 'false' }],
    ['bilibili_player', { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', autoplay: null }],
  ])('rejects non-boolean %s autoplay', (_type, entry) => {
    expectDiagnostic(
      () => validate(entry),
      'INVALID_PLATFORM_ENTRY',
      'autoplay must be boolean',
    )
  })

  it.each([
    ['missing subtype', 'spotify:track:'],
    ['unsupported kind', 'spotify:artist:abc'],
    ['whitespace ID', 'spotify:album:   '],
    ['nested separator', 'spotify:playlist:abc:def'],
  ])('rejects Spotify URI with %s', (_label, uri) => {
    expectDiagnostic(
      () => validate({ platform: 'spotify', uri }),
      'INVALID_PLATFORM_ENTRY',
      'spotify_player.uri',
    )
  })

  it.each([
    ['empty id', { platform: 'netease', id: '', resourceType: 'song' }],
    ['numeric id', { platform: 'netease', id: 1, resourceType: 'song' }],
    ['signed id', { platform: 'netease', id: '-1', resourceType: 'song' }],
    ['unsupported resource', { platform: 'netease', id: '1', resourceType: 'artist' }],
    ['missing resource', { platform: 'netease', id: '1' }],
  ])('rejects Netease %s', (_label, entry) => {
    expectDiagnostic(
      () => validate(entry),
      'INVALID_PLATFORM_ENTRY',
    )
  })

  it('requires the main locale in label maps', () => {
    expectDiagnostic(
      () =>
        validate({
          platform: 'audio',
          label: { en: 'Listen' },
          src: './assets/song.mp3',
        }),
      'MISSING_MAIN_LOCALE',
      'label',
    )
  })
})
