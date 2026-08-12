<script setup lang="ts">
import { computed } from 'vue'
import { nextColorMode } from '../color-mode/cycle.js'
import type { ColorModePreference } from '../color-mode/types.js'
import { formatMessage } from '../../shared/format-message.js'
import { useColorMode } from '../composables/useColorMode.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'

const { preference, cycle } = useColorMode()
const { messages } = useLocaleShell()

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
    cycle()
  }
}
</script>

<template>
  <div class="syn-theme-mode">
    <button
      type="button"
      class="syn-theme-mode__button"
      :aria-label="announcement"
      @click="cycle"
      @keydown="onKeydown"
    >
      {{ visibleLabel }}
    </button>
    <span class="syn-visually-hidden" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
