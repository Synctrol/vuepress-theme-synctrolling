import type { Router } from 'vue-router'

const INTERNAL_ORIGIN = 'http://internal.local'

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
 */
export function installInternalLinkInterception(
  router: Router,
  base: string,
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
    void router.push(routePath).catch(() => {})
  }
  document.addEventListener('click', onClick)
  return () => {
    document.removeEventListener('click', onClick)
  }
}
