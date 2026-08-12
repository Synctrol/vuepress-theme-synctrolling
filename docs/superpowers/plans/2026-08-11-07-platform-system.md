# Platform System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the Synctrol platform entry system: built-in type schemas and renderers, custom `platforms.types` registration, interaction/viewport lazy embeds with failure fallback, accessibility titles/labels, and the merged `synctrol-csp.json` audit artifact (no CSP meta injection).

**Architecture:** Pure platform modules under `src/platforms/` own URL building, CSP origin contribution, and a type registry that merges built-ins with theme `platforms.types`. The Plan 02 compiler path `validatePlatformEntry` switches to that registry so custom types share the same flat-entry validation. Client components under `src/client/components/platforms/` lazy-load embeds per `loadStrategy` and fall back to external links. A Node hook writes `<dest>/synctrol-csp.json` after collecting origins from every visible Book platform entry.

**Tech Stack:** TypeScript, Vue 3 (`defineComponent` / `@vue/test-utils`), Vitest + `happy-dom`, Node `fs` for the CSP artifact, VuePress 2 theme hooks from Plans 01–03. Package name `vuepress-theme-synctrolling`.

## Global Constraints

- Plans 01–03 and Book data (`album.links`, `gift.items[].links`) are available; do not reimplement package discovery, locale routing, or Book branch parsing.
- Public configuration has no adapter, mode, or nested `args` object; entries are flat.
- Platform definitions contain `category: digital | physical`, `type`, and `name: Multilanguage`.
- `album.links` require digital platforms; `gift.items[].links` require physical platforms.
- Built-in types: `link`, `audio_player`, `youtube_player`, `bilibili_player`, `apple_music_player`, `spotify_player`, `soundcloud_player`, `netease_player`.
- `platforms.loadStrategy` accepts `'interaction' | 'viewport'` only; defaults to `'interaction'`; immediate loading is unsupported.
- URL validation, CSP audit output, and failure fallback cannot be disabled.
- YAML cannot provide arbitrary HTML, scripts, or iframe templates.
- First version writes `synctrol-csp.json` and must not inject a CSP meta tag.
- Platform embeds must have descriptive titles; activation and failure UI use localized `activateEmbed`, `embedFailed`, and `openExternal` messages with `{platform}`.
- Brand tokens remain fixed; platform UI uses Synctrol borders (`3px` / `1px`), square corners, black/white.

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/platforms/format-message.ts` | Replace `{name}` tokens in locale message templates |
| `src/platforms/urls.ts` | Build embed iframe `src` and external fallback URLs for built-ins |
| `src/platforms/csp.ts` | Normalize origins; merge/dedupe `frame-src` / `media-src` / `connect-src` |
| `src/platforms/registry.ts` | Resolve built-in + custom `PlatformTypeRegistration` map |
| `src/platforms/builtins/validate-helpers.ts` | Shared entry map / unknown-field / HTTPS / autoplay helpers |
| `src/platforms/builtins/index.ts` | Export built-in registrations (validate / cspOrigins / fallbackUrl / component) |
| `src/platforms/builtins/link.ts` | `link` type registration |
| `src/platforms/builtins/audio-player.ts` | `audio_player` type registration |
| `src/platforms/builtins/youtube-player.ts` | `youtube_player` type registration |
| `src/platforms/builtins/bilibili-player.ts` | `bilibili_player` type registration |
| `src/platforms/builtins/apple-music-player.ts` | `apple_music_player` type registration |
| `src/platforms/builtins/spotify-player.ts` | `spotify_player` type registration |
| `src/platforms/builtins/soundcloud-player.ts` | `soundcloud_player` type registration |
| `src/platforms/builtins/netease-player.ts` | `netease_player` type registration |
| `src/platforms/collect-csp.ts` | Walk compiled Books; call `cspOrigins` for every visible entry |
| `src/compiler/platforms/write-csp-artifact.ts` | Write `<dest>/synctrol-csp.json`; never emit CSP meta |
| `src/compiler/platform-entry.ts` | Modify: validate via registry (built-in + custom) |
| `src/shared/options.ts` | Modify: runtime-reject invalid `loadStrategy`; type `component` as Vue `Component` |
| `src/shared/types.ts` | Modify: export typed built-in entry interfaces used by renderers |
| `src/client/components/platforms/PlatformEmbed.ts` | Lazy shell: interaction / viewport / failure → external link |
| `src/client/components/platforms/PlatformLinks.ts` | List of platform entries with accessible labels |
| `src/client/components/platforms/renderers/*.ts` | Per-type renderer components (iframe/`audio`/`a`) |
| `tests/platforms/*.test.ts` | Unit tests for formatters, URLs, CSP, registry |
| `tests/compiler/platform-entry-registry.test.ts` | Custom type + category constraint tests through registry |
| `tests/client/platforms/*.test.ts` | Component tests (lazy load, failure, a11y) with `happy-dom` |
| `tests/compiler/platforms/write-csp-artifact.test.ts` | Artifact write + no meta injection |
| `vitest.config.ts` | Modify: `happy-dom` for `tests/client/**` |
| `package.json` | Modify: add `happy-dom`, `@vue/test-utils` |

**Out of scope:** Release index/detail layout (Plan 08), asset hashing of `audio_player.src` package paths (Plan 04 may resolve public URLs later; this plan accepts absolute HTTPS or opaque relative `src` strings), shell chrome, SEO.

**Assumed available:** `validatePlatformEntry` (Plan 02), `ContentDefinitions` / `PlatformDefinition`, Book parsing with digital/physical category checks, `resolveThemeOptions` with `platforms.loadStrategy` default `'interaction'`, `resolveMultilanguage`, `zhMessages` / `enMessages` keys `activateEmbed` / `embedFailed` / `openExternal` / `platformLinks`, Vitest via `npm test`.

---

### Task 1: Message formatter and typed built-in entry interfaces

**Files:**
- Create: `src/platforms/format-message.ts`
- Modify: `src/shared/types.ts`
- Test: `tests/platforms/format-message.test.ts`

**Interfaces:**
- Consumes: `LocaleMessages` keys with `{platform}` placeholders; `PlatformEntryBase` from Plan 01
- Produces: `formatMessage(template: string, vars: Record<string, string | number>): string`; typed entry interfaces `LinkEntry`, `AudioPlayerEntry`, `YouTubePlayerEntry`, `BilibiliPlayerEntry`, `AppleMusicPlayerEntry`, `SpotifyPlayerEntry`, `SoundCloudPlayerEntry`, `NeteasePlayerEntry`, and `BuiltInPlatformEntry` union

- [ ] **Step 1: Write the failing formatter test**

```ts
// tests/platforms/format-message.test.ts
import { describe, expect, it } from 'vitest'
import { formatMessage } from '../../src/platforms/format-message'
import { enMessages, zhMessages } from '../../src/shared/messages'

describe('formatMessage', () => {
  it('substitutes {platform} in activateEmbed / embedFailed / openExternal', () => {
    expect(formatMessage(enMessages.activateEmbed, { platform: 'YouTube' })).toBe(
      'Play YouTube',
    )
    expect(formatMessage(enMessages.embedFailed, { platform: 'YouTube' })).toBe(
      'YouTube failed to load',
    )
    expect(formatMessage(enMessages.openExternal, { platform: 'YouTube' })).toBe(
      'Open YouTube',
    )
    expect(formatMessage(zhMessages.activateEmbed, { platform: 'Bilibili' })).toBe(
      '播放 Bilibili',
    )
  })

  it('leaves unknown tokens intact', () => {
    expect(formatMessage('Hello {name}', { platform: 'X' })).toBe('Hello {name}')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/platforms/format-message.test.ts`

Expected: FAIL with module not found for `../../src/platforms/format-message`

- [ ] **Step 3: Implement formatter and append typed entries**

```ts
// src/platforms/format-message.ts
export function formatMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return String(vars[key])
    }
    return match
  })
}
```

Append to `src/shared/types.ts` (keep existing `PlatformEntryBase` / `NormalizedPlatformEntry`; add these exact shapes from the spec):

```ts
export type LinkEntry = PlatformEntryBase & {
  url: string
}

export type AudioPlayerEntry = PlatformEntryBase & {
  src: string
  mime?: string
  autoplay?: boolean
}

export type YouTubePlayerEntry = PlatformEntryBase & {
  videoId: string
  start?: number
  autoplay?: boolean
}

export type BilibiliPlayerEntry = PlatformEntryBase & {
  bvid: string
  page?: number
  autoplay?: boolean
}

export type AppleMusicPlayerEntry = PlatformEntryBase & {
  url: string
}

export type SpotifyPlayerEntry = PlatformEntryBase & {
  uri: string
}

export type SoundCloudPlayerEntry = PlatformEntryBase & {
  url: string
}

export type NeteasePlayerEntry = PlatformEntryBase & {
  id: string
  resourceType: 'song' | 'album' | 'playlist'
}

export type BuiltInPlatformEntry =
  | LinkEntry
  | AudioPlayerEntry
  | YouTubePlayerEntry
  | BilibiliPlayerEntry
  | AppleMusicPlayerEntry
  | SpotifyPlayerEntry
  | SoundCloudPlayerEntry
  | NeteasePlayerEntry
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/platforms/format-message.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/platforms/format-message.ts src/shared/types.ts tests/platforms/format-message.test.ts
git commit -m "feat(platforms): add message formatter and typed built-in entries"
```

---

### Task 2: Embed and fallback URL builders

**Files:**
- Create: `src/platforms/urls.ts`
- Test: `tests/platforms/urls.test.ts`

**Interfaces:**
- Consumes: typed built-in entries from Task 1
- Produces: `buildEmbedUrl(type, entry)`, `buildFallbackUrl(type, entry)` returning `string | undefined`

- [ ] **Step 1: Write the failing URL builder tests**

```ts
// tests/platforms/urls.test.ts
import { describe, expect, it } from 'vitest'
import { buildEmbedUrl, buildFallbackUrl } from '../../src/platforms/urls'

describe('buildEmbedUrl / buildFallbackUrl', () => {
  it('builds youtube embed and watch URLs', () => {
    const entry = { platform: 'youtube', videoId: 'dQw4w9WgXcQ', start: 30, autoplay: false }
    expect(buildEmbedUrl('youtube_player', entry)).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?start=30&autoplay=0',
    )
    expect(buildFallbackUrl('youtube_player', entry)).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    )
  })

  it('builds bilibili player and video page URLs', () => {
    const entry = {
      platform: 'bilibili',
      bvid: 'BV1xxxxxxxxx',
      page: 2,
      autoplay: true,
    }
    expect(buildEmbedUrl('bilibili_player', entry)).toBe(
      'https://player.bilibili.com/player.html?bvid=BV1xxxxxxxxx&page=2&autoplay=1',
    )
    expect(buildFallbackUrl('bilibili_player', entry)).toBe(
      'https://www.bilibili.com/video/BV1xxxxxxxxx',
    )
  })

  it('maps spotify URIs to open.spotify.com embed and page URLs', () => {
    const entry = { platform: 'spotify', uri: 'spotify:album:abc123' }
    expect(buildEmbedUrl('spotify_player', entry)).toBe(
      'https://open.spotify.com/embed/album/abc123',
    )
    expect(buildFallbackUrl('spotify_player', entry)).toBe(
      'https://open.spotify.com/album/abc123',
    )
  })

  it('rewrites apple music URLs onto embed.music.apple.com', () => {
    const entry = {
      platform: 'apple',
      url: 'https://music.apple.com/us/album/example/123',
    }
    expect(buildEmbedUrl('apple_music_player', entry)).toBe(
      'https://embed.music.apple.com/us/album/example/123',
    )
    expect(buildFallbackUrl('apple_music_player', entry)).toBe(
      'https://music.apple.com/us/album/example/123',
    )
  })

  it('builds soundcloud widget and netease outchain URLs', () => {
    const sc = {
      platform: 'soundcloud',
      url: 'https://soundcloud.com/artist/track',
    }
    expect(buildEmbedUrl('soundcloud_player', sc)).toBe(
      'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartist%2Ftrack&auto_play=false',
    )
    expect(buildFallbackUrl('soundcloud_player', sc)).toBe(
      'https://soundcloud.com/artist/track',
    )

    const ne = {
      platform: 'netease',
      id: '12345',
      resourceType: 'song' as const,
    }
    expect(buildEmbedUrl('netease_player', ne)).toBe(
      'https://music.163.com/outchain/player?type=2&id=12345&auto=0&height=66',
    )
    expect(buildFallbackUrl('netease_player', ne)).toBe(
      'https://music.163.com/#/song?id=12345',
    )
  })

  it('returns link url as fallback and no embed; audio uses src when HTTPS', () => {
    expect(buildEmbedUrl('link', { platform: 'taobao', url: 'https://item.taobao.com/x' })).toBe(
      undefined,
    )
    expect(buildFallbackUrl('link', { platform: 'taobao', url: 'https://item.taobao.com/x' })).toBe(
      'https://item.taobao.com/x',
    )
    expect(
      buildFallbackUrl('audio_player', {
        platform: 'local',
        src: 'https://cdn.example.com/a.mp3',
        autoplay: false,
      }),
    ).toBe('https://cdn.example.com/a.mp3')
    expect(
      buildFallbackUrl('audio_player', {
        platform: 'local',
        src: './assets/a.mp3',
        autoplay: false,
      }),
    ).toBe(undefined)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/platforms/urls.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Implement URL builders**

```ts
// src/platforms/urls.ts
import type {
  AppleMusicPlayerEntry,
  AudioPlayerEntry,
  BilibiliPlayerEntry,
  BuiltInPlatformType,
  LinkEntry,
  NeteasePlayerEntry,
  SoundCloudPlayerEntry,
  SpotifyPlayerEntry,
  YouTubePlayerEntry,
} from '../shared/types.js'

const NETEASE_TYPE: Record<NeteasePlayerEntry['resourceType'], number> = {
  song: 2,
  album: 1,
  playlist: 0,
}

function parseSpotifyUri(uri: string): { kind: string; id: string } | undefined {
  const match = /^spotify:(album|track|playlist):(.+)$/.exec(uri)
  if (!match) return undefined
  return { kind: match[1], id: match[2] }
}

export function buildEmbedUrl(
  type: BuiltInPlatformType,
  entry: Record<string, unknown>,
): string | undefined {
  switch (type) {
    case 'link':
      return undefined
    case 'audio_player':
      return undefined
    case 'youtube_player': {
      const e = entry as YouTubePlayerEntry
      const start = e.start ?? 0
      const autoplay = e.autoplay ? 1 : 0
      return `https://www.youtube.com/embed/${e.videoId}?start=${start}&autoplay=${autoplay}`
    }
    case 'bilibili_player': {
      const e = entry as BilibiliPlayerEntry
      const page = e.page ?? 1
      const autoplay = e.autoplay ? 1 : 0
      return `https://player.bilibili.com/player.html?bvid=${e.bvid}&page=${page}&autoplay=${autoplay}`
    }
    case 'apple_music_player': {
      const e = entry as AppleMusicPlayerEntry
      return e.url.replace(/^https:\/\/music\.apple\.com\//, 'https://embed.music.apple.com/')
    }
    case 'spotify_player': {
      const e = entry as SpotifyPlayerEntry
      const parsed = parseSpotifyUri(e.uri)
      if (!parsed) return undefined
      return `https://open.spotify.com/embed/${parsed.kind}/${parsed.id}`
    }
    case 'soundcloud_player': {
      const e = entry as SoundCloudPlayerEntry
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(e.url)}&auto_play=false`
    }
    case 'netease_player': {
      const e = entry as NeteasePlayerEntry
      const typeNum = NETEASE_TYPE[e.resourceType]
      return `https://music.163.com/outchain/player?type=${typeNum}&id=${e.id}&auto=0&height=66`
    }
    default:
      return undefined
  }
}

export function buildFallbackUrl(
  type: BuiltInPlatformType,
  entry: Record<string, unknown>,
): string | undefined {
  switch (type) {
    case 'link':
      return (entry as LinkEntry).url
    case 'audio_player': {
      const src = (entry as AudioPlayerEntry).src
      return /^https:\/\//.test(src) ? src : undefined
    }
    case 'youtube_player':
      return `https://www.youtube.com/watch?v=${(entry as YouTubePlayerEntry).videoId}`
    case 'bilibili_player':
      return `https://www.bilibili.com/video/${(entry as BilibiliPlayerEntry).bvid}`
    case 'apple_music_player':
      return (entry as AppleMusicPlayerEntry).url
    case 'spotify_player': {
      const parsed = parseSpotifyUri((entry as SpotifyPlayerEntry).uri)
      if (!parsed) return undefined
      return `https://open.spotify.com/${parsed.kind}/${parsed.id}`
    }
    case 'soundcloud_player':
      return (entry as SoundCloudPlayerEntry).url
    case 'netease_player': {
      const e = entry as NeteasePlayerEntry
      return `https://music.163.com/#/${e.resourceType}?id=${e.id}`
    }
    default:
      return undefined
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/platforms/urls.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/platforms/urls.ts tests/platforms/urls.test.ts
git commit -m "feat(platforms): add embed and fallback URL builders"
```

---

### Task 3: CSP normalize, merge, and dedupe

**Files:**
- Create: `src/platforms/csp.ts`
- Test: `tests/platforms/csp.test.ts`

**Interfaces:**
- Consumes: origin strings from `cspOrigins()`
- Produces: `SynctrolCspJson`, `normalizeOrigin(urlOrOrigin: string): string | undefined`, `mergeCspDirectives(chunks: SynctrolCspChunk[]): SynctrolCspJson`, `emptyCspJson()`

- [ ] **Step 1: Write the failing CSP tests**

```ts
// tests/platforms/csp.test.ts
import { describe, expect, it } from 'vitest'
import {
  emptyCspJson,
  mergeCspDirectives,
  normalizeOrigin,
} from '../../src/platforms/csp'

describe('CSP helpers', () => {
  it('normalizes URLs to scheme+host(+non-default port) origins', () => {
    expect(normalizeOrigin('https://www.youtube.com/embed/abc')).toBe(
      'https://www.youtube.com',
    )
    expect(normalizeOrigin('https://player.bilibili.com')).toBe(
      'https://player.bilibili.com',
    )
    expect(normalizeOrigin('https://example.com:8443/path')).toBe(
      'https://example.com:8443',
    )
    expect(normalizeOrigin("'self'")).toBe("'self'")
    expect(normalizeOrigin('not a url')).toBe(undefined)
    expect(normalizeOrigin('http://insecure.example/x')).toBe(undefined)
  })

  it('merges and dedupes frame-src, media-src, and connect-src', () => {
    const merged = mergeCspDirectives([
      {
        'frame-src': ['https://www.youtube.com', 'https://player.bilibili.com'],
        'media-src': ["'self'"],
        'connect-src': [],
      },
      {
        'frame-src': ['https://www.youtube.com', 'https://open.spotify.com'],
        'media-src': ['https://cdn.example.com'],
        'connect-src': ['https://api.example.com'],
      },
    ])
    expect(merged).toEqual({
      'frame-src': [
        'https://www.youtube.com',
        'https://player.bilibili.com',
        'https://open.spotify.com',
      ],
      'media-src': ["'self'", 'https://cdn.example.com'],
      'connect-src': ['https://api.example.com'],
    })
  })

  it('starts from empty directive arrays', () => {
    expect(emptyCspJson()).toEqual({
      'frame-src': [],
      'media-src': [],
      'connect-src': [],
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/platforms/csp.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Implement CSP helpers**

```ts
// src/platforms/csp.ts
export interface SynctrolCspJson {
  'frame-src': string[]
  'media-src': string[]
  'connect-src': string[]
}

export type SynctrolCspChunk = Partial<SynctrolCspJson>

export function emptyCspJson(): SynctrolCspJson {
  return {
    'frame-src': [],
    'media-src': [],
    'connect-src': [],
  }
}

export function normalizeOrigin(urlOrOrigin: string): string | undefined {
  if (urlOrOrigin === "'self'") return "'self'"
  try {
    const url = new URL(urlOrOrigin)
    if (url.protocol !== 'https:') return undefined
    return url.origin
  } catch {
    return undefined
  }
}

function dedupeAppend(target: string[], values: string[] | undefined): void {
  if (!values) return
  for (const value of values) {
    const normalized = value === "'self'" ? value : normalizeOrigin(value) ?? value
    if (normalized !== "'self'" && !normalized.startsWith('https:') && normalized !== value) {
      continue
    }
    const origin =
      value === "'self'" ? "'self'" : normalizeOrigin(value)
    if (!origin) continue
    if (!target.includes(origin)) target.push(origin)
  }
}

export function mergeCspDirectives(chunks: SynctrolCspChunk[]): SynctrolCspJson {
  const result = emptyCspJson()
  for (const chunk of chunks) {
    dedupeAppend(result['frame-src'], chunk['frame-src'])
    dedupeAppend(result['media-src'], chunk['media-src'])
    dedupeAppend(result['connect-src'], chunk['connect-src'])
  }
  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/platforms/csp.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/platforms/csp.ts tests/platforms/csp.test.ts
git commit -m "feat(platforms): normalize and merge CSP origin directives"
```

---

### Task 4: Built-in type registrations (validate / cspOrigins / fallbackUrl)

**Files:**
- Create: `src/platforms/builtins/validate-helpers.ts`
- Create: `src/platforms/builtins/link.ts`
- Create: `src/platforms/builtins/audio-player.ts`
- Create: `src/platforms/builtins/youtube-player.ts`
- Create: `src/platforms/builtins/bilibili-player.ts`
- Create: `src/platforms/builtins/apple-music-player.ts`
- Create: `src/platforms/builtins/spotify-player.ts`
- Create: `src/platforms/builtins/soundcloud-player.ts`
- Create: `src/platforms/builtins/netease-player.ts`
- Create: `src/platforms/builtins/index.ts`
- Create: `src/client/components/platforms/renderers/placeholders.ts` (temporary stub components; replaced in Tasks 8–9)
- Modify: `src/shared/options.ts` (`PlatformTypeRegistration.component` typed as `import type { Component } from 'vue'`)
- Test: `tests/platforms/builtins.test.ts`

**Interfaces:**
- Consumes: URL builders (Task 2), typed entries (Task 1), `fail` diagnostics from Plan 02
- Produces: `builtInPlatformTypes: Record<BuiltInPlatformType, PlatformTypeRegistration>` where each registration exposes `validate`, `cspOrigins`, optional `fallbackUrl`, and a stub `component`

- [ ] **Step 1: Write the failing built-in registration tests**

```ts
// tests/platforms/builtins.test.ts
import { describe, expect, it } from 'vitest'
import { builtInPlatformTypes } from '../../src/platforms/builtins'
import { isDiagnosticError } from '../../src/compiler/diagnostics'

describe('builtInPlatformTypes', () => {
  it('registers all eight built-in types', () => {
    expect(Object.keys(builtInPlatformTypes).sort()).toEqual([
      'apple_music_player',
      'audio_player',
      'bilibili_player',
      'link',
      'netease_player',
      'soundcloud_player',
      'spotify_player',
      'youtube_player',
    ])
  })

  it('validates youtube videoId and contributes youtube frame-src', () => {
    const reg = builtInPlatformTypes.youtube_player
    const entry = reg.validate({
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      start: 0,
      autoplay: false,
    })
    expect(entry).toMatchObject({ videoId: 'dQw4w9WgXcQ', autoplay: false })
    expect(reg.cspOrigins(entry)).toEqual(['https://www.youtube.com'])
    expect(reg.fallbackUrl?.(entry)).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    )
  })

  it('rejects invalid bilibili bvid with a diagnostic', () => {
    try {
      builtInPlatformTypes.bilibili_player.validate({
        platform: 'bilibili',
        bvid: 'bad',
      })
      expect.unreachable('should throw')
    } catch (error) {
      expect(isDiagnosticError(error)).toBe(true)
    }
  })

  it('requires apple music HTTPS on music.apple.com and spotify URI shapes', () => {
    expect(() =>
      builtInPlatformTypes.apple_music_player.validate({
        platform: 'apple',
        url: 'https://example.com/x',
      }),
    ).toThrow()
    expect(() =>
      builtInPlatformTypes.spotify_player.validate({
        platform: 'spotify',
        uri: 'spotify:artist:x',
      }),
    ).toThrow()
    const spotify = builtInPlatformTypes.spotify_player.validate({
      platform: 'spotify',
      uri: 'spotify:track:abc',
    })
    expect(builtInPlatformTypes.spotify_player.cspOrigins(spotify)).toEqual([
      'https://open.spotify.com',
    ])
  })

  it('defaults autoplay to false and checks audio mime prefix', () => {
    const audio = builtInPlatformTypes.audio_player.validate({
      platform: 'host',
      src: './assets/a.mp3',
    })
    expect(audio).toMatchObject({ src: './assets/a.mp3', autoplay: false })
    expect(builtInPlatformTypes.audio_player.cspOrigins(audio)).toEqual(["'self'"])
    expect(() =>
      builtInPlatformTypes.audio_player.validate({
        platform: 'host',
        src: 'https://cdn.example.com/a.mp3',
        mime: 'video/mp4',
      }),
    ).toThrow()
    const remote = builtInPlatformTypes.audio_player.validate({
      platform: 'host',
      src: 'https://cdn.example.com/a.mp3',
      mime: 'audio/mpeg',
    })
    expect(builtInPlatformTypes.audio_player.cspOrigins(remote)).toEqual([
      'https://cdn.example.com',
    ])
  })

  it('validates netease id digits and resourceType', () => {
    const entry = builtInPlatformTypes.netease_player.validate({
      platform: 'netease',
      id: '99',
      resourceType: 'playlist',
    })
    expect(builtInPlatformTypes.netease_player.cspOrigins(entry)).toEqual([
      'https://music.163.com',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/platforms/builtins.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Implement built-in registrations with stub components**

Also create: `src/platforms/builtins/validate-helpers.ts`

Field constraints (identical to Plan 02 / spec):

- `link.url`: absolute HTTPS URL
- `audio_player.src`: non-empty string (package-relative or absolute HTTPS); `mime` when present must start with `audio/`; `autoplay` boolean default `false`
- `youtube_player.videoId`: exactly 11 chars `[A-Za-z0-9_-]`; `start` non-negative integer; `autoplay` boolean default `false`
- `bilibili_player.bvid`: `BV` + ten ASCII letters/digits; `page` integer ≥ 1; `autoplay` boolean default `false`
- `apple_music_player.url`: HTTPS on `music.apple.com`
- `spotify_player.uri`: `spotify:album:…` | `spotify:track:…` | `spotify:playlist:…`
- `soundcloud_player.url`: HTTPS on `soundcloud.com`
- `netease_player.id`: non-empty decimal digits; `resourceType`: `song` | `album` | `playlist`

```ts
// src/platforms/builtins/validate-helpers.ts
import type { Multilanguage } from '../../shared/types.js'
import { fail } from '../../compiler/diagnostics.js'

export function asEntryMap(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail({
      severity: 'error',
      code: 'INVALID_PLATFORM_ENTRY',
      message: 'platform entry must be a mapping',
      path: 'platforms.validate',
    })
  }
  return raw as Record<string, unknown>
}

export function rejectUnknown(raw: Record<string, unknown>, allowed: string[]): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) {
      fail({
        severity: 'error',
        code: 'UNKNOWN_FIELD',
        message: `Unknown platform entry field "${key}"`,
        path: 'platforms.validate',
      })
    }
  }
}

export function requirePlatformKey(entry: Record<string, unknown>): string {
  if (typeof entry.platform !== 'string') {
    fail({
      severity: 'error',
      code: 'INVALID_PLATFORM_ENTRY',
      message: 'platform key is required',
      path: 'platforms.validate',
    })
  }
  return entry.platform
}

export function optionalLabel(entry: Record<string, unknown>): Multilanguage | undefined {
  return entry.label === undefined ? undefined : (entry.label as Multilanguage)
}

export function assertHttpsUrl(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^https:\/\//.test(value)) {
    fail({
      severity: 'error',
      code: 'INVALID_PLATFORM_ENTRY',
      message: `${field} must be an absolute HTTPS URL`,
      path: 'platforms.validate',
    })
  }
  return value
}

export function assertAutoplay(value: unknown): boolean {
  const autoplay = value === undefined ? false : value
  if (typeof autoplay !== 'boolean') {
    fail({
      severity: 'error',
      code: 'INVALID_PLATFORM_ENTRY',
      message: 'autoplay must be boolean',
      path: 'platforms.validate',
    })
  }
  return autoplay
}
```

```ts
// src/client/components/platforms/renderers/placeholders.ts
import { defineComponent, h } from 'vue'

export function createStubRenderer(name: string) {
  return defineComponent({
    name,
    props: {
      entry: { type: Object, required: true },
      title: { type: String, required: true },
    },
    setup(props) {
      return () => h('div', { 'data-platform-stub': name, title: props.title })
    },
  })
}
```

```ts
// src/platforms/builtins/link.ts
import type { Component } from 'vue'
import type { LinkEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { buildFallbackUrl } from '../urls.js'
import { createStubRenderer } from '../../client/components/platforms/renderers/placeholders.js'
import {
  asEntryMap,
  assertHttpsUrl,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const linkType: PlatformTypeRegistration<LinkEntry> = {
  validate(raw: unknown): LinkEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'url'])
    const platform = requirePlatformKey(entry)
    const label = optionalLabel(entry)
    return {
      platform,
      ...(label !== undefined ? { label } : {}),
      url: assertHttpsUrl(entry.url, 'url'),
    }
  },
  component: createStubRenderer('LinkPlatform') as Component,
  cspOrigins() {
    return []
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('link', entry)
  },
}
```

```ts
// src/platforms/builtins/audio-player.ts
import type { Component } from 'vue'
import type { AudioPlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { fail } from '../../compiler/diagnostics.js'
import { buildFallbackUrl } from '../urls.js'
import { createStubRenderer } from '../../client/components/platforms/renderers/placeholders.js'
import {
  asEntryMap,
  assertAutoplay,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const audioPlayerType: PlatformTypeRegistration<AudioPlayerEntry> = {
  validate(raw: unknown): AudioPlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'src', 'mime', 'autoplay'])
    const platform = requirePlatformKey(entry)
    if (typeof entry.src !== 'string' || entry.src.length === 0) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_ENTRY',
        message: 'audio_player.src is required',
        path: 'platforms.validate',
      })
    }
    if (
      entry.mime !== undefined &&
      (typeof entry.mime !== 'string' || !entry.mime.startsWith('audio/'))
    ) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_ENTRY',
        message: 'audio_player.mime must start with audio/',
        path: 'platforms.validate',
      })
    }
    const label = optionalLabel(entry)
    return {
      platform,
      ...(label !== undefined ? { label } : {}),
      src: entry.src,
      ...(entry.mime !== undefined ? { mime: entry.mime as string } : {}),
      autoplay: assertAutoplay(entry.autoplay),
    }
  },
  component: createStubRenderer('AudioPlayerPlatform') as Component,
  cspOrigins(entry) {
    if (/^https:\/\//.test(entry.src)) {
      return [new URL(entry.src).origin]
    }
    return ["'self'"]
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('audio_player', entry)
  },
}
```

```ts
// src/platforms/builtins/youtube-player.ts
import type { Component } from 'vue'
import type { YouTubePlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { fail } from '../../compiler/diagnostics.js'
import { buildFallbackUrl } from '../urls.js'
import { createStubRenderer } from '../../client/components/platforms/renderers/placeholders.js'
import {
  asEntryMap,
  assertAutoplay,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const youtubePlayerType: PlatformTypeRegistration<YouTubePlayerEntry> = {
  validate(raw: unknown): YouTubePlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'videoId', 'start', 'autoplay'])
    const platform = requirePlatformKey(entry)
    if (typeof entry.videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(entry.videoId)) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_ENTRY',
        message: 'youtube_player.videoId must be exactly 11 [A-Za-z0-9_-] characters',
        path: 'platforms.validate',
      })
    }
    if (
      entry.start !== undefined &&
      (typeof entry.start !== 'number' || !Number.isInteger(entry.start) || entry.start < 0)
    ) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_ENTRY',
        message: 'youtube_player.start must be a non-negative integer',
        path: 'platforms.validate',
      })
    }
    const label = optionalLabel(entry)
    return {
      platform,
      ...(label !== undefined ? { label } : {}),
      videoId: entry.videoId,
      ...(entry.start !== undefined ? { start: entry.start as number } : {}),
      autoplay: assertAutoplay(entry.autoplay),
    }
  },
  component: createStubRenderer('YouTubePlayerPlatform') as Component,
  cspOrigins() {
    return ['https://www.youtube.com']
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('youtube_player', entry)
  },
}
```

```ts
// src/platforms/builtins/bilibili-player.ts
import type { Component } from 'vue'
import type { BilibiliPlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { fail } from '../../compiler/diagnostics.js'
import { buildFallbackUrl } from '../urls.js'
import { createStubRenderer } from '../../client/components/platforms/renderers/placeholders.js'
import {
  asEntryMap,
  assertAutoplay,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const bilibiliPlayerType: PlatformTypeRegistration<BilibiliPlayerEntry> = {
  validate(raw: unknown): BilibiliPlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'bvid', 'page', 'autoplay'])
    const platform = requirePlatformKey(entry)
    if (typeof entry.bvid !== 'string' || !/^BV[A-Za-z0-9]{10}$/.test(entry.bvid)) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_ENTRY',
        message: 'bilibili_player.bvid must be BV followed by ten ASCII letters or digits',
        path: 'platforms.validate',
      })
    }
    if (
      entry.page !== undefined &&
      (typeof entry.page !== 'number' || !Number.isInteger(entry.page) || entry.page < 1)
    ) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_ENTRY',
        message: 'bilibili_player.page must be an integer >= 1',
        path: 'platforms.validate',
      })
    }
    const label = optionalLabel(entry)
    return {
      platform,
      ...(label !== undefined ? { label } : {}),
      bvid: entry.bvid,
      ...(entry.page !== undefined ? { page: entry.page as number } : {}),
      autoplay: assertAutoplay(entry.autoplay),
    }
  },
  component: createStubRenderer('BilibiliPlayerPlatform') as Component,
  cspOrigins() {
    return ['https://player.bilibili.com']
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('bilibili_player', entry)
  },
}
```

```ts
// src/platforms/builtins/apple-music-player.ts
import type { Component } from 'vue'
import type { AppleMusicPlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { fail } from '../../compiler/diagnostics.js'
import { buildFallbackUrl } from '../urls.js'
import { createStubRenderer } from '../../client/components/platforms/renderers/placeholders.js'
import {
  asEntryMap,
  assertHttpsUrl,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const appleMusicPlayerType: PlatformTypeRegistration<AppleMusicPlayerEntry> = {
  validate(raw: unknown): AppleMusicPlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'url'])
    const platform = requirePlatformKey(entry)
    const url = assertHttpsUrl(entry.url, 'url')
    if (!/^https:\/\/music\.apple\.com\//.test(url)) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_ENTRY',
        message: 'apple_music_player.url must be HTTPS on music.apple.com',
        path: 'platforms.validate',
      })
    }
    const label = optionalLabel(entry)
    return { platform, ...(label !== undefined ? { label } : {}), url }
  },
  component: createStubRenderer('AppleMusicPlayerPlatform') as Component,
  cspOrigins() {
    return ['https://embed.music.apple.com']
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('apple_music_player', entry)
  },
}
```

```ts
// src/platforms/builtins/spotify-player.ts
import type { Component } from 'vue'
import type { SpotifyPlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { fail } from '../../compiler/diagnostics.js'
import { buildFallbackUrl } from '../urls.js'
import { createStubRenderer } from '../../client/components/platforms/renderers/placeholders.js'
import {
  asEntryMap,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const spotifyPlayerType: PlatformTypeRegistration<SpotifyPlayerEntry> = {
  validate(raw: unknown): SpotifyPlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'uri'])
    const platform = requirePlatformKey(entry)
    if (
      typeof entry.uri !== 'string' ||
      !/^spotify:(album|track|playlist):/.test(entry.uri)
    ) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_ENTRY',
        message: 'spotify_player.uri must be spotify:album|track|playlist:…',
        path: 'platforms.validate',
      })
    }
    const label = optionalLabel(entry)
    return { platform, ...(label !== undefined ? { label } : {}), uri: entry.uri }
  },
  component: createStubRenderer('SpotifyPlayerPlatform') as Component,
  cspOrigins() {
    return ['https://open.spotify.com']
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('spotify_player', entry)
  },
}
```

```ts
// src/platforms/builtins/soundcloud-player.ts
import type { Component } from 'vue'
import type { SoundCloudPlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { fail } from '../../compiler/diagnostics.js'
import { buildFallbackUrl } from '../urls.js'
import { createStubRenderer } from '../../client/components/platforms/renderers/placeholders.js'
import {
  asEntryMap,
  assertHttpsUrl,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const soundcloudPlayerType: PlatformTypeRegistration<SoundCloudPlayerEntry> = {
  validate(raw: unknown): SoundCloudPlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'url'])
    const platform = requirePlatformKey(entry)
    const url = assertHttpsUrl(entry.url, 'url')
    if (!/^https:\/\/soundcloud\.com\//.test(url)) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_ENTRY',
        message: 'soundcloud_player.url must be HTTPS on soundcloud.com',
        path: 'platforms.validate',
      })
    }
    const label = optionalLabel(entry)
    return { platform, ...(label !== undefined ? { label } : {}), url }
  },
  component: createStubRenderer('SoundCloudPlayerPlatform') as Component,
  cspOrigins() {
    return ['https://w.soundcloud.com']
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('soundcloud_player', entry)
  },
}
```

```ts
// src/platforms/builtins/netease-player.ts
import type { Component } from 'vue'
import type { NeteasePlayerEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { fail } from '../../compiler/diagnostics.js'
import { buildFallbackUrl } from '../urls.js'
import { createStubRenderer } from '../../client/components/platforms/renderers/placeholders.js'
import {
  asEntryMap,
  optionalLabel,
  rejectUnknown,
  requirePlatformKey,
} from './validate-helpers.js'

export const neteasePlayerType: PlatformTypeRegistration<NeteasePlayerEntry> = {
  validate(raw: unknown): NeteasePlayerEntry {
    const entry = asEntryMap(raw)
    rejectUnknown(entry, ['platform', 'label', 'id', 'resourceType'])
    const platform = requirePlatformKey(entry)
    if (typeof entry.id !== 'string' || !/^\d+$/.test(entry.id)) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_ENTRY',
        message: 'netease_player.id must be a non-empty decimal digit string',
        path: 'platforms.validate',
      })
    }
    if (
      entry.resourceType !== 'song' &&
      entry.resourceType !== 'album' &&
      entry.resourceType !== 'playlist'
    ) {
      fail({
        severity: 'error',
        code: 'INVALID_PLATFORM_ENTRY',
        message: 'netease_player.resourceType must be song|album|playlist',
        path: 'platforms.validate',
      })
    }
    const label = optionalLabel(entry)
    return {
      platform,
      ...(label !== undefined ? { label } : {}),
      id: entry.id,
      resourceType: entry.resourceType,
    }
  },
  component: createStubRenderer('NeteasePlayerPlatform') as Component,
  cspOrigins() {
    return ['https://music.163.com']
  },
  fallbackUrl(entry) {
    return buildFallbackUrl('netease_player', entry)
  },
}
```

```ts
// src/platforms/builtins/index.ts
import type { BuiltInPlatformType } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { linkType } from './link.js'
import { audioPlayerType } from './audio-player.js'
import { youtubePlayerType } from './youtube-player.js'
import { bilibiliPlayerType } from './bilibili-player.js'
import { appleMusicPlayerType } from './apple-music-player.js'
import { spotifyPlayerType } from './spotify-player.js'
import { soundcloudPlayerType } from './soundcloud-player.js'
import { neteasePlayerType } from './netease-player.js'

export const builtInPlatformTypes: Record<
  BuiltInPlatformType,
  PlatformTypeRegistration
> = {
  link: linkType,
  audio_player: audioPlayerType,
  youtube_player: youtubePlayerType,
  bilibili_player: bilibiliPlayerType,
  apple_music_player: appleMusicPlayerType,
  spotify_player: spotifyPlayerType,
  soundcloud_player: soundcloudPlayerType,
  netease_player: neteasePlayerType,
}
```

Update `PlatformTypeRegistration` in `src/shared/options.ts`:

```ts
import type { Component } from 'vue'

export interface PlatformTypeRegistration<T extends PlatformEntryBase = PlatformEntryBase> {
  validate(entry: unknown): T
  component: Component
  cspOrigins(entry: T): string[]
  fallbackUrl?(entry: T): string | undefined
}
```

`audio_player.cspOrigins` returns `["'self'"]` for relative `src` and `[origin]` for absolute HTTPS `src`. Task 5 maps audio origins into `media-src` and iframe player origins into `frame-src`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/platforms/builtins.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/platforms/builtins src/client/components/platforms/renderers/placeholders.ts src/shared/options.ts tests/platforms/builtins.test.ts
git commit -m "feat(platforms): register built-in platform type validators and CSP origins"
```

(Includes `src/platforms/builtins/validate-helpers.ts` and all eight builtin registration modules.)

---

### Task 5: Platform type registry and compiler integration

**Files:**
- Create: `src/platforms/registry.ts`
- Create: `src/platforms/collect-csp.ts`
- Modify: `src/compiler/platform-entry.ts`
- Modify: `src/shared/options.ts` (reject `loadStrategy` other than `interaction` \| `viewport`)
- Test: `tests/platforms/registry.test.ts`
- Test: `tests/compiler/platform-entry-registry.test.ts`
- Test: `tests/platforms/collect-csp.test.ts`

**Interfaces:**
- Consumes: `builtInPlatformTypes`, theme `platforms.types`, `ContentDefinitions`, Plan 02 `validatePlatformEntry` signature
- Produces: `resolvePlatformTypes(custom): PlatformTypesConfig`; `validatePlatformEntry(..., types?)` uses registry; `collectCspFromEntries(entries, types): SynctrolCspJson`

- [ ] **Step 1: Write failing registry / compiler / collect tests**

```ts
// tests/platforms/registry.test.ts
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { resolvePlatformTypes } from '../../src/platforms/registry'
import { builtInPlatformTypes } from '../../src/platforms/builtins'

describe('resolvePlatformTypes', () => {
  it('returns built-ins when custom map is empty', () => {
    const types = resolvePlatformTypes({})
    expect(types.youtube_player).toBe(builtInPlatformTypes.youtube_player)
  })

  it('allows custom types and forbids overriding built-in type names', () => {
    const custom = {
      bandcamp_player: {
        validate(entry: unknown) {
          const e = entry as { platform: string; url: string }
          if (!e.url?.startsWith('https://')) throw new Error('bad')
          return e
        },
        component: defineComponent({ setup: () => () => h('div') }),
        cspOrigins: () => ['https://bandcamp.com'],
        fallbackUrl: (e: { url: string }) => e.url,
      },
    }
    const types = resolvePlatformTypes(custom)
    expect(types.bandcamp_player.cspOrigins({ platform: 'bc', url: 'https://bandcamp.com/x' })).toEqual([
      'https://bandcamp.com',
    ])
    expect(() =>
      resolvePlatformTypes({
        youtube_player: custom.bandcamp_player,
      }),
    ).toThrow(/built-in/)
  })
})
```

```ts
// tests/compiler/platform-entry-registry.test.ts
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { validatePlatformEntry } from '../../src/compiler/platform-entry'
import { resolvePlatformTypes } from '../../src/platforms/registry'
import type { ContentDefinitions } from '../../src/shared/types'
import { isDiagnosticError } from '../../src/compiler/diagnostics'

const defs: ContentDefinitions = {
  tags: {},
  platforms: {
    bilibili: { category: 'digital', type: 'bilibili_player', name: 'Bilibili' },
    taobao: {
      category: 'physical',
      type: 'link',
      name: { zh: '淘宝', en: 'Taobao' },
    },
    bandcamp: { category: 'digital', type: 'bandcamp_player', name: 'Bandcamp' },
  },
}

describe('validatePlatformEntry with registry', () => {
  it('still enforces album digital / gift physical categories', () => {
    expect(() =>
      validatePlatformEntry(
        { platform: 'taobao', url: 'https://item.taobao.com/example' },
        defs,
        'zh',
        '/book.yml',
        'digital',
      ),
    ).toThrow(/PLATFORM_CATEGORY_MISMATCH|digital/)

    expect(
      validatePlatformEntry(
        { platform: 'taobao', url: 'https://item.taobao.com/example' },
        defs,
        'zh',
        '/book.yml',
        'physical',
      ),
    ).toMatchObject({ platform: 'taobao', url: 'https://item.taobao.com/example' })
  })

  it('validates custom registered types and errors on unknown types', () => {
    const types = resolvePlatformTypes({
      bandcamp_player: {
        validate(entry: unknown) {
          const e = entry as { platform: string; url: string }
          if (typeof e.url !== 'string' || !e.url.startsWith('https://')) {
            throw Object.assign(new Error('invalid bandcamp'), {
              diagnostics: [
                {
                  severity: 'error',
                  code: 'INVALID_PLATFORM_ENTRY',
                  message: 'bandcamp url required',
                  path: '/book.yml',
                },
              ],
            })
          }
          return e
        },
        component: defineComponent({ setup: () => () => h('div') }),
        cspOrigins: () => ['https://bandcamp.com'],
        fallbackUrl: (e: { url: string }) => e.url,
      },
    })

    const entry = validatePlatformEntry(
      { platform: 'bandcamp', url: 'https://bandcamp.com/album/x' },
      defs,
      'zh',
      '/content/releases/a/book.yml',
      'digital',
      types,
    )
    expect(entry).toMatchObject({
      platform: 'bandcamp',
      url: 'https://bandcamp.com/album/x',
    })

    try {
      validatePlatformEntry(
        { platform: 'bandcamp', url: 'http://insecure' },
        defs,
        'zh',
        '/content/releases/a/book.yml',
        'digital',
        types,
      )
      expect.unreachable('should throw')
    } catch (error) {
      expect(isDiagnosticError(error) || error instanceof Error).toBe(true)
    }
  })
})
```

```ts
// tests/platforms/collect-csp.test.ts
import { describe, expect, it } from 'vitest'
import { collectCspFromEntries } from '../../src/platforms/collect-csp'
import { resolvePlatformTypes } from '../../src/platforms/registry'

describe('collectCspFromEntries', () => {
  it('merges frame-src for players and media-src for audio', () => {
    const types = resolvePlatformTypes({})
    const csp = collectCspFromEntries(
      [
        {
          type: 'youtube_player',
          entry: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
        },
        {
          type: 'audio_player',
          entry: { platform: 'host', src: 'https://cdn.example.com/a.mp3', autoplay: false },
        },
        {
          type: 'bilibili_player',
          entry: { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', autoplay: false },
        },
      ],
      types,
    )
    expect(csp['frame-src']).toEqual([
      'https://www.youtube.com',
      'https://player.bilibili.com',
    ])
    expect(csp['media-src']).toEqual(['https://cdn.example.com'])
    expect(csp['connect-src']).toEqual([])
  })
})
```

Also extend `tests/shared/options.test.ts` with:

```ts
it('rejects immediate platform loadStrategy', () => {
  expect(() =>
    resolveThemeOptions({
      ...base,
      platforms: { loadStrategy: 'immediate' as 'interaction', types: {} },
    }),
  ).toThrow(/loadStrategy/)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/platforms/registry.test.ts tests/compiler/platform-entry-registry.test.ts tests/platforms/collect-csp.test.ts tests/shared/options.test.ts
```

Expected: FAIL on missing registry/collect modules and/or missing `types` parameter / loadStrategy guard

- [ ] **Step 3: Implement registry, collect, and refactor platform-entry**

```ts
// src/platforms/registry.ts
import { builtInPlatformTypes } from './builtins/index.js'
import type { PlatformTypeRegistration, PlatformTypesConfig } from '../shared/options.js'
import type { BuiltInPlatformType } from '../shared/types.js'

export type { PlatformTypesConfig }

export function resolvePlatformTypes(
  custom: Record<string, PlatformTypeRegistration> = {},
): Record<string, PlatformTypeRegistration> {
  const builtInKeys = new Set(Object.keys(builtInPlatformTypes))
  for (const key of Object.keys(custom)) {
    if (builtInKeys.has(key)) {
      throw new Error(`Cannot override built-in platform type "${key}"`)
    }
  }
  return {
    ...builtInPlatformTypes,
    ...custom,
  }
}

export function isBuiltInPlatformType(type: string): type is BuiltInPlatformType {
  return Object.prototype.hasOwnProperty.call(builtInPlatformTypes, type)
}
```

Add to `src/shared/options.ts`:

```ts
export interface PlatformTypesConfig {
  [type: string]: PlatformTypeRegistration
}
```

In `resolveThemeOptions`, after reading platforms:

```ts
const loadStrategy = input.platforms?.loadStrategy ?? 'interaction'
if (loadStrategy !== 'interaction' && loadStrategy !== 'viewport') {
  throw new Error('platforms.loadStrategy must be interaction or viewport')
}
```

Refactor `src/compiler/platform-entry.ts` so the switch body is replaced by registry lookup:

```ts
export function validatePlatformEntry(
  entry: unknown,
  defs: ContentDefinitions,
  mainLocale: LocaleKey,
  path: string,
  requiredCategory: PlatformCategory,
  types: Record<string, PlatformTypeRegistration> = resolvePlatformTypes({}),
): NormalizedPlatformEntry {
  // existing plain-object / platform key / definition / category checks unchanged
  // resolve label via assertMultilanguage unchanged
  const registration = types[definition.type]
  if (!registration) {
    fail({
      severity: 'error',
      code: 'UNKNOWN_PLATFORM_TYPE',
      message: `Unknown platform type "${definition.type}"`,
      path,
    })
  }
  try {
    const normalized = registration.validate({
      ...entry,
      platform: entry.platform,
      ...(label ? { label } : {}),
    })
    return normalized as NormalizedPlatformEntry
  } catch (error) {
    if (isDiagnosticError(error)) throw error
    fail({
      severity: 'error',
      code: 'INVALID_PLATFORM_ENTRY',
      message: error instanceof Error ? error.message : 'Invalid platform entry',
      path,
    })
  }
}
```

```ts
// src/platforms/collect-csp.ts
import type { PlatformTypeRegistration } from '../shared/options.js'
import { mergeCspDirectives, emptyCspJson, type SynctrolCspJson } from './csp.js'

export interface CspCollectable {
  type: string
  entry: Record<string, unknown>
}

export function collectCspFromEntries(
  items: CspCollectable[],
  types: Record<string, PlatformTypeRegistration>,
): SynctrolCspJson {
  const chunks = items.map(({ type, entry }) => {
    const reg = types[type]
    if (!reg) return emptyCspJson()
    const origins = reg.cspOrigins(entry as never).map(String)
    if (type === 'audio_player') {
      return { 'media-src': origins, 'frame-src': [], 'connect-src': [] }
    }
    if (type === 'link') {
      return emptyCspJson()
    }
    // v1: non-audio registration origins are audited as frame-src hosts.
    // connect-src stays empty for built-ins; custom types currently contribute
    // embed host origins through frame-src via the same cspOrigins() array.
    return {
      'frame-src': origins,
      'media-src': [],
      'connect-src': [],
    }
  })
  return mergeCspDirectives(chunks)
}
```

Ensure Book compilation (Plan 02) continues to pass `requiredCategory: 'digital'` for `album.links` and `'physical'` for `gift.items[].links`. When theme options are available to the compiler, pass `resolvePlatformTypes(options.platforms.types)` into `validatePlatformEntry`.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- tests/platforms/registry.test.ts tests/compiler/platform-entry-registry.test.ts tests/platforms/collect-csp.test.ts tests/compiler/platform-entry.test.ts tests/shared/options.test.ts
```

Expected: PASS (including Plan 02 platform-entry tests still green)

- [ ] **Step 5: Commit**

```bash
git add src/platforms/registry.ts src/platforms/collect-csp.ts src/compiler/platform-entry.ts src/shared/options.ts tests/platforms/registry.test.ts tests/compiler/platform-entry-registry.test.ts tests/platforms/collect-csp.test.ts tests/shared/options.test.ts
git commit -m "feat(platforms): wire type registry into entry validation and CSP collection"
```

---

### Task 6: Write `synctrol-csp.json` audit artifact (no meta injection)

**Files:**
- Create: `src/compiler/platforms/write-csp-artifact.ts`
- Create: `src/compiler/platforms/collect-visible-platform-entries.ts`
- Test: `tests/compiler/platforms/write-csp-artifact.test.ts`
- Test: `tests/compiler/platforms/collect-visible-platform-entries.test.ts`

**Interfaces:**
- Consumes: `collectCspFromEntries`, compiled Book data (`AlbumBook` / `GiftBook`), `resolvePlatformTypes`
- Produces: `writeSynctrolCspJson(destDir, csp): string` writing `<dest>/synctrol-csp.json`; `collectVisiblePlatformEntries(books): CspCollectable[]`; `assertNoCspMetaInjection(html: string): void`

- [ ] **Step 1: Write the failing artifact tests**

```ts
// tests/compiler/platforms/write-csp-artifact.test.ts
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
```

```ts
// tests/compiler/platforms/collect-visible-platform-entries.test.ts
import { describe, expect, it } from 'vitest'
import { collectVisiblePlatformEntries } from '../../../src/compiler/platforms/collect-visible-platform-entries'
import type { AlbumBook, GiftBook } from '../../../src/shared/types'

describe('collectVisiblePlatformEntries', () => {
  it('collects album.links as digital entries and gift item links as physical', () => {
    const album: AlbumBook = {
      type: 'album',
      title: 'A',
      album: {
        links: [
          { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
        ],
      },
    }
    const gift: GiftBook = {
      type: 'gift',
      title: 'G',
      gift: {
        items: [
          {
            id: 'poster',
            title: 'Poster',
            links: [{ platform: 'taobao', url: 'https://item.taobao.com/x' }],
          },
        ],
      },
    }
    const defs = {
      youtube: 'youtube_player',
      taobao: 'link',
    }
    const items = collectVisiblePlatformEntries(
      [
        { book: album, platformTypes: defs },
        { book: gift, platformTypes: defs },
      ],
    )
    expect(items).toEqual([
      {
        type: 'youtube_player',
        entry: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
      },
      {
        type: 'link',
        entry: { platform: 'taobao', url: 'https://item.taobao.com/x' },
      },
    ])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/compiler/platforms/write-csp-artifact.test.ts tests/compiler/platforms/collect-visible-platform-entries.test.ts
```

Expected: FAIL with module not found

- [ ] **Step 3: Implement writers and collectors**

```ts
// src/compiler/platforms/write-csp-artifact.ts
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SynctrolCspJson } from '../../platforms/csp.js'

export function writeSynctrolCspJson(destDir: string, csp: SynctrolCspJson): string {
  const path = join(destDir, 'synctrol-csp.json')
  writeFileSync(path, `${JSON.stringify(csp, null, 2)}\n`, 'utf8')
  return path
}

export function assertNoCspMetaInjection(html: string): void {
  if (/http-equiv\s*=\s*["']Content-Security-Policy["']/i.test(html)) {
    throw new Error('CSP meta injection is not supported in v1')
  }
}
```

```ts
// src/compiler/platforms/collect-visible-platform-entries.ts
import type { Book, NormalizedPlatformEntry } from '../../shared/types.js'
import type { CspCollectable } from '../../platforms/collect-csp.js'

export interface BookPlatformSource {
  book: Book
  /** Map of platform key → definition.type for entries already validated. */
  platformTypes: Record<string, string>
}

