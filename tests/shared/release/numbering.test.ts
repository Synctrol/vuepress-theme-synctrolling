import { describe, expect, it } from 'vitest'
import {
  formatMessage,
  formatTrackDuration,
  numberDiscs,
} from '../../../src/shared/release/numbering'
import { albumBook, enMessages, zhMessages } from '../../helpers/release-fixtures'

describe('disc and track numbering', () => {
  it('assigns 1-based display numbers and anchors from array order', () => {
    const numbered = numberDiscs(albumBook().album.discs ?? [])
    expect(numbered).toHaveLength(1)
    expect(numbered[0]).toMatchObject({
      number: 1,
      anchor: 'disc-1',
    })
    expect(numbered[0].tracks).toEqual([
      expect.objectContaining({
        number: 1,
        anchor: 'disc-1-track-1',
        durationSeconds: 272,
        durationLabel: '4:32',
      }),
      expect.objectContaining({
        number: 2,
        anchor: 'disc-1-track-2',
        durationSeconds: 61,
        durationLabel: '1:01',
      }),
    ])
  })

  it('formats duration as m:ss with zero-padded seconds', () => {
    expect(formatTrackDuration(0)).toBe('0:00')
    expect(formatTrackDuration(9)).toBe('0:09')
    expect(formatTrackDuration(60)).toBe('1:00')
    expect(formatTrackDuration(272)).toBe('4:32')
    expect(formatTrackDuration(3723)).toBe('62:03')
  })

  it('formats localized disc and track labels with 1-based numbers', () => {
    expect(formatMessage(zhMessages.disc, { number: 1 })).toBe('第 1 碟')
    expect(formatMessage(enMessages.track, { number: 2 })).toBe('Track 2')
  })

  it('preserves empty discs and empty track arrays', () => {
    const numbered = numberDiscs([
      { title: 'Empty', tracks: [] },
      {
        title: 'Second',
        tracks: [{ title: 'Only', artists: ['A'], duration: 10 }],
      },
    ])
    expect(numbered[0]).toMatchObject({ number: 1, anchor: 'disc-1', tracks: [] })
    expect(numbered[1]).toMatchObject({
      number: 2,
      anchor: 'disc-2',
      tracks: [expect.objectContaining({ number: 1, anchor: 'disc-2-track-1' })],
    })
  })
})
