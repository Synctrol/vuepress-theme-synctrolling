<script setup lang="ts">
import { inject, type Ref } from 'vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../composables/keys.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import ThemeMode from './ThemeMode.vue'

const drawerOpen = inject(SYNCTROL_DRAWER_OPEN_KEY) as Ref<boolean>
const { copyright, messages } = useLocaleShell()

function toggleMenu(): void {
  drawerOpen.value = !drawerOpen.value
}
</script>

<template>
  <header class="syn-header">
    <p
      class="syn-header__copyright"
      :lang="copyright.fellBack ? copyright.locale : undefined"
    >
      {{ copyright.text }}
    </p>
    <div class="syn-header__controls">
      <ThemeMode />
      <button
        type="button"
        class="syn-header__menu"
        :aria-expanded="drawerOpen ? 'true' : 'false'"
        :aria-label="messages.menu"
        @click="toggleMenu"
      >
        <svg
          class="syn-header__menu-icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span class="syn-visually-hidden">{{ messages.menu }}</span>
      </button>
    </div>
  </header>
</template>
