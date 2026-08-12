import { describe, expect, it } from 'vitest'
import { resolveCanonicalUrl, resolveHreflang, resolveLang, resolveRobots } from '../../../src/compiler/seo/resolve-alternates.js'
import { page, resolvedOptions, url } from '../../helpers/seo-fixtures.js'

const options = resolvedOptions()
const zhReal = page({ identity: 'release:first', locale: 'zh', contentType: 'release', url: url('https://synctrol.com/zh/releases/first/'), title: '第一张' })
const enFallback = page({ identity: 'release:first', locale: 'en', contentType: 'release', url: url('https://synctrol.com/en/releases/first/'), title: '第一张', isFallback: true, noindex: true, bodyLocale: 'zh', canonicalLocale: 'zh' })
const zhNews = page({ identity: 'news:launch', locale: 'zh', contentType: 'news', url: url('https://synctrol.com/zh/news/launch/'), title: '发布' })
const enNews = page({ identity: 'news:launch', locale: 'en', contentType: 'news', url: url('https://synctrol.com/en/news/launch/'), title: 'Launch' })

describe('resolveAlternates', () => {
  it('resolves lang, robots, canonical, and hreflang in options.locales order', () => {
    expect(resolveLang(zhReal, options)).toBe('zh-CN')
    expect(resolveRobots(enFallback)).toBe('noindex,follow')
    expect(resolveCanonicalUrl(enFallback, [zhReal, enFallback])).toBe('https://synctrol.com/zh/releases/first/')
    expect(resolveHreflang(zhNews, [enNews, zhNews], options)).toEqual([
      { hreflang: 'zh-CN', href: 'https://synctrol.com/zh/news/launch/' },
      { hreflang: 'en-US', href: 'https://synctrol.com/en/news/launch/' },
    ])
    expect(resolveHreflang(enFallback, [zhReal, enFallback], options)).toEqual([
      { hreflang: 'zh-CN', href: 'https://synctrol.com/zh/releases/first/' },
    ])
  })
})
