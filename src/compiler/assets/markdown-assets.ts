import { fail } from '../diagnostics.js'

const MARKDOWN_LINK_RE =
  /!?\[(?:[^\]]*)\]\((?<target><[^>]+>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/g

// Quoted or unquoted: ./ ../ / relatives, plus bare package assets/ refs
const RAW_HTML_RELATIVE_ATTR_RE =
  /\b(?:src|href|poster)\s*=\s*(?:(["'])(?<quoted>(?:\.\.?\/|\/|assets\/)[^"']*)\1|(?<unquoted>(?:\.\.?\/|\/|assets\/)[^\s>"']*))/gi

// PascalCase Vue component tags (Button, ButtonGroup, ...) are not raw
// HTML; their props may carry root-absolute hrefs. Strip tag lines before
// scanning so component props never trip the raw-HTML asset guard.
const VUE_COMPONENT_TAG_RE = /<\/?[A-Z][\w]*(?:\s+[^>]*)?>/g

function normalizeTarget(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

/** Only package asset paths enter the content pipeline. */
function isPackageAssetTarget(target: string): boolean {
  if (!target) return false
  const normalized = target.replace(/\\/g, '/')
  return (
    normalized.startsWith('./assets/') || normalized.startsWith('assets/')
  )
}

export function extractMarkdownAssetRefs(body: string): string[] {
  const refs: string[] = []
  for (const match of body.matchAll(MARKDOWN_LINK_RE)) {
    const target = normalizeTarget(match.groups?.target ?? '')
    if (!isPackageAssetTarget(target)) continue
    if (!refs.includes(target)) refs.push(target)
  }
  return refs
}

export function assertNoRawHtmlRelativeAssets(
  body: string,
  markdownPath: string,
): void {
  const withoutComponentTags = body.replace(VUE_COMPONENT_TAG_RE, '')
  RAW_HTML_RELATIVE_ATTR_RE.lastIndex = 0
  const match = RAW_HTML_RELATIVE_ATTR_RE.exec(withoutComponentTags)
  if (!match) return
  const value =
    match.groups?.quoted ?? match.groups?.unquoted ?? match[2] ?? match[3] ?? ''
  fail({
    severity: 'error',
    code: 'ASSET_RAW_HTML_RELATIVE',
    message: `Raw HTML relative asset attributes are not allowed (${value}). Use Markdown image/link syntax so assets enter the package pipeline.`,
    path: markdownPath,
  })
}
