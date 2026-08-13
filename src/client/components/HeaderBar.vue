<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { SYNCTROL_DRAWER_OPEN_KEY } from '../composables/keys.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'
import { encodePathSegment } from '../../compiler/path-suffix.js'
import ThemeMode from './ThemeMode.vue'

const drawerOpen = inject(SYNCTROL_DRAWER_OPEN_KEY) as Ref<boolean>
const { theme, shell, locale, topbarText, messages } = useLocaleShell()

const homeHref = computed(() =>
  joinPublicPath(
    normalizeBase(shell.base),
    `/${encodePathSegment(locale.value)}/`,
  ),
)

function toggleMenu(): void {
  drawerOpen.value = !drawerOpen.value
}
</script>

<template>
  <header class="syn-header">
    <div class="syn-header__leading">
      <a
        class="syn-header__home"
        :href="homeHref"
        :aria-label="messages.home"
      >
        <svg
          class="syn-header__home-icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <g transform="translate(1.8 1.8) scale(0.85)">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </g>
        </svg>
        <span class="syn-visually-hidden">{{ messages.home }}</span>
      </a>
      <p
        class="syn-topbar-text"
        :lang="topbarText.fellBack ? topbarText.locale : undefined"
      >
        {{ topbarText.text }}
      </p>
    </div>
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
          :class="{ 'syn-header__menu-icon--active': drawerOpen }"
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
