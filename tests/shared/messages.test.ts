import { describe, expect, it } from 'vitest'
import { enMessages, zhMessages } from '../../src/shared/messages'
import type { LocaleMessages } from '../../src/shared/types'

const keys = Object.keys(enMessages) as Array<keyof LocaleMessages>

describe('default locale messages', () => {
  it('exports complete chinese and english catalogs with the same keys', () => {
    expect(Object.keys(zhMessages).sort()).toEqual(keys.sort())
    expect(keys).toHaveLength(32)
  })

  it('uses the approved english translation-unavailable copy', () => {
    expect(enMessages.translationUnavailable).toBe(
      'This article is not yet available in English. Showing the original version.',
    )
  })

  it('includes the required content-facing chinese defaults', () => {
    expect(zhMessages.published).toBe('发布于')
    expect(zhMessages.updated).toBe('更新于')
    expect(zhMessages.authors).toBe('作者')
    expect(zhMessages.album).toBe('专辑')
    expect(zhMessages.tracklist).toBe('曲目列表')
    expect(zhMessages.disc).toBe('第 {number} 碟')
    expect(zhMessages.track).toBe('第 {number} 曲')
    expect(zhMessages.covers).toBe('封面')
    expect(zhMessages.platformLinks).toBe('收听与获取')
    expect(zhMessages.gifts).toBe('周边')
    expect(zhMessages.giftItems).toBe('周边清单')
    expect(zhMessages.readMore).toBe('阅读更多')
    expect(zhMessages.returnToReleases).toBe('返回作品列表')
    expect(zhMessages.emptyReleases).toBe('暂无作品')
    expect(zhMessages.emptyNews).toBe('暂无新闻')
  })
})
