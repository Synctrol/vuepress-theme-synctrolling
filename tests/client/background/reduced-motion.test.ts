import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  REDUCED_MOTION_QUERY,
  readReducedMotion,
  subscribeReducedMotion,
} from '../../../src/client/background/reduced-motion'

describe('reduced motion helper', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads prefers-reduced-motion: reduce as true', () => {
    const mql = {
      matches: true,
      media: REDUCED_MOTION_QUERY,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    expect(readReducedMotion(mql as unknown as MediaQueryList)).toBe(true)
  })

  it('reads prefers-reduced-motion: no-preference as false', () => {
    const mql = {
      matches: false,
      media: REDUCED_MOTION_QUERY,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    expect(readReducedMotion(mql as unknown as MediaQueryList)).toBe(false)
  })

  it('subscribes and unsubscribes change listeners', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const mql = {
      matches: false,
      media: REDUCED_MOTION_QUERY,
      addEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
        if (type === 'change') listeners.add(listener)
      }),
      removeEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
        if (type === 'change') listeners.delete(listener)
      }),
    }
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql),
    )

    const seen: boolean[] = []
    const unsubscribe = subscribeReducedMotion((value) => {
      seen.push(value)
    })

    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    for (const listener of listeners) {
      listener({ matches: true } as MediaQueryListEvent)
    }
    expect(seen).toEqual([true])

    unsubscribe()
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(listeners.size).toBe(0)
  })
})