export function collectVisiblePlatformEntries(
  sources: BookPlatformSource[],
): CspCollectable[] {
  const items: CspCollectable[] = []
  for (const { book, platformTypes } of sources) {
    if (book.type === 'album') {
      for (const entry of book.album.links ?? []) {
        push(items, entry, platformTypes)
      }
    } else {
      for (const giftItem of book.gift.items) {
        for (const entry of giftItem.links ?? []) {
          push(items, entry, platformTypes)
        }
      }
    }
  }
  return items
}

function push(
  items: CspCollectable[],
  entry: NormalizedPlatformEntry,
  platformTypes: Record<string, string>,
): void {
  const type = platformTypes[entry.platform]
  if (!type) return
  items.push({ type, entry: entry as Record<string, unknown> })
}
```

Wire from the theme build hook (extend `synctrolTheme` / Plan 03 site compile orchestration when available):

```ts
const types = resolvePlatformTypes(resolved.platforms.types)
const entries = collectVisiblePlatformEntries(sources)
const csp = collectCspFromEntries(entries, types)
writeSynctrolCspJson(app.dir.dest(), csp)
// Log a one-line build summary: `synctrol-csp.json: N frame-src, M media-src, K connect-src`
// Do not call any HTML transformer that inserts CSP meta.
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- tests/compiler/platforms/write-csp-artifact.test.ts tests/compiler/platforms/collect-visible-platform-entries.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compiler/platforms/write-csp-artifact.ts src/compiler/platforms/collect-visible-platform-entries.ts tests/compiler/platforms/write-csp-artifact.test.ts tests/compiler/platforms/collect-visible-platform-entries.test.ts
git commit -m "feat(platforms): write synctrol-csp.json audit artifact without CSP meta"
```

---

### Task 7: Configure client test harness and PlatformEmbed shell

**Files:**
- Modify: `package.json` (add `happy-dom`, `@vue/test-utils`)
- Modify: `vitest.config.ts`
- Create: `src/client/components/platforms/PlatformEmbed.ts`
- Test: `tests/client/platforms/platform-embed.test.ts`

**Interfaces:**
- Consumes: `loadStrategy`, `formatMessage`, registration `component` + `fallbackUrl`, locale messages
- Produces: `PlatformEmbed` Vue component props `{ entry, typeRegistration, platformName, loadStrategy, messages }` with states `idle | loading | ready | failed`

- [ ] **Step 1: Install client test deps and write failing embed tests**

```bash
npm install -D happy-dom @vue/test-utils
```

Update `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [['tests/client/**', 'happy-dom']],
  },
})
```

```ts
// tests/client/platforms/platform-embed.test.ts
import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { PlatformEmbed } from '../../../src/client/components/platforms/PlatformEmbed'
import { enMessages } from '../../../src/shared/messages'

