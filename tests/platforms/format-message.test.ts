import { describe, expect, it } from 'vitest'
import { formatMessage } from '../../src/platforms/format-message'
import { enMessages, zhMessages } from '../../src/shared/messages'

describe('formatMessage', () => {
  it('substitutes {platform} in activateEmbed / embedFailed / openExternal', () => {
    expect(formatMessage(enMessages.activateEmbed, { platform: 'YouTube' })).toBe(
      'Play YouTube',
    )
    expect(formatMessage(enMessages.embedFailed, { platform: 'YouTube' })).toBe(
      'YouTube failed to load',
    )
    expect(formatMessage(enMessages.openExternal, { platform: 'YouTube' })).toBe(
      'Open YouTube',
    )
    expect(formatMessage(zhMessages.activateEmbed, { platform: 'Bilibili' })).toBe(
      '播放 Bilibili',
    )
  })

  it('leaves unknown tokens intact', () => {
    expect(formatMessage('Hello {name}', { platform: 'X' })).toBe('Hello {name}')
  })
})
