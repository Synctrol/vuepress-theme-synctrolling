import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readme = readFileSync(resolve('README.md'), 'utf8')

describe('consumer README', () => {
  it('documents install and current compatibility contract', () => {
    expect(readme).toContain('# vuepress-theme-synctrolling')
    expect(readme).toContain('npm install vuepress-theme-synctrolling')
    expect(readme).toContain('^2.0.0-rc.24')
    expect(readme).toContain('^20.9.0 || >=22.0.0')
  })

  it('documents theme config and content layout', () => {
    expect(readme).toContain('synctrolTheme(')
    expect(readme).toContain('zhMessages')
    expect(readme).toContain('enMessages')
    expect(readme).toContain('content/')
    expect(readme).toContain('content.yml')
  })

  it('covers the four theme documentation sections', () => {
    expect(readme).toContain('## 主题功能')
    expect(readme).toContain('## 主题重要概念')
    expect(readme).toContain('## 主题配置方法')
    expect(readme).toContain('## 主题使用要求')
  })

  it('documents CSS export, font policy, and hosting notes in Chinese', () => {
    expect(readme).toContain('vuepress-theme-synctrolling/styles.css')
    expect(readme).toContain('设计令牌')
    expect(readme).toContain('Archivo Black')
    expect(readme).toContain('WOFF2')
    expect(readme).toContain('siteUrl')
    expect(readme).toContain('base')
    expect(readme).toContain('根语言路由器')
    expect(readme).not.toMatch(/Deploy this repository to GitHub Pages/i)
  })
})
