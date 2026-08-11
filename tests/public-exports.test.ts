import { describe, expect, it } from 'vitest'
import {
  enMessages,
  resolveMultilanguage,
  resolveThemeOptions,
  zhMessages,
} from '../src/index'

describe('root public exports', () => {
  it('exposes messages, the multilanguage resolver, and option resolution', () => {
    expect(zhMessages.draft).toBe('草稿')
    expect(enMessages.draft).toBe('DRAFT')
    expect(resolveMultilanguage('Synctrol', 'en', 'zh')).toEqual({
      text: 'Synctrol',
      locale: 'en',
      fellBack: false,
    })
    expect(typeof resolveThemeOptions).toBe('function')
  })
})
