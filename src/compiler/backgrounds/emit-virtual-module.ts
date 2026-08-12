import { isAbsolute, resolve } from 'node:path'
import type { BackgroundLoader } from '../../shared/background.js'
import type { ContentType } from '../../shared/types.js'
import { extractBackgroundImportSpecifier } from './extract-loader-specifier.js'

const KEYS: ContentType[] = ['home', 'release', 'news', 'page']

export function emitBackgroundsVirtualModule(
  backgrounds: Partial<Record<ContentType, BackgroundLoader>>,
  configDir: string,
): string {
  const lines: string[] = []
  for (const key of KEYS) {
    const loader = backgrounds[key]
    if (!loader) continue
    const specifier = extractBackgroundImportSpecifier(loader, key)
    const id = isAbsolute(specifier)
      ? specifier
      : resolve(configDir, specifier)
    lines.push(`  ${key}: () => import(${JSON.stringify(id)})`)
  }
  if (lines.length === 0) return 'export default {}\n'
  return `export default {\n${lines.join(',\n')}\n}\n`
}
