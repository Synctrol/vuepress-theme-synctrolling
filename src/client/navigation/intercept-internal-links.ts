import type { Router } from 'vue-router'
import type { SoundKey } from '../../shared/options.js'
import { SYNCTROL_DRAWER_REQUEST_CLOSE } from '../components/drawer-events.js'

const INTERNAL_ORIGIN = 'http://internal.local'

/** Optional cue hooks wired to the interaction sound runtime. */
export interface LinkClickSoundHooks {
  play(key: SoundKey): void
  suppressNextNavigation(): void
}

/**
 * Resolve an `<a href>` value to a vue-router path (base-stripped), or return
 * `null` when the link is not an internal route navigation (external URL,
 * protocol-relative URL, hash-only, query-only, mailto:, relative path, …).
 */
export function resolveRoutePathFromHref(
  href: string,
  base: string,
): string | null {
  if (!href.startsWith('/')) return null

  let url: URL
  try {
    url = new URL(href, INTERNAL_ORIGIN)
  } catch {
    return null
  }
  // Protocol-relative URLs (`//host/path`) resolve to a different origin.
  if (url.origin !== INTERNAL_ORIGIN) return null

  let path = url.pathname + url.search + url.hash
  if (base !== '/') {
    path = path.startsWith(base) ? path.slice(base.length - 1) : path
  }
  return path
}

/** Pure click predicate: true when the click should become a `router.push`. */
export function shouldInterceptClick(
  event: {
    defaultPrevented: boolean
    button: number
    metaKey: boolean
    ctrlKey: boolean
    shiftKey: boolean
    altKey: boolean
  },
  anchor: Element,
): boolean {
  if (event.defaultPrevented) return false
  if (event.button !== 0) return false
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false
  }
  const target = anchor.getAttribute('target')
  if (target && target.toLowerCase() === '_blank') return false
  if (anchor.hasAttribute('download')) return false
  return true
}

/**
 * Install a document-level click listener that turns internal `<a href>`
 * clicks into SPA navigations. Returns a cleanup function.
 *
 * When `sounds` hooks are provided, clicks are classified so each intent
 * keeps its own cue:
 * - a link inside the open mobile drawer asks the drawer to close (its
 *   `menuClose` cue plays once through the drawer, and its navigation cue is
 *   suppressed);
 * - a pagination link (marked `data-syn-sound-kind="paginate"`) plays
 *   `paginate` and suppresses its navigation cue;
 * - any other internal click keeps the route-change `navigate` cue.
 */
export function installInternalLinkInterception(
  router: Router,
  base: string,
  sounds?: LinkClickSoundHooks,
): () => void {
  const onClick = (event: MouseEvent) => {
    const anchor = (event.target as Element | null)?.closest?.('a[href]')
    if (!anchor) return
    if (!shouldInterceptClick(event, anchor)) return
    const href = anchor.getAttribute('href')
    if (!href) return
    const routePath = resolveRoutePathFromHref(href, base)
    if (routePath === null) return
    event.preventDefault()
    if (sounds) {
      const drawer = anchor.closest('.syn-nav-drawer')
      const drawerOpen =
        drawer !== null && drawer.getAttribute('aria-hidden') === 'false'
      const paginate =
        anchor.closest('[data-syn-sound-kind="paginate"]') !== null
      if (drawerOpen) {
        sounds.suppressNextNavigation()
        drawer.dispatchEvent(
          new CustomEvent(SYNCTROL_DRAWER_REQUEST_CLOSE, { bubbles: true }),
        )
      } else if (paginate) {
        sounds.play('paginate')
        sounds.suppressNextNavigation()
      }
    }
    void router.push(routePath).catch(() => {})
  }
  document.addEventListener('click', onClick)
  return () => {
    document.removeEventListener('click', onClick)
  }
}
