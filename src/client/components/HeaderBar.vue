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
        {{ messages.menu }}
      </button>
    </div>
  </header>
</template>
