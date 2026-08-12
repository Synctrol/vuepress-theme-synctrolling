import { lstatSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  ContentType,
  LocaleKey,
  LocaleMarkdown,
} from '../shared/types.js'
import { fail } from './diagnostics.js'
import { assertHomeHasLogo } from './markdown/home-formatters.js'
import { parseYamlString } from './yaml.js'

type PlainObject = Record<string, unknown>

const ALLOWED_FIELDS = ['title', 'description', 'draft']

/** Frontmatter block delimited by --- lines; the body keeps its own --- lines. */
const FRONTMATTER_PATTERN =
  /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/

function invalid(code: string, message: string, path: string): never {
  fail({ severity: 'error', code, message, path })
}

function isPlainObject(value: unknown): value is PlainObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isMissingPath(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT'
}

function readIfPresent(filePath: string): string | undefined {
  try {
    if (!lstatSync(filePath).isFile()) return undefined
  } catch (error) {
    if (isMissingPath(error)) return undefined
    invalid(
      'MARKDOWN_READ_FAILED',
      `Unable to read locale Markdown: ${
        error instanceof Error ? error.message : String(error)
      }`,
      filePath,
    )
  }

  try {
    return readFileSync(filePath, 'utf8')
  } catch (error) {
    invalid(
      'MARKDOWN_READ_FAILED',
      `Unable to read locale Markdown: ${
        error instanceof Error ? error.message : String(error)
      }`,
      filePath,
    )
  }
}

function requiredText(
  value: unknown,
  code: string,
  message: string,
  filePath: string,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    invalid(code, message, filePath)
  }
  return value
}

export function parseLocaleMarkdown(
  raw: string,
  filePath: string,
  type: ContentType,
): LocaleMarkdown {
  const text = raw.startsWith('\uFEFF') ? raw.slice(1) : raw
  const match = FRONTMATTER_PATTERN.exec(text)
  if (match === null) {
    invalid(
      'MISSING_FRONTMATTER',
      'Locale Markdown must begin with a --- frontmatter block',
      filePath,
    )
  }

  const parsed = parseYamlString(match[1] ?? '', filePath)
  if (!isPlainObject(parsed)) {
    invalid(
      'INVALID_FRONTMATTER',
      'Locale Markdown frontmatter must be a plain mapping',
      filePath,
    )
  }

  for (const field of Object.keys(parsed)) {
    if (!ALLOWED_FIELDS.includes(field)) {
      invalid(
        'UNKNOWN_FIELD',
        `Field "${field}" is not allowed in locale Markdown frontmatter`,
        filePath,
      )
    }
  }

  const title = requiredText(
    parsed.title,
    'MISSING_TITLE',
    'title must be a non-empty string',
    filePath,
  )

  if (parsed.draft !== undefined && typeof parsed.draft !== 'boolean') {
    invalid('INVALID_DRAFT', 'draft must be a boolean', filePath)
  }

  const markdown: LocaleMarkdown = {
    filePath,
    title,
    draft: parsed.draft === true,
    body: (match[2] ?? '').replace(/^\r?\n/, ''),
  }

  if (type === 'home') {
    markdown.description = requiredText(
      parsed.description,
      'MISSING_DESCRIPTION',
      'description is required for Home as SEO metadata',
      filePath,
    )
    assertHomeHasLogo(markdown.body, filePath)
    return markdown
  }

  if (parsed.description !== undefined) {
    markdown.description = requiredText(
      parsed.description,
      'INVALID_DESCRIPTION',
      'description must be a non-empty string when present',
      filePath,
    )
  }

  return markdown
}

export function readPackageLocaleMarkdown(
  packageDir: string,
  type: ContentType,
  localeKeys: readonly LocaleKey[],
): Partial<Record<LocaleKey, LocaleMarkdown>> {
  const locales: Partial<Record<LocaleKey, LocaleMarkdown>> = {}

  for (const locale of localeKeys) {
    const filePath = join(packageDir, `${locale}.md`)
    const raw = readIfPresent(filePath)
    if (raw === undefined) continue
    locales[locale] = parseLocaleMarkdown(raw, filePath, type)
  }

  return locales
}
