import { createIframePlayer } from './createIframePlayer.js'

// The Apple Music embed renders at its own fixed 450px height regardless of
// the iframe height, so it uses the fixed-height kind instead of a ratio.
export const AppleMusicPlayerPlatform = createIframePlayer(
  'AppleMusicPlayerPlatform',
  'apple_music_player',
  'fixed-height',
)
