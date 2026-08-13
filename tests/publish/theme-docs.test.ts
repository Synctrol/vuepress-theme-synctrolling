import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const THEME_SECTIONS = [
  '主题功能',
  '主题重要概念',
  '主题配置方法',
  '主题使用要求',
] as const

const agents = readFileSync(resolve('AGENTS.md'), 'utf8')
const readme = readFileSync(resolve('README.md'), 'utf8')

function extractH2Section(markdown: string, title: string): string {
  const heading = `## ${title}`
  const start = markdown.indexOf(`\n${heading}\n`)
  const atStart = markdown.startsWith(`${heading}\n`) ? 0 : -1
  const headingIndex = atStart === 0 ? 0 : start === -1 ? -1 : start + 1
  if (headingIndex === -1) {
    throw new Error(`Missing heading: ${heading}`)
  }
  const fromHeading = markdown.slice(headingIndex)
  const afterFirstLine = fromHeading.indexOf('\n')
  const bodyStart = afterFirstLine === -1 ? fromHeading.length : afterFirstLine + 1
  const rest = fromHeading.slice(bodyStart)
  const next = rest.search(/\n## /)
  return (next === -1 ? rest : rest.slice(0, next)).trim()
}

describe('AGENTS.md and README theme documentation', () => {
  it('keeps the four theme sections present and identical', () => {
    for (const title of THEME_SECTIONS) {
      expect(agents).toContain(`## ${title}`)
      expect(readme).toContain(`## ${title}`)
      expect(extractH2Section(agents, title)).toBe(extractH2Section(readme, title))
    }
  })

  it('documents current theme contracts in the shared sections', () => {
    const shared = THEME_SECTIONS.map((title) =>
      extractH2Section(readme, title),
    ).join('\n')

    expect(shared).toContain('synctrolTheme(')
    expect(shared).toContain('zhMessages')
    expect(shared).toContain('enMessages')
    expect(shared).toContain('topbarText')
    expect(shared).toContain('footbarText')
    expect(shared).toContain('featureFont')
    expect(shared).toContain('linkCloud')
    expect(shared).toContain('content/')
    expect(shared).toContain('content.yml')
    expect(shared).toContain('::: home-logo')
    expect(shared).toContain('vuepress-theme-synctrolling/styles.css')
    expect(shared).toMatch(/tokens-only/i)
    expect(shared).toMatch(/Archivo Black/)
    expect(shared).toMatch(/does not ship.*WOFF2/i)
    expect(shared).toContain('siteUrl')
    expect(shared).toContain('base')
    expect(shared).toMatch(/root language router|root router/i)
    expect(shared).not.toMatch(/Deploy this repository to GitHub Pages/i)
    expect(shared).not.toContain('copyright:')
    expect(shared).not.toContain('home-footer')
  })
})
