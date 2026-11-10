import MarkdownIt from 'markdown-it'
import type { Token } from 'markdown-it'
import { fail } from './diagnostics.js'

export interface ScannedPlayerUsage {
  type: string
  attrs: Record<string, string>
  sourcePath: string
  line?: number
}

export interface ScannedReleaseMarkdown {
  albumSrcPaths: string[]
  players: ScannedPlayerUsage[]
}

const COMPONENT_PATTERN =
  /<(AlbumIdentity|AlbumTracklist|AlbumCredit|AlbumCovers|Player)\b([^>]*)>/g
const ATTRIBUTE_PATTERN = /([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?(?:-->|$)/g

function invalid(message: string, sourcePath: string): never {
  fail({
    severity: 'error',
    code: 'INVALID_RELEASE_MARKDOWN',
    message,
    path: sourcePath,
  })
}

function parseAttributes(
  raw: string,
  component: string,
  sourcePath: string,
): Record<string, string> {
  const attrs: Record<string, string> = Object.create(null)
  let match: RegExpExecArray | null
  ATTRIBUTE_PATTERN.lastIndex = 0
  while ((match = ATTRIBUTE_PATTERN.exec(raw)) !== null) {
    const name = match[1]
    if (Object.hasOwn(attrs, name)) {
      invalid(`${component} contains duplicate attribute "${name}"`, sourcePath)
    }
    attrs[name] = match[2] ?? match[3] ?? ''
  }

  const remainder = raw
    .replace(ATTRIBUTE_PATTERN, '')
    .replace(/\/\s*$/, '')
    .trim()
  if (remainder.length > 0) {
    invalid(
      `${component} attributes must use static quoted values`,
      sourcePath,
    )
  }
  return attrs
}

function htmlTokens(tokens: Token[]): Token[] {
  const result: Token[] = []
  for (const token of tokens) {
    if (token.type === 'html_block' || token.type === 'html_inline') {
      result.push(token)
    }
    if (token.children) result.push(...htmlTokens(token.children))
  }
  return result
}

export function scanReleaseMarkdown(
  markdownSource: string,
  sourcePath: string,
): ScannedReleaseMarkdown {
  const albumSrcPaths: string[] = []
  const players: ScannedPlayerUsage[] = []
  const tokens = htmlTokens(new MarkdownIt({ html: true }).parse(markdownSource, {}))

  for (const token of tokens) {
    const content = token.content.replace(HTML_COMMENT_PATTERN, (comment) =>
      comment.replace(/[^\r\n]/g, ' '),
    )
    COMPONENT_PATTERN.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = COMPONENT_PATTERN.exec(content)) !== null) {
      const component = match[1]
      const attrs = parseAttributes(match[2] ?? '', component, sourcePath)
      const lineOffset = content.slice(0, match.index).split(/\r?\n/).length
      const line = (token.map?.[0] ?? 0) + lineOffset

      if (component === 'Player') {
        const type = attrs.type
        if (!type) invalid('Player requires a static type attribute', sourcePath)
        delete attrs.type
        players.push({ type, attrs, sourcePath, line })
        continue
      }

      const src = attrs.src
      if (!src) {
        invalid(`${component} requires a static src attribute`, sourcePath)
      }
      if (Object.keys(attrs).some((name) => name !== 'src')) {
        invalid(`${component} only accepts a static src attribute`, sourcePath)
      }
      if (!albumSrcPaths.includes(src)) albumSrcPaths.push(src)
    }
  }

  return { albumSrcPaths, players }
}
