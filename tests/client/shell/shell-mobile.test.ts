import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import ShellLayout from '../../../src/client/components/ShellLayout.vue'
import { mountShell } from '../harness/mount'

/** Extract the body of the first matching `@media (...)` block via brace depth. */
function extractMediaBlock(css: string, query: RegExp): string {
  const header = css.match(query)
  expect(header, `missing @media matching ${query}`).toBeTruthy()
  const openBrace = css.indexOf('{', header!.index! + header![0].length)
  expect(openBrace).toBeGreaterThanOrEqual(0)
  let depth = 0
  for (let i = openBrace; i < css.length; i++) {
    const ch = css[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return css.slice(openBrace + 1, i)
    }
  }
  throw new Error('unbalanced braces in @media block')
}

describe('shell mobile contract', () => {
  it('keeps Main and Footer as sibling shell regions, Navigation also mounted for desktop/drawer', () => {
    const wrapper = mountShell(ShellLayout, {
      slots: { default: '<p>Body</p>' },
    })
    const root = wrapper.get('.syn-shell')
    // happy-dom querySelector does not support :scope; assert direct children instead
    const direct = (cls: string) =>
      [...root.element.children].some((c) =>
        (c as HTMLElement).classList.contains(cls),
      )
    expect(direct('syn-main')).toBe(true)
    expect(direct('syn-site-footer')).toBe(true)
    expect(direct('syn-navigation')).toBe(true)
    expect(root.find('.syn-nav-drawer .syn-navigation').exists()).toBe(true)
  })

  it('encodes mobile flow without dock clearance padding in CSS', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toContain('@media (max-width: 768px)')
    expect(css).not.toContain('padding-bottom: var(--syn-dock-content-clearance)')
    // Isolate the ≤768px block brace-aware so a desktop-level hide rule cannot pass.
    const mobile = extractMediaBlock(
      css,
      /@media\s*\(\s*max-width:\s*768px\s*\)/,
    )
    expect(mobile).toMatch(
      /\.syn-shell\s*>\s*\.syn-navigation\s*,\s*\.syn-shell\s*>\s*\.syn-side-panel\s*\{[^}]*display:\s*none/,
    )
  })
})
