import { describe, expect, it } from 'vitest'
import { decideHomeAvailability } from '../../src/compiler/home-availability'
import { homePackage, localeMarkdown, releasePackage } from '../helpers/route-fixtures'

const ctx = { mainLocale: 'zh', showDrafts: false, localeKeys: ['zh', 'en'] }

describe('decideHomeAvailability', () => {
  it('builds home normally when published', () => {
    const result = decideHomeAvailability(homePackage(), ctx)

    expect(result.packageDecision).toBe('publish')
    expect(result.locales.zh?.kind).toBe('publish')
    expect(result.locales.en?.kind).toBe('publish')
    expect(result.diagnostics).toEqual([])
  })

  it('errors when the manifest is draft and showDrafts is false', () => {
    const result = decideHomeAvailability(homePackage({ draft: true }), ctx)

    expect(result.packageDecision).toBe('skip-package')
    expect(result.diagnostics[0]).toMatchObject({
      severity: 'error',
      code: 'HOME_UNPUBLISHABLE',
    })
  })

  it('errors when main markdown is missing or draft and showDrafts is false', () => {
    const missing = decideHomeAvailability(
      homePackage({ locales: { en: localeMarkdown({ title: 'Home' }) } }),
      ctx,
    )
    expect(missing.diagnostics[0]).toMatchObject({
      severity: 'error',
      code: 'HOME_MAIN_UNPUBLISHABLE',
    })

    const draftMain = decideHomeAvailability(
      homePackage({
        locales: {
          zh: localeMarkdown({ title: '首页', description: 'D', draft: true }),
          en: localeMarkdown({ title: 'Home', description: 'D' }),
        },
      }),
      ctx,
    )
    expect(draftMain.diagnostics[0]?.code).toBe('HOME_MAIN_UNPUBLISHABLE')
  })

  it('builds a draft home when showDrafts is true', () => {
    const result = decideHomeAvailability(
      homePackage({
        draft: true,
        locales: {
          zh: localeMarkdown({ title: '首页', description: 'D', draft: true }),
          en: localeMarkdown({ title: 'Home', description: 'D', draft: true }),
        },
      }),
      { ...ctx, showDrafts: true },
    )

    expect(result.packageDecision).toBe('publish')
    expect(result.locales.zh?.isDraft).toBe(true)
    expect(result.locales.en?.isDraft).toBe(true)
  })

  it('errors when showDrafts is true but main home markdown is absent', () => {
    const result = decideHomeAvailability(homePackage({ locales: {} }), {
      ...ctx,
      showDrafts: true,
    })

    expect(result.packageDecision).toBe('skip-package')
    expect(result.diagnostics[0]).toMatchObject({
      severity: 'error',
      code: 'HOME_ABSENT',
    })
  })

  it('falls back for a missing non-main home and warns', () => {
    const result = decideHomeAvailability(
      homePackage({
        locales: {
          zh: localeMarkdown({ title: '首页', description: '主页' }),
        },
      }),
      ctx,
    )

    expect(result.locales.en).toEqual({
      kind: 'fallback',
      bodyLocale: 'zh',
      isDraft: false,
      title: '首页',
      description: '主页',
    })
    expect(result.diagnostics[0]?.code).toBe('LOCALE_FALLBACK')
  })

  it('publishes a non-main draft home when showDrafts is true', () => {
    const result = decideHomeAvailability(
      homePackage({
        locales: {
          zh: localeMarkdown({ title: '首页', description: '主页' }),
          en: localeMarkdown({ title: 'Home', description: 'Home', draft: true }),
        },
      }),
      { ...ctx, showDrafts: true },
    )

    expect(result.locales.en).toMatchObject({
      kind: 'publish',
      isDraft: true,
      bodyLocale: 'en',
    })
  })

  it('marks a fallback Home as draft when its source is draft', () => {
    const manifestDraft = decideHomeAvailability(
      homePackage({
        draft: true,
        locales: {
          zh: localeMarkdown({ title: '首页', description: '主页' }),
        },
      }),
      { ...ctx, showDrafts: true },
    )
    expect(manifestDraft.locales.en).toMatchObject({
      kind: 'fallback',
      bodyLocale: 'zh',
      isDraft: true,
    })

    const mainDraft = decideHomeAvailability(
      homePackage({
        locales: {
          zh: localeMarkdown({ title: '首页', description: '主页', draft: true }),
        },
      }),
      { ...ctx, showDrafts: true },
    )
    expect(mainDraft.locales.en).toMatchObject({
      kind: 'fallback',
      isDraft: true,
    })
  })

  it('keeps a fallback Home undrafted when its source is published', () => {
    const result = decideHomeAvailability(
      homePackage({
        locales: {
          zh: localeMarkdown({ title: '首页', description: '主页' }),
        },
      }),
      { ...ctx, showDrafts: true },
    )

    expect(result.locales.en).toMatchObject({ kind: 'fallback', isDraft: false })
  })

  it('refuses non-home packages', () => {
    expect(() => decideHomeAvailability(releasePackage(), ctx)).toThrow(/home/i)
  })
})
