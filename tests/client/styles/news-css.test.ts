import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('news.css', () => {
  const css = readFileSync(resolve('src/client/styles/news.css'), 'utf8')

  it('separates news list items with a subtle top rule', () => {
    expect(css).toMatch(/\.syn-news-list-item\s*\{[^}]*border-block-start:\s*var\(--syn-border-subtle\)/)
    expect(css).toMatch(/\.syn-news-list-item:first-child\s*\{[^}]*border-block-start:\s*0/)
  })

  it('styles titles without the display font and dims dates and descriptions', () => {
    expect(css).not.toMatch(/\.syn-news-list-item__title\s*\{[^}]*font-family:\s*var\(--syn-font-display\)/)
    expect(css).toMatch(/\.syn-news-list-item__date\s*\{[^}]*color:\s*var\(--syn-sub-title-fg\)/)
    expect(css).toMatch(/\.syn-news-list-item__description\s*\{[^}]*color:\s*var\(--syn-sub-title-fg\)/)
  })

  it('lays cover items out in two columns and styles tag links', () => {
    expect(css).toMatch(/\.syn-news-list-item\[data-layout='cover'\]\s*\{[^}]*display:\s*grid/)
    expect(css).toMatch(/\.syn-news-list-item__tags\s*\{[^}]*display:\s*flex/)
  })
})
