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

function stripFences(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '')
}

describe('AGENTS.md and README theme documentation', () => {
  it('covers the same four theme topics in both files', () => {
    for (const title of THEME_SECTIONS) {
      expect(agents).toContain(`## ${title}`)
      expect(readme).toContain(`## ${title}`)
    }
  })

  it('keeps README prose in Chinese', () => {
    const prose = stripFences(readme)
    expect(prose).not.toMatch(/^Requires /m)
    expect(prose).not.toMatch(/Synctrol-specific/)
    expect(prose).not.toMatch(/^## Install$/m)
    expect(prose).not.toMatch(/^## Develop$/m)
    expect(prose).not.toMatch(/tokens-only/i)
    expect(prose).not.toMatch(/does not ship/i)
    expect(prose).not.toMatch(/root language router/i)
    expect(prose).not.toMatch(/Display typography/)
  })

  it('documents current theme contracts for site authors', () => {
    expect(readme).toContain('synctrolTheme(')
    expect(readme).toContain('zhMessages')
    expect(readme).toContain('enMessages')
    expect(readme).toContain('topbarText')
    expect(readme).toContain('footbarText')
    expect(readme).toContain('featureFont')
    expect(readme).toContain('linkCloud')
    expect(readme).toContain('content/')
    expect(readme).toContain('content.yml')
    expect(readme).toContain('::: home-logo')
    expect(readme).toContain('vuepress-theme-synctrolling/styles.css')
    expect(readme).toContain('设计令牌')
    expect(readme).toContain('Archivo Black')
    expect(readme).toContain('WOFF2')
    expect(readme).toContain('siteUrl')
    expect(readme).toContain('base')
    expect(readme).toContain('根语言路由器')
    expect(readme).not.toMatch(/Deploy this repository to GitHub Pages/i)
    expect(readme).not.toContain('copyright:')
    expect(readme).not.toContain('home-footer')
  })
})
