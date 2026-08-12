import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SynctrolCspJson } from '../../platforms/csp.js'

export function writeSynctrolCspJson(destDir: string, csp: SynctrolCspJson): string {
  const path = join(destDir, 'synctrol-csp.json')
  writeFileSync(path, `${JSON.stringify(csp, null, 2)}\n`, 'utf8')
  return path
}

export function assertNoCspMetaInjection(html: string): void {
  if (/http-equiv\s*=\s*["']Content-Security-Policy["']/i.test(html)) {
    throw new Error('CSP meta injection is not supported in v1')
  }
}
