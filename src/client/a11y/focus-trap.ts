const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'

export interface FocusTrap {
  activate(): void
  deactivate(): void
}

export function createFocusTrap(
  container: HTMLElement,
  options: { restoreFocus?: HTMLElement | null } = {},
): FocusTrap {
  let active = false

  function focusables(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
    )
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!active || event.key !== 'Tab') return
    const items = focusables()
    if (items.length === 0) {
      event.preventDefault()
      return
    }
    const first = items[0]!
    const last = items[items.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return {
    activate() {
      if (active) return
      active = true
      container.addEventListener('keydown', onKeydown)
      const items = focusables()
      items[0]?.focus()
    },
    deactivate() {
      if (!active) return
      active = false
      container.removeEventListener('keydown', onKeydown)
      options.restoreFocus?.focus()
    },
  }
}
