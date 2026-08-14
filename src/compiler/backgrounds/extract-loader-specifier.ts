import type { BackgroundLoader } from '../../shared/background.js'
import { fail } from '../diagnostics.js'

const SUPPORTED =
  /^\(\)\s*=>\s*import\(\s*(['"])([^'"]+)\1\s*\)$/

export function extractBackgroundImportSpecifier(
  loader: BackgroundLoader,
): string {
  if (typeof loader !== 'function') {
    fail({
      severity: 'error',
      code: 'UNSUPPORTED_BACKGROUND_LOADER',
      message: `background must be () => import('…') or () => import("…")`,
    })
  }
  const source = Function.prototype.toString
    .call(loader)
    .replace(/\s+/g, ' ')
    .trim()
  const match = SUPPORTED.exec(source)
  if (!match) {
    fail({
      severity: 'error',
      code: 'UNSUPPORTED_BACKGROUND_LOADER',
      message: `background must be () => import('…') or () => import("…"); got: ${source}`,
    })
  }
  return match[2]!
}
