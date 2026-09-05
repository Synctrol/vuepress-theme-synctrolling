<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { createFocusTrap, type FocusTrap } from '../a11y/focus-trap.js'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../composables/keys.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import { playSound } from '../sounds/runtime.js'
import { SYNCTROL_DRAWER_REQUEST_CLOSE } from './drawer-events.js'
import Navigation from './Navigation.vue'

const drawerOpen = inject(SYNCTROL_DRAWER_OPEN_KEY) as Ref<boolean>
const { messages } = useLocaleShell()
const drawerRef = ref<HTMLElement | null>(null)
let trap: FocusTrap | null = null
let opener: HTMLElement | null = null
let activateRaf = 0
let mobileMedia: MediaQueryList | null = null
let resizeObserver: ResizeObserver | null = null

function cancelActivateRaf(): void {
  if (activateRaf) {
    cancelAnimationFrame(activateRaf)
    activateRaf = 0
  }
}

function close(): void {
  if (!drawerOpen.value) return
  drawerOpen.value = false
  playSound('menuClose')
}

function onDrawerRequestClose(): void {
  close()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && drawerOpen.value) {
    event.preventDefault()
    close()
  }
}

// Crossing back to desktop hides the menu button and the drawer, so
// close the drawer to avoid a stuck open state.
function onViewportChange(event: MediaQueryListEvent): void {
  if (!event.matches && drawerOpen.value) {
    close()
  }
}

watch(
  drawerOpen,
  async (open) => {
    if (open) {
      opener = document.activeElement as HTMLElement | null
      cancelActivateRaf()
      activateRaf = requestAnimationFrame(() => {
        activateRaf = 0
        if (!drawerOpen.value || !drawerRef.value) return
        trap = createFocusTrap(drawerRef.value, { restoreFocus: opener })
        trap.activate()
      })
    } else {
      cancelActivateRaf()
      trap?.deactivate()
      trap = null
    }
  },
  { immediate: true },
)

// The drawer is fixed to the viewport between the bars, so its height is
// never driven by the (possibly very long) main content.
function syncDrawerBounds(): void {
  const root = document.documentElement
  const header = document.querySelector('.syn-header')
  const footer = document.querySelector('.syn-site-footer')
  if (header) {
    root.style.setProperty(
      '--syn-drawer-top',
      `${header.getBoundingClientRect().height}px`,
    )
  }
  if (footer) {
    root.style.setProperty(
      '--syn-drawer-bottom',
      `${footer.getBoundingClientRect().height}px`,
    )
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  drawerRef.value?.addEventListener(
    SYNCTROL_DRAWER_REQUEST_CLOSE,
    onDrawerRequestClose,
  )
  mobileMedia = window.matchMedia('(max-width: 768px)')
  mobileMedia.addEventListener('change', onViewportChange)

  syncDrawerBounds()
  window.addEventListener('resize', syncDrawerBounds)
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(syncDrawerBounds)
    const header = document.querySelector('.syn-header')
    const footer = document.querySelector('.syn-site-footer')
    if (header) resizeObserver.observe(header)
    if (footer) resizeObserver.observe(footer)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  drawerRef.value?.removeEventListener(
    SYNCTROL_DRAWER_REQUEST_CLOSE,
    onDrawerRequestClose,
  )
  mobileMedia?.removeEventListener('change', onViewportChange)
  window.removeEventListener('resize', syncDrawerBounds)
  resizeObserver?.disconnect()
  cancelActivateRaf()
  trap?.deactivate()
})
</script>

<template>
  <div
    ref="drawerRef"
    class="syn-nav-drawer"
    role="dialog"
    aria-modal="true"
    :aria-label="messages.menu"
    :aria-hidden="drawerOpen ? 'false' : 'true'"
  >
    <Navigation />
  </div>
</template>
