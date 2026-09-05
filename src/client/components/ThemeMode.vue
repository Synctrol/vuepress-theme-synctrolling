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
      class="syn-theme-mode__button syn-bar-chip"
      :aria-label="announcement"
      @click="cycleMode"
      @keydown="onKeydown"
    >
      {{ visibleLabel }}
    </button>
    <span class="syn-visually-hidden" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
