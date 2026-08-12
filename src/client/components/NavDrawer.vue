<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { createFocusTrap, type FocusTrap } from '../a11y/focus-trap.js'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../composables/keys.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import Navigation from './Navigation.vue'

const drawerOpen = inject(SYNCTROL_DRAWER_OPEN_KEY) as Ref<boolean>
const { messages } = useLocaleShell()
const panelRef = ref<HTMLElement | null>(null)
let trap: FocusTrap | null = null
let opener: HTMLElement | null = null

function close(): void {
  drawerOpen.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && drawerOpen.value) {
    event.preventDefault()
    close()
  }
}

watch(drawerOpen, async (open) => {
  if (open) {
    opener = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => {
      if (!panelRef.value) return
      trap = createFocusTrap(panelRef.value, { restoreFocus: opener })
      trap.activate()
    })
  } else {
    trap?.deactivate()
    trap = null
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  trap?.deactivate()
})
</script>

<template>
  <div
    class="syn-nav-drawer"
    role="dialog"
    aria-modal="true"
    :aria-label="messages.menu"
    :aria-hidden="drawerOpen ? 'false' : 'true'"
  >
    <button
      type="button"
      class="syn-nav-drawer__close"
      @click="close"
    >
      {{ messages.close }}
    </button>
    <div ref="panelRef" class="syn-nav-drawer__panel">
      <Navigation />
    </div>
  </div>
</template>
