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
})
