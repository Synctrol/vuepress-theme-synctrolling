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
  return { kind: match[1]!, id: match[2]! }
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
      const e = entry as unknown as YouTubePlayerEntry
      const start = e.start ?? 0
      const autoplay = e.autoplay ? 1 : 0
      return `https://www.youtube.com/embed/${e.videoId}?start=${start}&autoplay=${autoplay}`
    }
    case 'bilibili_player': {
      const e = entry as unknown as BilibiliPlayerEntry
      const page = e.page ?? 1
      const autoplay = e.autoplay ? 1 : 0
      return `https://player.bilibili.com/player.html?bvid=${e.bvid}&page=${page}&autoplay=${autoplay}`
    }
    case 'apple_music_player': {
      const e = entry as unknown as AppleMusicPlayerEntry
      return e.url.replace(/^https:\/\/music\.apple\.com\//, 'https://embed.music.apple.com/')
    }
    case 'spotify_player': {
      const e = entry as unknown as SpotifyPlayerEntry
      const parsed = parseSpotifyUri(e.uri)
      if (!parsed) return undefined
      return `https://open.spotify.com/embed/${parsed.kind}/${parsed.id}`
    }
    case 'soundcloud_player': {
      const e = entry as unknown as SoundCloudPlayerEntry
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(e.url)}&auto_play=false`
    }
    case 'netease_player': {
      const e = entry as unknown as NeteasePlayerEntry
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
      return (entry as unknown as LinkEntry).url
    case 'audio_player': {
      const src = (entry as unknown as AudioPlayerEntry).src
      return /^https:\/\//.test(src) ? src : undefined
    }
    case 'youtube_player':
      return `https://www.youtube.com/watch?v=${(entry as unknown as YouTubePlayerEntry).videoId}`
    case 'bilibili_player':
      return `https://www.bilibili.com/video/${(entry as unknown as BilibiliPlayerEntry).bvid}`
    case 'apple_music_player':
      return (entry as unknown as AppleMusicPlayerEntry).url
    case 'spotify_player': {
      const parsed = parseSpotifyUri((entry as unknown as SpotifyPlayerEntry).uri)
      if (!parsed) return undefined
      return `https://open.spotify.com/${parsed.kind}/${parsed.id}`
    }
    case 'soundcloud_player':
      return (entry as unknown as SoundCloudPlayerEntry).url
    case 'netease_player': {
      const e = entry as unknown as NeteasePlayerEntry
      return `https://music.163.com/#/${e.resourceType}?id=${e.id}`
    }
    default:
      return undefined
  }
}
