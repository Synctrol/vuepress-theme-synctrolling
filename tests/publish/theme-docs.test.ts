import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const THEME_SECTIONS = [
  '主题功能',
  '主题重要概念',
  '主题配置方法',
  '主题使用要求',
] as const

const readme = readFileSync(resolve('README.md'), 'utf8')

function stripFences(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '')
}

describe('README theme documentation', () => {
  it('covers the four theme topics', () => {
    for (const title of THEME_SECTIONS) {
      expect(readme).toContain(`## ${title}`)
    }
  })

  it('is a Chinese author guide and does not mention agent files', () => {
    const prose = stripFences(readme)
    expect(prose).not.toMatch(/AGENTS/i)
    expect(prose).not.toMatch(/权威/)
    expect(prose).not.toMatch(/^Requires /m)
    expect(prose).not.toMatch(/Synctrol-specific/)
    expect(prose).not.toMatch(/^## Install$/m)
    expect(prose).not.toMatch(/^## Develop$/m)
    expect(prose).not.toMatch(/tokens-only/i)
    expect(prose).not.toMatch(/does not ship/i)
    expect(prose).not.toMatch(/root language router/i)
    expect(prose).not.toMatch(/Display typography/)
  })

  it('walks through install and config, and states the Synctrol-team scope', () => {
    expect(readme).toContain('### 2. 安装主题')
    expect(readme).toContain('### 3. 写下站点配置')
    expect(readme).toContain('synctrolTheme(')
    expect(readme).toContain('zhMessages')
    expect(readme).toContain('enMessages')
    expect(readme).toContain('topbarText')
    expect(readme).toContain('footbarText')
    expect(readme).toContain('linkCloud')
    expect(readme).toContain('content/')
    expect(readme).toContain('content.yml')
    expect(readme).toContain('::: home-logo')
    expect(readme).toContain('siteUrl')
    expect(readme).toContain('base')
    expect(readme).toMatch(/自行 fork/)
    expect(readme).not.toMatch(/Deploy this repository to GitHub Pages/i)
    expect(readme).not.toMatch(/copyright:\s*['"]/)
    expect(readme).not.toContain('home-footer')
    expect(readme).not.toMatch(/Synctrol\.com/)
  })

  it('documents the album page assembly contract', () => {
    expect(readme).toContain('### 专辑页组件')
    expect(readme).toContain('<AlbumTracklist />')
    expect(readme).toContain('<GiftItem id="poster" />')
    expect(readme).toContain('credit:')
    expect(readme).toContain('catalogNumber')
    expect(readme).toContain('soundcloud_player')
    expect(readme).toContain('specialThanks')
  })
})
