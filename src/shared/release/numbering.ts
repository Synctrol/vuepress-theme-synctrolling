import type { Disc, Multilanguage, Track } from '../types.js'
export { formatMessage } from '../format-message.js'

export interface NumberedTrack {
  number: number
  anchor: string
  title: Multilanguage
  artists: string[]
  durationSeconds: number
  durationLabel: string
  desc?: Multilanguage
  copyright?: string
}

export interface NumberedDisc {
  number: number
  anchor: string
  title: Multilanguage
  desc?: Multilanguage
  tracks: NumberedTrack[]
}

export function formatTrackDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  const rem = whole % 60
  return `${minutes}:${String(rem).padStart(2, '0')}`
}

export function numberDiscs(discs: Disc[]): NumberedDisc[] {
  return discs.map((disc, discIndex) => {
    const discNumber = discIndex + 1
    const discAnchor = `disc-${discNumber}`
    return {
      number: discNumber,
      anchor: discAnchor,
      title: disc.title,
      ...(disc.desc !== undefined ? { desc: disc.desc } : {}),
      tracks: disc.tracks.map((track: Track, trackIndex) => {
        const trackNumber = trackIndex + 1
        return {
          number: trackNumber,
          anchor: `${discAnchor}-track-${trackNumber}`,
          title: track.title,
          artists: track.artists,
          durationSeconds: track.duration,
          durationLabel: formatTrackDuration(track.duration),
          ...(track.desc !== undefined ? { desc: track.desc } : {}),
          ...(track.copyright !== undefined
            ? { copyright: track.copyright }
            : {}),
        }
      }),
    }
  })
}
