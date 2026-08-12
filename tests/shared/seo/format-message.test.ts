import { describe, expect, it } from 'vitest'
import { formatMessage } from '../../../src/shared/seo/format-message.js'

describe('SEO formatMessage re-export', () => {
  it('reuses the shared named-placeholder formatter', () => {
    expect(formatMessage('{title} · Page {page}', { title: 'News', page: 2 })).toBe('News · Page 2')
    expect(formatMessage('{title} · {missing}', { title: 'X' })).toBe('X · {missing}')
  })
})
