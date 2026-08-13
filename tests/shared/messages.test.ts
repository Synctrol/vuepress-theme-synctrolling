import { describe, expect, it } from 'vitest'
import { enMessages, zhMessages } from '../../src/shared/messages'
import type { LocaleMessages } from '../../src/shared/types'

const keys = Object.keys(enMessages) as Array<keyof LocaleMessages>

describe('default locale messages', () => {
  it('exports complete chinese and english catalogs with the same keys', () => {
    expect(Object.keys(zhMessages).sort()).toEqual(keys.sort())
    expect(keys).toHaveLength(39)
  })

  it('uses the approved english translation-unavailable copy', () => {
    expect(enMessages.translationUnavailable).toBe(
      'This article is not yet available in English. Showing the original version.',
    )
  })

  it('includes the required content-facing chinese defaults', () => {
    expect(zhMessages.published).toBe('发布于')
    expect(zhMessages.updated).toBe('更新于')
    expect(zhMessages.album).toBe('专辑')
    expect(zhMessages.tracklist).toBe('曲目列表')
    expect(zhMessages.disc).toBe('第 {number} 碟')
    expect(zhMessages.track).toBe('第 {number} 曲')
    expect(zhMessages.covers).toBe('封面')
    expect(zhMessages.platformLinks).toBe('收听与获取')
    expect(zhMessages.gifts).toBe('周边')
    expect(zhMessages.giftItems).toBe('周边清单')
    expect(zhMessages.readMore).toBe('阅读更多')
    expect(zhMessages.emptyReleases).toBe('暂无作品')
    expect(zhMessages.emptyNews).toBe('暂无新闻')
    expect(zhMessages.previewSectionTitle).toBe('试听')
    expect(zhMessages.creditCatalogNumber).toBe('制品编号')
    expect(zhMessages.creditIllustrator).toBe('插画')
    expect(zhMessages.creditDesigner).toBe('平面设计')
    expect(zhMessages.creditMastering).toBe('母带')
    expect(zhMessages.creditMix).toBe('混音')
    expect(zhMessages.creditWebDesign).toBe('网页设计')
    expect(zhMessages.creditProducer).toBe('制作人')
    expect(zhMessages.creditSpecialThanks).toBe('特别鸣谢')
  })

  it('drops the retired return-to-releases and authors messages', () => {
    expect('returnToReleases' in zhMessages).toBe(false)
    expect('authors' in zhMessages).toBe(false)
  })
})
