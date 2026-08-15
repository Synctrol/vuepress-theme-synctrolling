import { createIframePlayer } from './createIframePlayer.js'

// The outchain player fires a blocking `alert("资源加载失败")` when its
// (rate-limited) album/song API fetch fails; sandboxing without allow-modals
// suppresses the modal while keeping scripts, cookies, and popups working.
export const NeteasePlayerPlatform = createIframePlayer(
  'NeteasePlayerPlatform',
  'netease_player',
  'player',
  'allow-scripts allow-same-origin allow-popups',
)
