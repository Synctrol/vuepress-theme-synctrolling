const FORMATTER_NAMES = ['home-logo'] as const

type FormatterName = (typeof FORMATTER_NAMES)[number]

function openingTag(name: FormatterName): string {
  return `<div class="syn-formatter syn-formatter--${name}" data-syn-formatter="${name}">`
}

function extractNamedFormatter(
  renderedHtml: string,
  name: FormatterName,
): string | undefined {
  const open = openingTag(name)
  const start = renderedHtml.indexOf(open)
  if (start === -1) return undefined

  let depth = 0
  let i = start
  while (i < renderedHtml.length) {
    const nextOpen = renderedHtml.indexOf('<div', i)
    const nextClose = renderedHtml.indexOf('</div>', i)

    if (nextClose === -1) {
      throw new Error(`Unclosed syn-formatter wrapper for ${name}`)
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1
      i = nextOpen + 4
      continue
    }

    depth -= 1
    const end = nextClose + '</div>'.length
    if (depth === 0) {
      return renderedHtml.slice(start, end)
    }
    i = end
  }

  throw new Error(`Unclosed syn-formatter wrapper for ${name}`)
}

function toReferenceLogoHtml(logoHtml: string): string {
  return logoHtml
    .replace(/<h1>/, '<h1 class="logo">')
    .replace(/<p>([\s\S]*?)<\/p>/, (_match: string, inner: string) => {
      const lines = inner
        .split(/<br\s*\/?>/i)
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter((line) => line.length > 0)
      return lines
        .map((line) => `<p class="logo-sub">${line}</p>`)
        .join('\n')
    })
}

export function extractHomeFormatterHtml(renderedHtml: string): {
  logoHtml: string
} {
  const extracted = extractNamedFormatter(renderedHtml, 'home-logo')
  if (extracted === undefined) {
    throw new Error('Rendered Home markdown is missing home-logo formatter HTML')
  }
  return { logoHtml: toReferenceLogoHtml(extracted) }
}
