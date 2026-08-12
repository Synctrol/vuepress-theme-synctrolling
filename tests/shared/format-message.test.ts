import { describe, expect, it } from 'vitest'
import { formatMessage } from '../../src/shared/format-message'

describe('formatMessage', () => {
  it('replaces named placeholders', () => {
    expect(
      formatMessage('Theme mode {current}, next {next}', {
        current: 'AUTO',
        next: 'LIGHT',
      }),
    ).toBe('Theme mode AUTO, next LIGHT')
  })

  it('leaves unknown placeholders intact', () => {
    expect(formatMessage('Hello {name}', {})).toBe('Hello {name}')
  })

  it('replaces string and number placeholders and leaves unknown placeholders intact', () => {
    expect(formatMessage('{tag} · {title}', { tag: 'Releases', title: 'News' })).toBe(
      'Releases · News',
    )
    expect(formatMessage('{title} · Page {page}', { title: 'News', page: 2 })).toBe(
      'News · Page 2',
    )
    expect(formatMessage('Hello {name}', {})).toBe('Hello {name}')
  })
})
