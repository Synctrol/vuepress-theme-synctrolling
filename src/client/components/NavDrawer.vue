<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { createFocusTrap, type FocusTrap } from '../a11y/focus-trap.js'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../composables/keys.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import Navigation from './Navigation.vue'

const drawerOpen = inject(SYNCTROL_DRAWER_OPEN_KEY) as Ref<boolean>
const { messages } = useLocaleShell()
const drawerRef = ref<HTMLElement | null>(null)
let trap: FocusTrap | null = null
let opener: HTMLElement | null = null
let activateRaf = 0
let mobileMedia: MediaQueryList | null = null

function cancelActivateRaf(): void {
  if (activateRaf) {
    cancelAnimationFrame(activateRaf)
    activateRaf = 0
  }
}

function close(): void {
  drawerOpen.value = false
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

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  mobileMedia = window.matchMedia('(max-width: 768px)')
  mobileMedia.addEventListener('change', onViewportChange)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  mobileMedia?.removeEventListener('change', onViewportChange)
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
