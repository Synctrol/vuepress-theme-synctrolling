import { describe, expect, it } from 'vitest'
import { createFocusTrap } from '../../../src/client/a11y/focus-trap'

describe('createFocusTrap', () => {
  it('cycles Tab within the container and restores focus on deactivate', () => {
    // Avoid id="opener": happy-dom maps element ids onto window and
    // window.opener is a read-only getter.
    document.body.innerHTML = `
      <button id="open-btn">open</button>
      <div id="panel">
        <button id="a">A</button>
        <button id="b">B</button>
      </div>
    `
    const openBtn = document.getElementById('open-btn') as HTMLButtonElement
    const panel = document.getElementById('panel') as HTMLElement
    openBtn.focus()

    const trap = createFocusTrap(panel, { restoreFocus: openBtn })
    trap.activate()
    expect(document.activeElement?.id).toBe('a')

    const b = document.getElementById('b') as HTMLButtonElement
    b.focus()
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    )
    expect(document.activeElement?.id).toBe('a')

    trap.deactivate()
    expect(document.activeElement?.id).toBe('open-btn')
  })
})