const FakePlayer = defineComponent({
  name: 'FakePlayer',
  props: {
    entry: { type: Object, required: true },
    title: { type: String, required: true },
  },
  emits: ['error'],
  setup(props) {
    return () =>
      h('iframe', {
        title: props.title,
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      })
  },
})

const messages = {
  activateEmbed: enMessages.activateEmbed,
  embedFailed: enMessages.embedFailed,
  openExternal: enMessages.openExternal,
}

describe('PlatformEmbed', () => {
  it('interaction strategy shows activate control and loads only after click', async () => {
    const wrapper = mount(PlatformEmbed, {
      props: {
        entry: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
        platformName: 'YouTube',
        loadStrategy: 'interaction',
        messages,
        typeRegistration: {
          validate: (e: unknown) => e,
          component: FakePlayer,
          cspOrigins: () => ['https://www.youtube.com'],
          fallbackUrl: () => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      },
    })
    expect(wrapper.find('iframe').exists()).toBe(false)
    const button = wrapper.get('button')
    expect(button.text()).toBe('Play YouTube')
    expect(button.attributes('aria-label')).toBe('Play YouTube')
    await button.trigger('click')
    await flushPromises()
    expect(wrapper.find('iframe').exists()).toBe(true)
    expect(wrapper.find('iframe').attributes('title')).toBe('YouTube')
  })

  it('viewport strategy loads when intersecting', async () => {
    let observerCallback: IntersectionObserverCallback = () => {}
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          observerCallback = cb
        }
        observe() {}
        disconnect() {}
        unobserve() {}
        takeRecords() {
          return []
        }
        root = null
        rootMargin = ''
        thresholds = []
      },
    )

    const wrapper = mount(PlatformEmbed, {
      props: {
        entry: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
        platformName: 'YouTube',
        loadStrategy: 'viewport',
        messages,
        typeRegistration: {
          validate: (e: unknown) => e,
          component: FakePlayer,
          cspOrigins: () => ['https://www.youtube.com'],
          fallbackUrl: () => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      },
      attachTo: document.body,
    })
    expect(wrapper.find('iframe').exists()).toBe(false)
    observerCallback(
      [{ isIntersecting: true, target: wrapper.element } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
    await nextTick()
    await flushPromises()
    expect(wrapper.find('iframe').exists()).toBe(true)
    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('failure falls back to external link when fallbackUrl exists', async () => {
    const Broken = defineComponent({
      name: 'BrokenPlayer',
      props: {
        entry: { type: Object, required: true },
        title: { type: String, required: true },
      },
      emits: ['error'],
      setup(_, { emit }) {
        emit('error')
        return () => h('div')
      },
    })
    const wrapper = mount(PlatformEmbed, {
      props: {
        entry: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
        platformName: 'YouTube',
        loadStrategy: 'interaction',
        messages,
        typeRegistration: {
          validate: (e: unknown) => e,
          component: Broken,
          cspOrigins: () => ['https://www.youtube.com'],
          fallbackUrl: () => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      },
    })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(link.text()).toContain('YouTube failed to load')
    expect(link.attributes('aria-label')).toBe('Open YouTube')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/platforms/platform-embed.test.ts`

Expected: FAIL with module not found for `PlatformEmbed`

- [ ] **Step 3: Implement PlatformEmbed**

```ts
// src/client/components/platforms/PlatformEmbed.ts
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PropType } from 'vue'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { formatMessage } from '../../platforms/format-message.js'

type LoadStrategy = 'interaction' | 'viewport'

export const PlatformEmbed = defineComponent({
  name: 'PlatformEmbed',
  props: {
    entry: { type: Object, required: true },
    platformName: { type: String, required: true },
    loadStrategy: { type: String as PropType<LoadStrategy>, required: true },
    messages: {
      type: Object as PropType<{
        activateEmbed: string
        embedFailed: string
        openExternal: string
      }>,
      required: true,
    },
    typeRegistration: {
      type: Object as PropType<PlatformTypeRegistration>,
      required: true,
    },
  },
  setup(props) {
    const state = ref<'idle' | 'ready' | 'failed'>('idle')
    const root = ref<HTMLElement | null>(null)
    let observer: IntersectionObserver | null = null

    const activateLabel = computed(() =>
      formatMessage(props.messages.activateEmbed, { platform: props.platformName }),
    )
    const failedLabel = computed(() =>
      formatMessage(props.messages.embedFailed, { platform: props.platformName }),
    )
    const openLabel = computed(() =>
      formatMessage(props.messages.openExternal, { platform: props.platformName }),
    )
    const fallbackUrl = computed(
      () => props.typeRegistration.fallbackUrl?.(props.entry as never) ?? undefined,
    )

    function activate() {
      if (state.value !== 'idle') return
      state.value = 'ready'
    }

    function onError() {
      state.value = 'failed'
    }

    onMounted(() => {
      if (props.loadStrategy !== 'viewport' || !root.value) return
      observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          activate()
          observer?.disconnect()
        }
      })
      observer.observe(root.value)
    })

    onBeforeUnmount(() => observer?.disconnect())

    watch(
      () => props.loadStrategy,
      () => {
        /* strategy is fixed per mount in v1 */
      },
    )

    return () => {
      const children = []
      if (state.value === 'idle' && props.loadStrategy === 'interaction') {
        children.push(
          h(
            'button',
            {
              type: 'button',
              class: 'syn-platform-embed__activate',
              'aria-label': activateLabel.value,
              onClick: activate,
            },
            activateLabel.value,
          ),
        )
      }
      if (state.value === 'idle' && props.loadStrategy === 'viewport') {
        children.push(h('div', { class: 'syn-platform-embed__sentinel', 'aria-hidden': 'true' }))
      }
      if (state.value === 'ready') {
        children.push(
          h(props.typeRegistration.component, {
            entry: props.entry,
            title: props.platformName,
            onError,
          }),
        )
      }
      if (state.value === 'failed') {
        if (fallbackUrl.value) {
          children.push(
            h(
              'a',
              {
                class: 'syn-platform-embed__fallback',
                href: fallbackUrl.value,
                target: '_blank',
                rel: 'noopener noreferrer',
                'aria-label': openLabel.value,
              },
              failedLabel.value,
            ),
          )
        } else {
          children.push(
            h('p', { class: 'syn-platform-embed__failed', role: 'status' }, failedLabel.value),
          )
        }
      }
      return h('div', { class: 'syn-platform-embed', ref: root }, children)
    }
  },
})
```

`link` and non-embed types still go through `PlatformLinks` (Task 10), which may render `link` directly without lazy iframe activation. Embeddable types always use `PlatformEmbed`. Immediate loading remains impossible because `loadStrategy` cannot be `immediate`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/platforms/platform-embed.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/client/components/platforms/PlatformEmbed.ts tests/client/platforms/platform-embed.test.ts
git commit -m "feat(platforms): add PlatformEmbed lazy shell with failure fallback"
```

---

### Task 8: Link and audio renderer components

**Files:**
- Create: `src/client/components/platforms/renderers/LinkPlatform.ts`
- Create: `src/client/components/platforms/renderers/AudioPlayerPlatform.ts`
- Modify: `src/platforms/builtins/link.ts` (real component)
- Modify: `src/platforms/builtins/audio-player.ts` (real component)
- Test: `tests/client/platforms/link-audio-renderers.test.ts`

**Interfaces:**
- Consumes: `LinkEntry`, `AudioPlayerEntry`, accessible `title` prop
- Produces: renderers that emit no arbitrary HTML from YAML; `link` is an `<a>`; `audio_player` is `<audio controls>`

- [ ] **Step 1: Write failing renderer tests**

```ts
// tests/client/platforms/link-audio-renderers.test.ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { LinkPlatform } from '../../../src/client/components/platforms/renderers/LinkPlatform'
import { AudioPlayerPlatform } from '../../../src/client/components/platforms/renderers/AudioPlayerPlatform'

describe('link and audio renderers', () => {
  it('renders an external link with safe rel and accessible name', () => {
    const wrapper = mount(LinkPlatform, {
      props: {
        entry: { platform: 'taobao', url: 'https://item.taobao.com/x' },
        title: '淘宝',
      },
    })
    const a = wrapper.get('a')
    expect(a.attributes('href')).toBe('https://item.taobao.com/x')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toBe('noopener noreferrer')
    expect(a.attributes('aria-label')).toBe('淘宝')
    expect(a.text()).toBe('淘宝')
  })

  it('renders audio with title and optional mime type source', () => {
    const wrapper = mount(AudioPlayerPlatform, {
      props: {
        entry: {
          platform: 'host',
          src: 'https://cdn.example.com/a.mp3',
          mime: 'audio/mpeg',
          autoplay: false,
        },
        title: 'Audio',
      },
    })
    const audio = wrapper.get('audio')
    expect(audio.attributes('controls')).toBeDefined()
    expect(audio.attributes('title')).toBe('Audio')
    expect(audio.attributes('aria-label')).toBe('Audio')
    expect(wrapper.get('source').attributes('src')).toBe('https://cdn.example.com/a.mp3')
    expect(wrapper.get('source').attributes('type')).toBe('audio/mpeg')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/platforms/link-audio-renderers.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Implement renderers and wire into builtins**

```ts
// src/client/components/platforms/renderers/LinkPlatform.ts
import { defineComponent, h } from 'vue'

export const LinkPlatform = defineComponent({
  name: 'LinkPlatform',
  props: {
    entry: { type: Object, required: true },
    title: { type: String, required: true },
  },
  setup(props) {
    return () =>
      h(
        'a',
        {
          class: 'syn-platform-link',
          href: String(props.entry.url),
          target: '_blank',
          rel: 'noopener noreferrer',
          'aria-label': props.title,
        },
        props.title,
      )
  },
})
```

```ts
// src/client/components/platforms/renderers/AudioPlayerPlatform.ts
import { defineComponent, h } from 'vue'

export const AudioPlayerPlatform = defineComponent({
  name: 'AudioPlayerPlatform',
  props: {
    entry: { type: Object, required: true },
    title: { type: String, required: true },
  },
  emits: ['error'],
  setup(props, { emit }) {
    return () =>
      h(
        'audio',
        {
          class: 'syn-platform-audio',
          controls: true,
          preload: 'none',
          title: props.title,
          'aria-label': props.title,
          onError: () => emit('error'),
        },
        [
          h('source', {
            src: String(props.entry.src),
            ...(props.entry.mime ? { type: String(props.entry.mime) } : {}),
          }),
        ],
      )
  },
})
```

Replace stub `component` values in `link.ts` and `audio-player.ts` with these components. Do not set `autoplay` on the `<audio>` element from entry in v1 when `loadStrategy` gates activation; if authors set `autoplay: true`, apply it only after `PlatformEmbed` has activated (pass through as `autoplay` attribute only then).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/platforms/link-audio-renderers.test.ts tests/platforms/builtins.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/platforms/renderers/LinkPlatform.ts src/client/components/platforms/renderers/AudioPlayerPlatform.ts src/platforms/builtins/link.ts src/platforms/builtins/audio-player.ts tests/client/platforms/link-audio-renderers.test.ts
git commit -m "feat(platforms): add link and audio_player renderers"
```

---

### Task 9: Iframe player renderers (YouTube, Bilibili, Apple Music, Spotify, SoundCloud, Netease)

**Files:**
- Create: `src/client/components/platforms/renderers/YouTubePlayerPlatform.ts`
- Create: `src/client/components/platforms/renderers/BilibiliPlayerPlatform.ts`
- Create: `src/client/components/platforms/renderers/AppleMusicPlayerPlatform.ts`
- Create: `src/client/components/platforms/renderers/SpotifyPlayerPlatform.ts`
- Create: `src/client/components/platforms/renderers/SoundCloudPlayerPlatform.ts`
- Create: `src/client/components/platforms/renderers/NeteasePlayerPlatform.ts`
- Create: `src/client/components/platforms/renderers/createIframePlayer.ts`
- Modify: corresponding `src/platforms/builtins/*-player.ts` component exports
- Delete stub usage from `placeholders.ts` once unused
- Test: `tests/client/platforms/iframe-players.test.ts`

**Interfaces:**
- Consumes: `buildEmbedUrl` from Task 2; `title` prop for iframe accessible name
- Produces: iframe renderers that whitelist `src` via URL builders only (never raw YAML HTML)

- [ ] **Step 1: Write failing iframe player tests**

```ts
// tests/client/platforms/iframe-players.test.ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { YouTubePlayerPlatform } from '../../../src/client/components/platforms/renderers/YouTubePlayerPlatform'
import { BilibiliPlayerPlatform } from '../../../src/client/components/platforms/renderers/BilibiliPlayerPlatform'
import { AppleMusicPlayerPlatform } from '../../../src/client/components/platforms/renderers/AppleMusicPlayerPlatform'
import { SpotifyPlayerPlatform } from '../../../src/client/components/platforms/renderers/SpotifyPlayerPlatform'
import { SoundCloudPlayerPlatform } from '../../../src/client/components/platforms/renderers/SoundCloudPlayerPlatform'
import { NeteasePlayerPlatform } from '../../../src/client/components/platforms/renderers/NeteasePlayerPlatform'

describe('iframe player renderers', () => {
  it('sets descriptive iframe titles and builder-owned src values', () => {
    const yt = mount(YouTubePlayerPlatform, {
      props: {
        entry: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', start: 30, autoplay: false },
        title: 'YouTube',
      },
    })
    expect(yt.get('iframe').attributes('title')).toBe('YouTube')
    expect(yt.get('iframe').attributes('src')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?start=30&autoplay=0',
    )
    expect(yt.get('iframe').attributes('loading')).toBe('lazy')
    expect(yt.get('iframe').attributes('referrerpolicy')).toBe('strict-origin-when-cross-origin')

    const bi = mount(BilibiliPlayerPlatform, {
      props: {
        entry: { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', page: 1, autoplay: false },
        title: 'Bilibili',
      },
    })
    expect(bi.get('iframe').attributes('src')).toContain('player.bilibili.com')

    const apple = mount(AppleMusicPlayerPlatform, {
      props: {
        entry: { platform: 'apple', url: 'https://music.apple.com/us/album/x/1' },
        title: 'Apple Music',
      },
    })
    expect(apple.get('iframe').attributes('src')).toBe(
      'https://embed.music.apple.com/us/album/x/1',
    )

    const spotify = mount(SpotifyPlayerPlatform, {
      props: {
        entry: { platform: 'spotify', uri: 'spotify:playlist:abc' },
        title: 'Spotify',
      },
    })
    expect(spotify.get('iframe').attributes('src')).toBe(
      'https://open.spotify.com/embed/playlist/abc',
    )

    const sc = mount(SoundCloudPlayerPlatform, {
      props: {
        entry: { platform: 'soundcloud', url: 'https://soundcloud.com/a/b' },
        title: 'SoundCloud',
      },
    })
    expect(sc.get('iframe').attributes('src')).toContain('w.soundcloud.com/player')

    const ne = mount(NeteasePlayerPlatform, {
      props: {
        entry: { platform: 'netease', id: '1', resourceType: 'album' },
        title: 'NetEase',
      },
    })
    expect(ne.get('iframe').attributes('src')).toContain('music.163.com/outchain/player')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/platforms/iframe-players.test.ts`

Expected: FAIL with module not found

- [ ] **Step 3: Implement shared iframe factory and six players**

```ts
// src/client/components/platforms/renderers/createIframePlayer.ts
import { defineComponent, h } from 'vue'
import type { BuiltInPlatformType } from '../../../shared/types.js'
import { buildEmbedUrl } from '../../../platforms/urls.js'

export function createIframePlayer(name: string, type: BuiltInPlatformType) {
  return defineComponent({
    name,
    props: {
      entry: { type: Object, required: true },
      title: { type: String, required: true },
    },
    emits: ['error'],
    setup(props, { emit }) {
      return () => {
        const src = buildEmbedUrl(type, props.entry as Record<string, unknown>)
        if (!src) {
          emit('error')
          return h('div', { class: 'syn-platform-iframe syn-platform-iframe--missing' })
        }
        return h('iframe', {
          class: 'syn-platform-iframe',
          src,
          title: props.title,
          loading: 'lazy',
          referrerpolicy: 'strict-origin-when-cross-origin',
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowfullscreen: true,
          onError: () => emit('error'),
        })
      }
    },
  })
}
```

```ts
// src/client/components/platforms/renderers/YouTubePlayerPlatform.ts
import { createIframePlayer } from './createIframePlayer.js'
export const YouTubePlayerPlatform = createIframePlayer(
  'YouTubePlayerPlatform',
  'youtube_player',
)
```

```ts
// src/client/components/platforms/renderers/BilibiliPlayerPlatform.ts
import { createIframePlayer } from './createIframePlayer.js'
export const BilibiliPlayerPlatform = createIframePlayer(
  'BilibiliPlayerPlatform',
  'bilibili_player',
)
```

```ts
// src/client/components/platforms/renderers/AppleMusicPlayerPlatform.ts
import { createIframePlayer } from './createIframePlayer.js'
export const AppleMusicPlayerPlatform = createIframePlayer(
  'AppleMusicPlayerPlatform',
  'apple_music_player',
)
```

```ts
// src/client/components/platforms/renderers/SpotifyPlayerPlatform.ts
import { createIframePlayer } from './createIframePlayer.js'
export const SpotifyPlayerPlatform = createIframePlayer(
  'SpotifyPlayerPlatform',
  'spotify_player',
)
```

```ts
// src/client/components/platforms/renderers/SoundCloudPlayerPlatform.ts
import { createIframePlayer } from './createIframePlayer.js'
export const SoundCloudPlayerPlatform = createIframePlayer(
  'SoundCloudPlayerPlatform',
  'soundcloud_player',
)
```

```ts
// src/client/components/platforms/renderers/NeteasePlayerPlatform.ts
import { createIframePlayer } from './createIframePlayer.js'
export const NeteasePlayerPlatform = createIframePlayer(
  'NeteasePlayerPlatform',
  'netease_player',
)
```

Wire real components into builtin registrations (replace stub imports):

```ts
// in src/platforms/builtins/youtube-player.ts — component field
import { YouTubePlayerPlatform } from '../../client/components/platforms/renderers/YouTubePlayerPlatform.js'
// ...
component: YouTubePlayerPlatform,
```

```ts
// in src/platforms/builtins/bilibili-player.ts — component field
import { BilibiliPlayerPlatform } from '../../client/components/platforms/renderers/BilibiliPlayerPlatform.js'
// ...
component: BilibiliPlayerPlatform,
```

```ts
// in src/platforms/builtins/apple-music-player.ts — component field
import { AppleMusicPlayerPlatform } from '../../client/components/platforms/renderers/AppleMusicPlayerPlatform.js'
// ...
component: AppleMusicPlayerPlatform,
```

```ts
// in src/platforms/builtins/spotify-player.ts — component field
import { SpotifyPlayerPlatform } from '../../client/components/platforms/renderers/SpotifyPlayerPlatform.js'
// ...
component: SpotifyPlayerPlatform,
```

```ts
// in src/platforms/builtins/soundcloud-player.ts — component field
import { SoundCloudPlayerPlatform } from '../../client/components/platforms/renderers/SoundCloudPlayerPlatform.js'
// ...
component: SoundCloudPlayerPlatform,
```

```ts
// in src/platforms/builtins/netease-player.ts — component field
import { NeteasePlayerPlatform } from '../../client/components/platforms/renderers/NeteasePlayerPlatform.js'
// ...
component: NeteasePlayerPlatform,
```

Delete `src/client/components/platforms/renderers/placeholders.ts` after no builtin module imports `createStubRenderer`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/client/platforms/iframe-players.test.ts tests/platforms/builtins.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/platforms/renderers src/platforms/builtins tests/client/platforms/iframe-players.test.ts
git commit -m "feat(platforms): add iframe player renderers with descriptive titles"
```

---

### Task 10: PlatformLinks list component (names, labels, a11y)

**Files:**
- Create: `src/client/components/platforms/PlatformLinks.ts`
- Create: `src/client/components/platforms/resolve-platform-label.ts`
- Test: `tests/client/platforms/platform-links.test.ts`
- Test: `tests/platforms/resolve-platform-label.test.ts`

**Interfaces:**
- Consumes: normalized entries, `ContentDefinitions.platforms[key].name`, optional entry `label`, `resolveMultilanguage`, `PlatformEmbed`, registry
- Produces: `PlatformLinks` section with heading from `messages.platformLinks`; each item uses entry label override or definition name; embeddable types wrap `PlatformEmbed`; `link` renders `LinkPlatform` directly

- [ ] **Step 1: Write failing label + list tests**

```ts
// tests/platforms/resolve-platform-label.test.ts
import { describe, expect, it } from 'vitest'
import { resolvePlatformLabel } from '../../src/client/components/platforms/resolve-platform-label'

describe('resolvePlatformLabel', () => {
  it('prefers entry.label then definition name via multilanguage rules', () => {
    expect(
      resolvePlatformLabel({
        entry: { platform: 'taobao', url: 'https://item.taobao.com/x', label: { zh: '店铺', en: 'Shop' } },
        definitionName: { zh: '淘宝', en: 'Taobao' },
        locale: 'en',
        mainLocale: 'zh',
      }),
    ).toEqual({ text: 'Shop', fellBack: false })

    expect(
      resolvePlatformLabel({
        entry: { platform: 'taobao', url: 'https://item.taobao.com/x' },
        definitionName: { zh: '淘宝', en: 'Taobao' },
        locale: 'en',
        mainLocale: 'zh',
      }),
    ).toEqual({ text: 'Taobao', fellBack: false })
  })
})
```

```ts
// tests/client/platforms/platform-links.test.ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { PlatformLinks } from '../../../src/client/components/platforms/PlatformLinks'
import { resolvePlatformTypes } from '../../../src/platforms/registry'
import { enMessages } from '../../../src/shared/messages'

describe('PlatformLinks', () => {
  it('renders a labeled list and uses definition names for accessibility', async () => {
    const types = resolvePlatformTypes({})
    const wrapper = mount(PlatformLinks, {
      props: {
        entries: [
          { platform: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false },
          { platform: 'taobao', url: 'https://item.taobao.com/x' },
        ],
        definitions: {
          youtube: { category: 'digital', type: 'youtube_player', name: 'YouTube' },
          taobao: {
            category: 'physical',
            type: 'link',
            name: { zh: '淘宝', en: 'Taobao' },
          },
        },
        types,
        loadStrategy: 'interaction',
        locale: 'en',
        mainLocale: 'zh',
        messages: {
          platformLinks: enMessages.platformLinks,
          activateEmbed: enMessages.activateEmbed,
          embedFailed: enMessages.embedFailed,
          openExternal: enMessages.openExternal,
        },
      },
    })
    expect(wrapper.get('.syn-platform-links__title').text()).toBe('Listen & Get')
    expect(wrapper.findAll('.syn-platform-links__item')).toHaveLength(2)
    expect(wrapper.get('a.syn-platform-link').attributes('aria-label')).toBe('Taobao')
    const activate = wrapper.get('button.syn-platform-embed__activate')
    expect(activate.attributes('aria-label')).toBe('Play YouTube')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/platforms/resolve-platform-label.test.ts tests/client/platforms/platform-links.test.ts
```

Expected: FAIL with module not found

- [ ] **Step 3: Implement label helper and PlatformLinks**

```ts
// src/client/components/platforms/resolve-platform-label.ts
import type { LocaleKey, Multilanguage, NormalizedPlatformEntry } from '../../../shared/types.js'
import { resolveMultilanguage } from '../../../shared/multilanguage.js'

export function resolvePlatformLabel(input: {
  entry: NormalizedPlatformEntry
  definitionName: Multilanguage
  locale: LocaleKey
  mainLocale: LocaleKey
}): { text: string; fellBack: boolean } {
  const value = input.entry.label ?? input.definitionName
  const resolved = resolveMultilanguage(value, input.locale, input.mainLocale)
  return { text: resolved.text, fellBack: resolved.fellBack }
}
```

```ts
// src/client/components/platforms/PlatformLinks.ts
import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import type { ContentDefinitions, LocaleKey, NormalizedPlatformEntry } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'
import { PlatformEmbed } from './PlatformEmbed.js'
import { resolvePlatformLabel } from './resolve-platform-label.js'

export const PlatformLinks = defineComponent({
  name: 'PlatformLinks',
  props: {
    entries: {
      type: Array as PropType<NormalizedPlatformEntry[]>,
      required: true,
    },
    definitions: {
      type: Object as PropType<ContentDefinitions['platforms']>,
      required: true,
    },
    types: {
      type: Object as PropType<Record<string, PlatformTypeRegistration>>,
      required: true,
    },
    loadStrategy: {
      type: String as PropType<'interaction' | 'viewport'>,
      required: true,
    },
    locale: { type: String as PropType<LocaleKey>, required: true },
    mainLocale: { type: String as PropType<LocaleKey>, required: true },
    messages: {
      type: Object as PropType<{
        platformLinks: string
        activateEmbed: string
        embedFailed: string
        openExternal: string
      }>,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h('section', { class: 'syn-platform-links', 'aria-label': props.messages.platformLinks }, [
        h('h2', { class: 'syn-platform-links__title' }, props.messages.platformLinks),
        h(
          'ul',
          { class: 'syn-platform-links__list' },
          props.entries.map((entry) => {
            const definition = props.definitions[entry.platform]
            const type = definition.type
            const registration = props.types[type]
            const label = resolvePlatformLabel({
              entry,
              definitionName: definition.name,
              locale: props.locale,
              mainLocale: props.mainLocale,
            })
            const body =
              type === 'link'
                ? h(registration.component, { entry, title: label.text })
                : h(PlatformEmbed, {
                    entry,
                    platformName: label.text,
                    loadStrategy: props.loadStrategy,
                    messages: props.messages,
                    typeRegistration: registration,
                  })
            return h('li', { class: 'syn-platform-links__item', key: entry.platform + label.text }, [
              body,
            ])
          }),
        ),
      ])
  },
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- tests/platforms/resolve-platform-label.test.ts tests/client/platforms/platform-links.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/platforms/PlatformLinks.ts src/client/components/platforms/resolve-platform-label.ts tests/platforms/resolve-platform-label.test.ts tests/client/platforms/platform-links.test.ts
git commit -m "feat(platforms): add PlatformLinks list with accessible labels"
```

---

### Task 11: Public exports, theme hook wiring, and full verification

**Files:**
- Modify: `src/index.ts` (export platform registry / CSP helpers used by sites registering custom types)
- Modify: `src/client/index.ts` (create if missing; export `PlatformLinks`, `PlatformEmbed`)
- Modify: theme `onGenerated` / compile orchestration to call CSP write from Task 6
- Test: `tests/platforms/platform-system.integration.test.ts`

**Interfaces:**
- Consumes: all prior platform modules
- Produces: documented public registration surface matching spec `platforms.types`; integration proof that digital album + physical gift entries validate, CSP merges, and embeds stay lazy

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/platforms/platform-system.integration.test.ts
import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolvePlatformTypes } from '../../src/platforms/registry'
import { validatePlatformEntry } from '../../src/compiler/platform-entry'
import { collectVisiblePlatformEntries } from '../../src/compiler/platforms/collect-visible-platform-entries'
import { collectCspFromEntries } from '../../src/platforms/collect-csp'
import {
  assertNoCspMetaInjection,
  writeSynctrolCspJson,
} from '../../src/compiler/platforms/write-csp-artifact'
import type { AlbumBook, ContentDefinitions, GiftBook } from '../../src/shared/types'
import { resolveThemeOptions } from '../../src/shared/options'

const defs: ContentDefinitions = {
  tags: {},
  platforms: {
    bilibili: { category: 'digital', type: 'bilibili_player', name: 'Bilibili' },
    youtube: { category: 'digital', type: 'youtube_player', name: 'YouTube' },
    taobao: {
      category: 'physical',
      type: 'link',
      name: { zh: '淘宝', en: 'Taobao' },
    },
  },
}

describe('platform system integration', () => {
  it('validates flat entries, writes CSP artifact, and never injects CSP meta', () => {
    const options = resolveThemeOptions({
      siteUrl: 'https://synctrol.com',
      mainLocale: 'zh',
      copyright: 'SYNCTROL',
      locales: {
        zh: { lang: 'zh-CN', label: '中文' },
        en: { lang: 'en-US', label: 'English' },
      },
      platforms: { loadStrategy: 'viewport', types: {} },
      seo: {
        name: 'Synctrol',
        description: { zh: '中文', en: 'English' },
        defaultImage: './assets/social-default.webp',
        organization: { name: 'Synctrol', logo: './assets/logo.svg' },
        collections: {
          release: {
            title: { zh: '作品', en: 'Releases' },
            description: { zh: '列表', en: 'List' },
          },
          news: {
            title: { zh: '新闻', en: 'News' },
            description: { zh: '新闻', en: 'News' },
          },
        },
      },
    })
    expect(options.platforms.loadStrategy).toBe('viewport')

    const types = resolvePlatformTypes(options.platforms.types)
    const albumLink = validatePlatformEntry(
      { platform: 'bilibili', bvid: 'BV1xxxxxxxxx', page: 1, autoplay: false },
      defs,
      'zh',
      '/content/releases/a/book.yml',
      'digital',
      types,
    )
    const giftLink = validatePlatformEntry(
      { platform: 'taobao', url: 'https://item.taobao.com/example' },
      defs,
      'zh',
      '/content/releases/a/book.yml',
      'physical',
      types,
    )

    const album: AlbumBook = {
      type: 'album',
      title: 'A',
      album: { links: [albumLink] },
    }
    const gift: GiftBook = {
      type: 'gift',
      title: 'G',
      gift: { items: [{ id: 'poster', title: 'P', links: [giftLink] }] },
    }

    const platformTypes = {
      bilibili: 'bilibili_player',
      taobao: 'link',
    }
    const collected = collectVisiblePlatformEntries([
      { book: album, platformTypes },
      { book: gift, platformTypes },
    ])
    const csp = collectCspFromEntries(collected, types)
    expect(csp['frame-src']).toContain('https://player.bilibili.com')
    expect(csp['frame-src']).not.toContain('https://item.taobao.com')

    const dest = mkdtempSync(join(tmpdir(), 'synctrol-platform-'))
    const artifact = writeSynctrolCspJson(dest, csp)
    expect(JSON.parse(readFileSync(artifact, 'utf8'))['frame-src']).toContain(
      'https://player.bilibili.com',
    )
    assertNoCspMetaInjection('<!doctype html><html><head></head><body></body></html>')
  })
})
```

- [ ] **Step 2: Run test to verify it fails if exports/hooks are incomplete**

Run: `npm test -- tests/platforms/platform-system.integration.test.ts`

Expected: FAIL only if prior tasks left gaps; otherwise proceed to wire exports and re-run

- [ ] **Step 3: Export public API and wire CSP write**

```ts
// append to src/index.ts
export { resolvePlatformTypes } from './platforms/registry.js'
export { formatMessage } from './platforms/format-message.js'
export { writeSynctrolCspJson, assertNoCspMetaInjection } from './node/platforms/write-csp-artifact.js'
export type { PlatformTypeRegistration, PlatformsOptions, PlatformTypesConfig } from './shared/options.js'
```

```ts
// src/client/index.ts
export { PlatformEmbed } from './components/platforms/PlatformEmbed.js'
export { PlatformLinks } from './components/platforms/PlatformLinks.js'
```

In the theme generated hook (same place Plan 03 writes root router HTML), after content compile:

```ts
const types = resolvePlatformTypes(resolved.platforms.types)
const sources = compiled.releasePackages
  .filter((pkg) => pkg.book)
  .map((pkg) => ({
    book: pkg.book!,
    platformTypes: Object.fromEntries(
      Object.entries(compiled.definitions.platforms).map(([key, def]) => [key, def.type]),
    ),
  }))
const csp = collectCspFromEntries(collectVisiblePlatformEntries(sources), types)
writeSynctrolCspJson(app.dir.dest(), csp)
console.log(
  `[vuepress-theme-synctrolling] synctrol-csp.json: ${csp['frame-src'].length} frame-src, ${csp['media-src'].length} media-src, ${csp['connect-src'].length} connect-src`,
)
```

Do not add any `head` / markdown HTML that inserts `Content-Security-Policy` meta.

- [ ] **Step 4: Run the full platform suite**

Run:

```bash
npm test -- tests/platforms tests/client/platforms tests/compiler/platforms tests/compiler/platform-entry.test.ts tests/compiler/platform-entry-registry.test.ts tests/shared/options.test.ts
```

Expected: PASS for every platform-system test file

- [ ] **Step 5: Commit**

```bash
git add src/index.ts src/client/index.ts tests/platforms/platform-system.integration.test.ts
git commit -m "feat(platforms): export platform API and verify CSP audit pipeline"
```

---

## Plan Self-Review

1. **Spec coverage (section 11 + related):**
   - Definitions `category` / `type` / `name Multilanguage` — assumed from Plan 02; category digital/physical enforced in Tasks 5 and 11.
   - Flat link entries (no args) — Tasks 4–5 validators reject unknown fields.
   - All eight built-in types + value constraints — Tasks 2, 4, 8, 9.
   - `album.links` digital / `gift.items[].links` physical — Tasks 5, 6, 11.
   - `loadStrategy` interaction|viewport, no immediate — Tasks 5, 7.
   - Custom `platforms.types` (`validate` / `component` / `cspOrigins` / `fallbackUrl`) — Tasks 4–5, 11.
   - Lazy embed after interaction/viewport; failure → external link — Task 7.
   - `synctrol-csp.json` merge/dedupe; no CSP meta in v1 — Tasks 3, 5, 6, 11.
   - Accessibility titles/labels — Tasks 7–10 (`iframe title`, `aria-label`, message templates).
2. **Placeholder scan:** no TBD/TODO; commands and expected outcomes specified.
3. **Type consistency:** `PlatformTypeRegistration`, `BuiltInPlatformType`, entry interfaces, `loadStrategy`, and message keys match Plan 01 / spec naming; `validatePlatformEntry` gains an optional `types` argument without breaking Plan 02 call sites (default `resolvePlatformTypes({})`).

---

**Task count:** 11  
**Key files:** `src/platforms/registry.ts`, `src/platforms/builtins/`, `src/platforms/csp.ts`, `src/platforms/urls.ts`, `src/compiler/platform-entry.ts`, `src/compiler/platforms/write-csp-artifact.ts`, `src/client/components/platforms/PlatformEmbed.ts`, `src/client/components/platforms/PlatformLinks.ts`, `src/client/components/platforms/renderers/`
