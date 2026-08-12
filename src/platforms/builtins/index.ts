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
