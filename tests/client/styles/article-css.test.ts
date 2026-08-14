import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('article.css', () => {
  const css = readFileSync(resolve('src/client/styles/article.css'), 'utf8')

  it('centers the article meta between subtle rules', () => {
    expect(css).toMatch(/\.syn-article-meta\s*\{[^}]*text-align:\s*center/)
    expect(css).toMatch(/\.syn-article-meta\s*\{[^}]*border-block-start:\s*var\(--syn-border-subtle\)/)
    expect(css).toMatch(/\.syn-article-meta\s*\{[^}]*border-block-end:\s*var\(--syn-border-subtle\)/)
  })

  it('styles meta and news list tag links like the link cloud', () => {
    expect(css).toMatch(/\.syn-article-meta__tags\s+a,\s*\.syn-news-list-item__tags\s+a\s*\{[^}]*color:\s*var\(--syn-fg\)/)
    expect(css).toMatch(/\.syn-article-meta__tags\s+a,\s*\.syn-news-list-item__tags\s+a\s*\{[^}]*text-decoration:\s*underline/)
  })

  it('defines shared article body typography for classless markdown blocks', () => {
    expect(css).toMatch(/\.syn-article-body\s*>\s*div\s*>\s*h2:not\(\[class\]\)\s*\{[^}]*font-family:\s*var\(--syn-font-display\)/)
    expect(css).toMatch(/\.syn-article-body\s*>\s*div\s*>\s*p:not\(\[class\]\)\s*\{[^}]*margin-block:\s*0\.75rem/)
    expect(css).toMatch(/\.syn-article-body\s*>\s*div\s*>\s*blockquote:not\(\[class\]\)\s*\{[^}]*border-inline-start:\s*var\(--syn-border-strong\)/)
    expect(css).toMatch(/\.syn-article-body\s*>\s*div\s*>\s*pre:not\(\[class\]\)\s*\{[^}]*border:\s*var\(--syn-border-subtle\)/)
    expect(css).toMatch(/\.syn-article-body\s+a:not\(\[class\]\)\s*\{[^}]*text-decoration:\s*underline/)
    expect(css).toMatch(/\.syn-article-body\s+code\s*\{[^}]*font-family:\s*ui-monospace/)
    expect(css).toMatch(/\.syn-article-body\s*>\s*div\s*>\s*img:not\(\[class\]\)\s*\{[^}]*max-width:\s*100%/)
  })
})
