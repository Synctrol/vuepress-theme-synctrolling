import {
  matchBrowserLocale,
  normalizeLanguageTag,
  toLocaleTable,
} from '../shared/match-browser-locale.js'
import { LOCALE_STORAGE_KEY } from '../shared/locale-storage.js'
import { resolveMultilanguage } from '../shared/multilanguage.js'
import type { ResolvedSynctrolThemeOptions } from '../shared/options.js'
import { joinPublicPath, normalizeBase } from '../shared/route-path.js'
import { encodeRouteSegment } from './path-suffix.js'

export { LOCALE_STORAGE_KEY }

export interface RootRouterInput {
  options: Pick<
    ResolvedSynctrolThemeOptions,
    'locales' | 'mainLocale' | 'seo'
  >
  base: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * JSON that is safe to inline inside a <script> element: neither an unvalidated
 * `lang` nor a base can terminate the element or break the JS parser.
 */
function serializeForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function localeHomePublicPaths(
  locales: ResolvedSynctrolThemeOptions['locales'],
  base: string,
): Record<string, string> {
  const homes: Record<string, string> = {}
  for (const key of Object.keys(locales)) {
    homes[key] = joinPublicPath(
      base,
      `/${encodeRouteSegment(key, 'locale')}/`,
    )
  }
  return homes
}

/**
 * Serializes the shared negotiation functions so the browser runs the exact
 * algorithm the Node compiler tests. Never hand-write a second copy.
 *
 * Redirect targets come from `cfg.homes[locale]` (encoded publicPath), not from
 * concatenating the raw locale key into a URL.
 */
export function buildRootRouterScript(): string {
  return [
    '(function () {',
    '  var cfg = window.__SYNCTROL_ROOT_ROUTER__;',
    '  if (!cfg) { return; }',
    `  var normalizeLanguageTag = ${normalizeLanguageTag.toString()};`,
    `  var matchBrowserLocale = ${matchBrowserLocale.toString()};`,
    `  var storageKey = ${JSON.stringify(LOCALE_STORAGE_KEY)};`,
    '  var known = cfg.locales.map(function (entry) { return entry.key; });',
    '  var stored = null;',
    '  try { stored = localStorage.getItem(storageKey); } catch (error) { stored = null; }',
    '  var locale = stored && known.indexOf(stored) !== -1 ? stored : null;',
    '  if (!locale) {',
    '    var preferences = navigator.languages && navigator.languages.length',
    '      ? navigator.languages',
    '      : (navigator.language ? [navigator.language] : []);',
    '    locale = matchBrowserLocale(preferences, cfg.locales, cfg.mainLocale);',
    '  }',
    '  var target = cfg.homes && cfg.homes[locale];',
    '  if (!target) { return; }',
    '  location.replace(target);',
    '})();',
  ].join('\n')
}

export function generateRootRouterHtml(input: RootRouterInput): string {
  const base = normalizeBase(input.base)
  const mainLang = input.options.locales[input.options.mainLocale]?.lang ?? 'en'
  const title = resolveMultilanguage(
    input.options.seo.name,
    input.options.mainLocale,
    input.options.mainLocale,
  ).text
  const homes = localeHomePublicPaths(input.options.locales, base)

  const links = Object.entries(input.options.locales)
    .map(([key, locale]) => {
      const href = escapeHtml(homes[key]!)
      const lang = escapeHtml(locale.lang)
      return `      <li><a href="${href}" lang="${lang}" hreflang="${lang}">${escapeHtml(locale.label)}</a></li>`
    })
    .join('\n')

  const config = serializeForScript({
    mainLocale: input.options.mainLocale,
    base,
    locales: toLocaleTable(input.options.locales),
    homes,
  })

  return `<!DOCTYPE html>
<html lang="${escapeHtml(mainLang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <script>window.__SYNCTROL_ROOT_ROUTER__ = ${config};</script>
  <script>${buildRootRouterScript()}</script>
</head>
<body>
  <nav aria-label="${escapeHtml(title)}">
    <ul>
${links}
    </ul>
  </nav>
</body>
</html>
`
}
