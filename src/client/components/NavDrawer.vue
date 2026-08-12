<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { createFocusTrap, type FocusTrap } from '../a11y/focus-trap.js'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../composables/keys.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import LanguageSwitcher from './LanguageSwitcher.vue'
import Navigation from './Navigation.vue'

const drawerOpen = inject(SYNCTROL_DRAWER_OPEN_KEY) as Ref<boolean>
const { copyright, messages } = useLocaleShell()
const drawerRef = ref<HTMLElement | null>(null)
let trap: FocusTrap | null = null
let opener: HTMLElement | null = null
let activateRaf = 0

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
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
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
    <header class="syn-nav-drawer__bar">
      <p class="syn-nav-drawer__title" :lang="copyright.fellBack ? copyright.locale : undefined">
        {{ copyright.text }}
      </p>
      <button
        type="button"
        class="syn-nav-drawer__close"
        @click="close"
      >
        <svg
          class="syn-nav-drawer__close-icon"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span class="syn-visually-hidden">{{ messages.close }}</span>
      </button>
    </header>
    <div class="syn-nav-drawer__panel">
      <Navigation />
    </div>
    <footer class="syn-nav-drawer__bar syn-nav-drawer__bar--bottom">
      <LanguageSwitcher />
    </footer>
  </div>
</template>
