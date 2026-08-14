import { isAbsolute, resolve } from 'node:path'
import type { BackgroundLoader } from '../../shared/background.js'
import { extractBackgroundImportSpecifier } from './extract-loader-specifier.js'

export function emitBackgroundsVirtualModule(
  background: BackgroundLoader | undefined,
  configDir: string,
): string {
  if (!background) return 'export default undefined\n'
  const specifier = extractBackgroundImportSpecifier(background)
  const id = isAbsolute(specifier)
    ? specifier
    : resolve(configDir, specifier)
  return `export default () => import(${JSON.stringify(id)})\n`
}
