import { describe, expect, it } from 'vitest'
import { decidePackageAvailability } from '../../src/compiler/package-availability'
import { homePackage, localeMarkdown, releasePackage } from '../helpers/route-fixtures'

const ctx = { mainLocale: 'zh', showDrafts: false, localeKeys: ['zh', 'en'] }

describe('decidePackageAvailability', () => {
  it('skips a manifest draft without a diagnostic when showDrafts is false', () => {
    const result = decidePackageAvailability(releasePackage({ draft: true }), ctx)

    expect(result.packageDecision).toBe('skip-package')
    expect(result.diagnostics).toEqual([])
    expect(result.locales).toEqual({})
  })

  it('warns and skips when main-locale markdown is missing', () => {
    const result = decidePackageAvailability(
      releasePackage({ locales: { en: localeMarkdown({ title: 'EN' }) } }),
      ctx,
    )

    expect(result.packageDecision).toBe('skip-package')
    expect(result.diagnostics[0]).toMatchObject({
      severity: 'warning',
      code: 'MAIN_LOCALE_UNAVAILABLE',
      path: '/content/releases/first-release',
    })
  })

  it('warns and skips when main-locale markdown is draft', () => {
    const result = decidePackageAvailability(
      releasePackage({
        locales: {
          zh: localeMarkdown({ title: 'ZH', draft: true }),
          en: localeMarkdown({ title: 'EN' }),
        },
      }),
      ctx,
    )

    expect(result.packageDecision).toBe('skip-package')
    expect(result.diagnostics[0]?.code).toBe('MAIN_LOCALE_UNAVAILABLE')
  })

  it('marks a missing non-main locale as fallback using the main body', () => {
    const result = decidePackageAvailability(
      releasePackage({
        locales: { zh: localeMarkdown({ title: 'ZH', description: 'D' }) },
      }),
      ctx,
    )

    expect(result.packageDecision).toBe('publish')
    expect(result.locales.zh).toEqual({
      kind: 'publish',
      bodyLocale: 'zh',
      isDraft: false,
      title: 'ZH',
      description: 'D',
    })
    expect(result.locales.en).toEqual({
      kind: 'fallback',
      bodyLocale: 'zh',
      isDraft: false,
      title: 'ZH',
      description: 'D',
    })
    expect(result.diagnostics.some((d) => d.code === 'LOCALE_FALLBACK')).toBe(true)
  })

  it('marks a non-main draft locale as fallback when showDrafts is false', () => {
    const result = decidePackageAvailability(
      releasePackage({
        locales: {
          zh: localeMarkdown({ title: 'ZH' }),
          en: localeMarkdown({ title: 'EN', draft: true }),
        },
      }),
      ctx,
    )

    expect(result.locales.en?.kind).toBe('fallback')
    expect(result.locales.en?.bodyLocale).toBe('zh')
  })

  it('publishes manifest and locale drafts as drafts when showDrafts is true', () => {
    const result = decidePackageAvailability(
      releasePackage({
        draft: true,
        locales: {
          zh: localeMarkdown({ title: 'ZH', draft: true }),
          en: localeMarkdown({ title: 'EN', draft: true }),
        },
      }),
      { ...ctx, showDrafts: true },
    )

    expect(result.packageDecision).toBe('publish')
    expect(result.locales.zh).toMatchObject({ kind: 'publish', isDraft: true })
    expect(result.locales.en).toMatchObject({ kind: 'publish', isDraft: true })
  })

  it('marks every locale draft when only the manifest is draft', () => {
    const result = decidePackageAvailability(
      releasePackage({ draft: true }),
      { ...ctx, showDrafts: true },
    )

    expect(result.locales.zh?.isDraft).toBe(true)
    expect(result.locales.en?.isDraft).toBe(true)
  })

  it('uses the actual non-main draft body instead of fallback when showDrafts is true', () => {
    const result = decidePackageAvailability(
      releasePackage({
        locales: {
          zh: localeMarkdown({ title: 'ZH' }),
          en: localeMarkdown({ title: 'EN draft', draft: true }),
        },
      }),
      { ...ctx, showDrafts: true },
    )

    expect(result.locales.en).toMatchObject({
      kind: 'publish',
      isDraft: true,
      bodyLocale: 'en',
      title: 'EN draft',
    })
  })

  it('marks a fallback as draft when the manifest is draft and showDrafts is true', () => {
    const result = decidePackageAvailability(
      releasePackage({
        draft: true,
        locales: { zh: localeMarkdown({ title: 'ZH' }) },
      }),
      { ...ctx, showDrafts: true },
    )

    expect(result.locales.en).toMatchObject({
      kind: 'fallback',
      bodyLocale: 'zh',
      isDraft: true,
    })
  })

  it('marks a fallback as draft when the main Markdown is draft and showDrafts is true', () => {
    const result = decidePackageAvailability(
      releasePackage({
        locales: { zh: localeMarkdown({ title: 'ZH', draft: true }) },
      }),
      { ...ctx, showDrafts: true },
    )

    expect(result.locales.zh).toMatchObject({ kind: 'publish', isDraft: true })
    expect(result.locales.en).toMatchObject({
      kind: 'fallback',
      bodyLocale: 'zh',
      isDraft: true,
    })
  })

  it('keeps a fallback undrafted when neither source is draft', () => {
    const result = decidePackageAvailability(
      releasePackage({ locales: { zh: localeMarkdown({ title: 'ZH' }) } }),
      { ...ctx, showDrafts: true },
    )

    expect(result.locales.en).toMatchObject({ kind: 'fallback', isDraft: false })
  })

  it('still skips an unpublishable main locale when showDrafts is false', () => {
    const result = decidePackageAvailability(
      releasePackage({
        draft: true,
        locales: { zh: localeMarkdown({ title: 'ZH', draft: true }) },
      }),
      ctx,
    )

    expect(result.packageDecision).toBe('skip-package')
    expect(result.locales).toEqual({})
  })

  it('refuses home packages', () => {
    expect(() => decidePackageAvailability(homePackage(), ctx)).toThrow(/home/i)
  })
})
