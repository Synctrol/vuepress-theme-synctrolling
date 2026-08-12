import { describe, expect, it } from 'vitest'
import { resolvePlatformLabel } from '../../src/client/components/platforms/resolve-platform-label'

describe('resolvePlatformLabel', () => {
  it('prefers entry.label then definition name via multilanguage rules', () => {
    expect(
      resolvePlatformLabel({
        entry: { platform: 'taobao', url: 'https://item.taobao.com/x', label: { zh: '店铺', en: 'Shop' } },
        definitionName: { zh: '淘宝', en: 'Taobao' },
        locale: 'en',
        mainLocale: 'zh',
      }),
    ).toEqual({ text: 'Shop', fellBack: false })

    expect(
      resolvePlatformLabel({
        entry: { platform: 'taobao', url: 'https://item.taobao.com/x' },
        definitionName: { zh: '淘宝', en: 'Taobao' },
        locale: 'en',
        mainLocale: 'zh',
      }),
    ).toEqual({ text: 'Taobao', fellBack: false })
  })
})
