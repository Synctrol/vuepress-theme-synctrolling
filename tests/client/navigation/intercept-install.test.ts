import { describe, expect, it, vi } from 'vitest'
import { installInternalLinkInterception } from '../../../src/client/navigation/intercept-internal-links'
import { SYNCTROL_DRAWER_REQUEST_CLOSE } from '../../../src/client/components/drawer-events'
import type { SoundKey } from '../../../src/shared/options'

function fakeRouter() {
  const push = vi.fn(async () => {})
  return { push }
}

function setupDom(html: string): () => void {
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.appendChild(host)
  return () => {
    host.remove()
  }
}

function clickAnchor(href: string): void {
  const anchor = document.querySelector<HTMLAnchorElement>(`a[href="${href}"]`)!
  anchor.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }),
  )
}

describe('installInternalLinkInterception sound classification', () => {
  it('keeps a plain internal click silent at cue level (navigate is routed by afterEach)', () => {
    const cleanupDom = setupDom('<a href="/zh/a/" class="link">A</a>')
    const router = fakeRouter()
    const played: SoundKey[] = []
    const suppressed: Array<() => void> = []
    const hooks = {
      play: (key: SoundKey) => played.push(key),
      suppressNextNavigation: () => suppressed.push(() => {}),
    }
    const cleanup = installInternalLinkInterception(router as never, '/', hooks)
    clickAnchor('/zh/a/')
    expect(router.push).toHaveBeenCalledWith('/zh/a/')
    expect(played).toEqual([])
    cleanup()
    cleanupDom()
  })

  it('plays paginate and suppresses navigation for pagination links', () => {
    const cleanupDom = setupDom(
      '<span data-syn-sound-kind="paginate"><a href="/zh/news/page/2/" class="next">N</a></span>',
    )
    const router = fakeRouter()
    const played: SoundKey[] = []
    const suppressed = vi.fn()
    const cleanup = installInternalLinkInterception(router as never, '/', {
      play: (key) => played.push(key),
      suppressNextNavigation: suppressed,
    })
    clickAnchor('/zh/news/page/2/')
    expect(played).toEqual(['paginate'])
    expect(suppressed).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith('/zh/news/page/2/')
    cleanup()
    cleanupDom()
  })

  it('requests drawer close and suppresses navigation without playing (close cue is the drawer itself)', () => {
    const cleanupDom = setupDom(`
      <div class="syn-nav-drawer" aria-hidden="false">
        <a href="/zh/news/" class="nav">NEWS</a>
      </div>
    `)
    const router = fakeRouter()
    const played: SoundKey[] = []
    const suppressed = vi.fn()
    const closeRequests = vi.fn()
    document.querySelector<HTMLElement>('.syn-nav-drawer')!.addEventListener(
      SYNCTROL_DRAWER_REQUEST_CLOSE,
      closeRequests,
    )
    const cleanup = installInternalLinkInterception(router as never, '/', {
      play: (key) => played.push(key),
      suppressNextNavigation: suppressed,
    })
    clickAnchor('/zh/news/')
    expect(played).toEqual([])
    expect(suppressed).toHaveBeenCalledTimes(1)
    expect(closeRequests).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith('/zh/news/')
    cleanup()
    cleanupDom()
  })

  it('does not play the drawer cue when the drawer is closed', () => {
    const cleanupDom = setupDom(`
      <div class="syn-nav-drawer" aria-hidden="true">
        <a href="/zh/news/" class="nav">NEWS</a>
      </div>
    `)
    const router = fakeRouter()
    const played: SoundKey[] = []
    const cleanup = installInternalLinkInterception(router as never, '/', {
      play: (key) => played.push(key),
      suppressNextNavigation: () => {},
    })
    clickAnchor('/zh/news/')
    expect(played).toEqual([])
    cleanup()
    cleanupDom()
  })

  it('is a no-op when no hooks are provided (feature dormant)', () => {
    const cleanupDom = setupDom(
      '<span data-syn-sound-kind="paginate"><a href="/zh/news/page/2/" class="next">N</a></span>',
    )
    const router = fakeRouter()
    const cleanup = installInternalLinkInterception(router as never, '/')
    clickAnchor('/zh/news/page/2/')
    expect(router.push).toHaveBeenCalledWith('/zh/news/page/2/')
    cleanup()
    cleanupDom()
  })
})
