import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isDiagnosticError } from '../../src/compiler/diagnostics'
import { readPackageLocaleMarkdown } from '../../src/compiler/locale-markdown'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'synctrol-md-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function writePackage(files: Record<string, string>): string {
  const dir = join(root, 'package')
  mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content, 'utf8')
  }
  return dir
}

function expectDiagnosticCode(action: () => unknown, code: string): void {
  try {
    action()
  } catch (error) {
    if (!isDiagnosticError(error)) throw error
    expect(error.diagnostics[0]?.code).toBe(code)
    expect(error.diagnostics[0]?.severity).toBe('error')
    return
  }
  throw new Error(`Expected ${code} diagnostic`)
}

describe('readPackageLocaleMarkdown', () => {
  it('reads frontmatter and body for each configured locale that has a file', () => {
    const dir = writePackage({
      'zh.md': '---\ntitle: 第一张专辑\ndescription: 摘要\n---\n\n正文内容\n',
      'en.md': '---\ntitle: First Album\n---\n\nBody\n',
    })

    const locales = readPackageLocaleMarkdown(dir, 'release', ['zh', 'en', 'ja'])

    expect(locales.zh).toEqual({
      filePath: join(dir, 'zh.md'),
      title: '第一张专辑',
      description: '摘要',
      draft: false,
      body: '正文内容\n',
    })
    expect(locales.en?.title).toBe('First Album')
    expect(locales.en).not.toHaveProperty('description')
    expect(locales.ja).toBeUndefined()
  })

  it('defaults draft to false and reads an explicit draft flag', () => {
    const dir = writePackage({
      'zh.md': '---\ntitle: A\n---\nBody\n',
      'en.md': '---\ntitle: B\ndraft: true\n---\nBody\n',
    })

    const locales = readPackageLocaleMarkdown(dir, 'news', ['zh', 'en'])

    expect(locales.zh?.draft).toBe(false)
    expect(locales.en?.draft).toBe(true)
  })

  it('keeps --- inside the body and strips a single leading blank line', () => {
    const dir = writePackage({
      'zh.md': '---\ntitle: A\n---\n\nabove\n\n---\n\nbelow\n',
    })

    expect(readPackageLocaleMarkdown(dir, 'page', ['zh']).zh?.body).toBe(
      'above\n\n---\n\nbelow\n',
    )
  })

  it('accepts a UTF-8 BOM before the frontmatter delimiter', () => {
    const dir = writePackage({
      'zh.md': '\uFEFF---\ntitle: 带 BOM\n---\n\n正文\n',
    })

    const markdown = readPackageLocaleMarkdown(dir, 'page', ['zh']).zh
    expect(markdown?.title).toBe('带 BOM')
    expect(markdown?.body).toBe('正文\n')
  })

  it('accepts CRLF line endings', () => {
    const dir = writePackage({
      'zh.md': '---\r\ntitle: CRLF\r\ndraft: true\r\n---\r\n\r\nBody\r\n',
    })

    const markdown = readPackageLocaleMarkdown(dir, 'page', ['zh']).zh
    expect(markdown?.title).toBe('CRLF')
    expect(markdown?.draft).toBe(true)
    expect(markdown?.body).toBe('Body\r\n')
  })

  it('accepts a BOM together with CRLF', () => {
    const dir = writePackage({
      'zh.md': '\uFEFF---\r\ntitle: Both\r\n---\r\nBody\r\n',
    })

    expect(readPackageLocaleMarkdown(dir, 'page', ['zh']).zh?.title).toBe('Both')
  })

  it('accepts a frontmatter block with no body', () => {
    const dir = writePackage({ 'zh.md': '---\ntitle: Empty\n---' })

    expect(readPackageLocaleMarkdown(dir, 'page', ['zh']).zh?.body).toBe('')
  })

  it('rejects a missing frontmatter block', () => {
    const dir = writePackage({ 'zh.md': 'no frontmatter here\n' })
    expectDiagnosticCode(
      () => readPackageLocaleMarkdown(dir, 'page', ['zh']),
      'MISSING_FRONTMATTER',
    )
  })

  it('rejects a missing or empty title', () => {
    const missing = writePackage({ 'zh.md': '---\ndescription: d\n---\nBody\n' })
    expectDiagnosticCode(
      () => readPackageLocaleMarkdown(missing, 'page', ['zh']),
      'MISSING_TITLE',
    )

    const empty = writePackage({ 'zh.md': '---\ntitle: "  "\n---\nBody\n' })
    expectDiagnosticCode(
      () => readPackageLocaleMarkdown(empty, 'page', ['zh']),
      'MISSING_TITLE',
    )
  })

  it('requires a description for home only', () => {
    const dir = writePackage({ 'zh.md': '---\ntitle: 首页\n---\nBody\n' })

    expectDiagnosticCode(
      () => readPackageLocaleMarkdown(dir, 'home', ['zh']),
      'MISSING_DESCRIPTION',
    )
    expect(readPackageLocaleMarkdown(dir, 'page', ['zh']).zh?.title).toBe('首页')
  })

  it('rejects unknown frontmatter fields and non-boolean draft', () => {
    const unknown = writePackage({
      'zh.md': '---\ntitle: A\nlayout: custom\n---\nBody\n',
    })
    expectDiagnosticCode(
      () => readPackageLocaleMarkdown(unknown, 'page', ['zh']),
      'UNKNOWN_FIELD',
    )

    const badDraft = writePackage({
      'zh.md': '---\ntitle: A\ndraft: yes please\n---\nBody\n',
    })
    expectDiagnosticCode(
      () => readPackageLocaleMarkdown(badDraft, 'page', ['zh']),
      'INVALID_DRAFT',
    )
  })

  it('rejects invalid YAML inside the frontmatter block', () => {
    const dir = writePackage({ 'zh.md': '---\ntitle: [unclosed\n---\nBody\n' })
    expectDiagnosticCode(
      () => readPackageLocaleMarkdown(dir, 'page', ['zh']),
      'INVALID_YAML',
    )
  })
})
