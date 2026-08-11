import { describe, expect, it } from 'vitest'
import {
  isDiagnosticError,
  SynctrolDiagnosticError,
} from '../../src/compiler/diagnostics'
import { assertMultilanguage } from '../../src/compiler/multilanguage'

const path = '/x.yml'
const field = 'title'
const mainLocale = 'zh'

function expectDiagnostic(
  fn: () => unknown,
  code: 'MISSING_MAIN_LOCALE' | 'INVALID_MULTILANGUAGE',
): void {
  try {
    fn()
    expect.unreachable('should have thrown')
  } catch (error) {
    expect(isDiagnosticError(error)).toBe(true)
    if (isDiagnosticError(error)) {
      expect(error.diagnostics).toHaveLength(1)
      expect(error.diagnostics[0].code).toBe(code)
      expect(error.diagnostics[0].path).toBe(path)
      expect(error.diagnostics[0].message).toContain(field)
    }
  }
}

describe('assertMultilanguage', () => {
  it('accepts a scalar string', () => {
    expect(assertMultilanguage('SYNCTROL', mainLocale, path, field)).toBe(
      'SYNCTROL',
    )
  })

  it('accepts an empty scalar string', () => {
    expect(assertMultilanguage('', mainLocale, path, field)).toBe('')
  })

  it('accepts a map that defines mainLocale', () => {
    expect(
      assertMultilanguage(
        { zh: '第一张专辑', en: 'First Album' },
        mainLocale,
        path,
        field,
      ),
    ).toEqual({ zh: '第一张专辑', en: 'First Album' })
  })

  it('accepts a null-prototype locale map', () => {
    const input = Object.assign(Object.create(null), {
      zh: '第一张专辑',
      en: 'First Album',
    })

    expect(assertMultilanguage(input, mainLocale, path, field)).toEqual({
      zh: '第一张专辑',
      en: 'First Album',
    })
  })

  it('accepts empty string map values', () => {
    expect(
      assertMultilanguage({ zh: '', en: 'First Album' }, mainLocale, path, field),
    ).toEqual({ zh: '', en: 'First Album' })
  })

  it('rejects a map missing mainLocale', () => {
    expectDiagnostic(
      () => assertMultilanguage({ en: 'First Album' }, mainLocale, path, field),
      'MISSING_MAIN_LOCALE',
    )
  })

  it('rejects an inherited mainLocale value', () => {
    Object.defineProperty(Object.prototype, 'zh', {
      configurable: true,
      value: 'Inherited Chinese',
    })

    try {
      expectDiagnostic(
        () => assertMultilanguage({ en: 'English only' }, mainLocale, path, field),
        'MISSING_MAIN_LOCALE',
      )
    } finally {
      Reflect.deleteProperty(Object.prototype, 'zh')
    }
  })

  it('rejects non-string map values and non-string/non-object inputs', () => {
    expectDiagnostic(
      () => assertMultilanguage({ zh: 1 }, mainLocale, path, field),
      'INVALID_MULTILANGUAGE',
    )
    expectDiagnostic(
      () => assertMultilanguage(1, mainLocale, path, field),
      'INVALID_MULTILANGUAGE',
    )
  })

  it('rejects non-plain locale maps', () => {
    expectDiagnostic(
      () => assertMultilanguage(['第一张专辑'], mainLocale, path, field),
      'INVALID_MULTILANGUAGE',
    )
    expectDiagnostic(
      () => assertMultilanguage(new Date(), mainLocale, path, field),
      'INVALID_MULTILANGUAGE',
    )
    expectDiagnostic(
      () =>
        assertMultilanguage(
          Object.assign(Object.create({ inherited: 'x' }), { zh: '中文' }),
          mainLocale,
          path,
          field,
        ),
      'INVALID_MULTILANGUAGE',
    )
  })

  it('rejects dangerous locale keys as INVALID_MULTILANGUAGE', () => {
    for (const key of ['__proto__', 'constructor', '../evil', '']) {
      expectDiagnostic(
        () =>
          assertMultilanguage({ [key]: 'value', zh: '中文' }, mainLocale, path, field),
        'INVALID_MULTILANGUAGE',
      )
    }
  })

  it('returns a copy that is not affected by later input mutation', () => {
    const input = { zh: '第一张专辑', en: 'First Album' }
    const result = assertMultilanguage(input, mainLocale, path, field)

    input.zh = 'mutated'
    ;(input as Record<string, string>).fr = 'French'

    expect(result).toEqual({ zh: '第一张专辑', en: 'First Album' })
    expect(result).not.toBe(input)
  })

  it('rejects a non-enumerable non-string mainLocale value', () => {
    const input = { en: 'English' }
    Object.defineProperty(input, 'zh', { value: 42, enumerable: false })

    expectDiagnostic(
      () => assertMultilanguage(input, mainLocale, path, field),
      'INVALID_MULTILANGUAGE',
    )
  })

  it('accepts a legal non-enumerable mainLocale and returns an enumerable copy', () => {
    const input = { en: 'First Album' }
    Object.defineProperty(input, 'zh', {
      value: '第一张专辑',
      enumerable: false,
    })

    const result = assertMultilanguage(input, mainLocale, path, field)

    expect(result).toEqual({ zh: '第一张专辑', en: 'First Album' })
    expect(Object.keys(result).sort()).toEqual(['en', 'zh'])
  })

  it('rejects a non-enumerable dangerous locale key', () => {
    const input = { zh: '中文' }
    Object.defineProperty(input, '__proto__', {
      value: 'polluted',
      enumerable: false,
    })

    expectDiagnostic(
      () => assertMultilanguage(input, mainLocale, path, field),
      'INVALID_MULTILANGUAGE',
    )
  })

  it('rejects accessor locale properties without executing getters', () => {
    let getterExecuted = false
    const input = { zh: '中文' }
    Object.defineProperty(input, 'en', {
      configurable: true,
      enumerable: true,
      get() {
        getterExecuted = true
        return 'English'
      },
    })

    expectDiagnostic(
      () => assertMultilanguage(input, mainLocale, path, field),
      'INVALID_MULTILANGUAGE',
    )
    expect(getterExecuted).toBe(false)
  })

  it('converts throwing proxy reflection traps to INVALID_MULTILANGUAGE', () => {
    const input = new Proxy(
      { zh: '中文' },
      {
        getOwnPropertyDescriptor() {
          throw new Error('proxy trap')
        },
      },
    )

    try {
      assertMultilanguage(input, mainLocale, path, field)
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(SynctrolDiagnosticError)
      expect(isDiagnosticError(error)).toBe(true)
      if (isDiagnosticError(error)) {
        expect(error.diagnostics[0].code).toBe('INVALID_MULTILANGUAGE')
        expect(error.diagnostics[0].path).toBe(path)
        expect(error.diagnostics[0].message).toContain(field)
      }
      expect((error as Error).message).not.toContain('proxy trap')
    }
  })
})
