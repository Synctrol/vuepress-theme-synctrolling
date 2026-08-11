import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { fail } from './diagnostics.js'

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

  try {
    return parse(raw)
  } catch (error) {
    fail({
      severity: 'error',
      code: 'INVALID_YAML',
      message: `Invalid YAML: ${
        error instanceof Error ? error.message : String(error)
      }`,
      path: absolutePath,
    })
  }
}
