import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import ShellLayout from '../../../src/client/components/ShellLayout.vue'
import { mountShell } from '../harness/mount'

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

  it('encodes mobile flow and dock clearance as padding in CSS', () => {
    const css = readFileSync(resolve('src/client/styles/shell.css'), 'utf8')
    expect(css).toContain('@media (max-width: 768px)')
    expect(css).toContain('padding-bottom: var(--syn-dock-content-clearance)')
    // Tie hide rule to `.syn-shell > .syn-navigation` inside the mobile media block
    // (not an unrelated `display: none` elsewhere in shell.css).
    expect(css).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.syn-shell\s*>\s*\.syn-navigation\s*\{[^}]*display:\s*none/,
    )
  })
})
