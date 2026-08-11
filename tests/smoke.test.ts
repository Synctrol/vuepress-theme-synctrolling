import { describe, expect, it } from 'vitest'
import { synctrolTheme } from '../src/index'

describe('package smoke', () => {
  it('exports synctrolTheme as a function', () => {
    expect(typeof synctrolTheme).toBe('function')
  })
})
