<script setup lang="ts">
import { computed } from 'vue'
import { nextColorMode } from '../color-mode/cycle.js'
import type { ColorModePreference } from '../color-mode/types.js'
import { formatMessage } from '../../shared/format-message.js'
import { useColorMode } from '../composables/useColorMode.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import { playSound } from '../sounds/runtime.js'

const { preference, cycle } = useColorMode()
const { messages } = useLocaleShell()

function cycleMode(): void {
  cycle()
  playSound('themeCycle')
}

const labelMap = computed<Record<ColorModePreference, string>>(() => ({
  auto: messages.value.auto,
  light: messages.value.light,
  dark: messages.value.dark,
}))

const visibleLabel = computed(() => labelMap.value[preference.value])
const nextLabel = computed(() => labelMap.value[nextColorMode(preference.value)])
const announcement = computed(() =>
  formatMessage(messages.value.themeModeAnnouncement, {
    current: visibleLabel.value,
    next: nextLabel.value,
  }),
)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    cycleMode()
  }
}
</script>

<template>
  <div class="syn-theme-mode">
    <button
      type="button"
      class="syn-theme-mode__button syn-bar-chip syn-bar-chip--icon"
      :data-mode="preference"
      :aria-label="announcement"
      @click="cycleMode"
      @keydown="onKeydown"
    >
      <!-- light: sun -->
      <svg
        v-if="preference === 'light'"
        class="syn-bar-chip__icon"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.9" y1="4.9" x2="7" y2="7" />
        <line x1="17" y1="17" x2="19.1" y2="19.1" />
        <line x1="4.9" y1="19.1" x2="7" y2="17" />
        <line x1="17" y1="7" x2="19.1" y2="4.9" />
      </svg>
      <!-- dark: moon -->
      <svg
        v-else-if="preference === 'dark'"
        class="syn-bar-chip__icon"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <!-- auto: half-filled circle -->
      <svg
        v-else
        class="syn-bar-chip__icon"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
      </svg>
    </button>
    <span class="syn-visually-hidden" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
