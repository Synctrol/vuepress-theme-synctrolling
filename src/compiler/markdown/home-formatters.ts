import type { MarkdownIt as MarkdownItApi, Token } from 'markdown-it'
import container from 'markdown-it-container'

const HOME_LOGO_FENCE = /^:{3,}\s*home-logo\s*$/m

function registerFormatterContainer(md: MarkdownItApi, name: string): void {
  md.use(container, name, {
    render(tokens: Token[], idx: number) {
      if (tokens[idx]?.nesting === 1) {
        return `<div class="syn-formatter syn-formatter--${name}" data-syn-formatter="${name}">\n`
      }
      return '</div>\n'
    },
  })
}

export function registerHomeFormatters(md: MarkdownItApi): void {
  registerFormatterContainer(md, 'home-logo')
}

export function assertHomeHasLogo(markdownSource: string, filePath: string): void {
  if (!HOME_LOGO_FENCE.test(markdownSource)) {
    throw new Error(
      `Home markdown must include a home-logo formatter fence (${filePath})`,
    )
  }
}
