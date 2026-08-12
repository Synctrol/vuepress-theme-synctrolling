import { describe, expect, it } from 'vitest'
import { formatCalendarDate } from '../../src/shared/format-calendar-date'

describe('formatCalendarDate', () => {
  it('formats YYYY-MM-DD in UTC without shifting calendar day', () => {
    expect(formatCalendarDate('2026-08-11', 'en-US', { dateStyle: 'medium' })).toBe(
      'Aug 11, 2026',
    )
  })

  it('returns input for invalid calendar strings', () => {
    expect(formatCalendarDate('not-a-date', 'en-US')).toBe('not-a-date')
  })
})
