import { readFileSync } from 'node:fs'
import { parseDocument } from 'yaml'
import { fail } from './diagnostics.js'

const PARSE_OPTIONS = {
  logLevel: 'silent' as const,
  schema: 'core' as const,
}

function invalidYaml(absolutePath: string, detail: string): never {
  fail({
    severity: 'error',
    code: 'INVALID_YAML',
    message: `Invalid YAML: ${detail}`,
    path: absolutePath,
  })
}

export function loadYamlFile(absolutePath: string): unknown {
  let raw: string
  try {
    raw = readFileSync(absolutePath, 'utf8')
  } catch (error) {
    fail({
      severity: 'error',
      code: 'INVALID_YAML',
      message: `Unable to read YAML file: ${
        error instanceof Error ? error.message : String(error)
      }`,
      path: absolutePath,
    })
  }

  let doc
  try {
    doc = parseDocument(raw, PARSE_OPTIONS)
  } catch (error) {
    invalidYaml(
      absolutePath,
      error instanceof Error ? error.message : String(error),
    )
  }

  if (doc.errors.length > 0) {
    invalidYaml(absolutePath, doc.errors[0].message)
  }

  if (doc.warnings.length > 0) {
    invalidYaml(absolutePath, doc.warnings[0].message)
  }

  try {
    return doc.toJS()
  } catch (error) {
    invalidYaml(
      absolutePath,
      error instanceof Error ? error.message : String(error),
    )
  }
}
