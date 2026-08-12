import MarkdownIt from 'markdown-it'
import type { CompiledPage } from '../../shared/route-types.js'
import type { RouteContentPackage } from '../../shared/types.js'
import type { SynctrolHomeFrontmatter } from '../../shared/types/news.js'
import { registerHomeFormatters } from '../markdown/home-formatters.js'
import { extractHomeFormatterHtml } from './extract-home-formatter-html.js'

export interface BuildHomeFrontmatterInput {
  compiled: CompiledPage
  packages: readonly RouteContentPackage[]
}

function findHomePackage(
  compiled: CompiledPage,
  packages: readonly RouteContentPackage[],
): RouteContentPackage | undefined {
  return packages.find(
    (pkg) =>
      pkg.type === 'home' &&
      (pkg.identity === compiled.identity ||
        (compiled.packagePath !== undefined && pkg.dir === compiled.packagePath)),
  )
}

export function buildHomeFrontmatterForPage(
  input: BuildHomeFrontmatterInput,
): SynctrolHomeFrontmatter | null {
  const { compiled, packages } = input

  if (compiled.contentType !== 'home') {
    return null
  }

  const pkg = findHomePackage(compiled, packages)
  if (pkg === undefined) {
    return null
  }

  const body = pkg.locales[compiled.bodyLocale]
  if (body === undefined) {
    throw new Error(`Missing ${compiled.bodyLocale} markdown for ${pkg.identity}`)
  }

  const md = new MarkdownIt()
  registerHomeFormatters(md)
  const extracted = extractHomeFormatterHtml(md.render(body.body))

  return {
    kind: 'home',
    logoHtml: extracted.logoHtml,
    ...(extracted.footerHtml === undefined
      ? {}
      : { footerHtml: extracted.footerHtml }),
  }
}
