<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import {
  isSoundEnabled,
  onChangeSoundEnabled,
  setSoundEnabled,
} from '../sounds/runtime.js'

const { theme, messages } = useLocaleShell()

const configured = computed(
  () => Object.keys(theme.sounds?.keys ?? {}).length > 0,
)
const enabled = ref(false)

let unsubscribe: (() => void) | null = null

function refresh(): void {
  enabled.value = isSoundEnabled()
}

function toggle(): void {
  setSoundEnabled(!enabled.value)
  refresh()
}

onMounted(() => {
  refresh()
  unsubscribe = onChangeSoundEnabled(refresh)
})

onBeforeUnmount(() => {
  unsubscribe?.()
  unsubscribe = null
})
</script>

<template>
  <div v-if="configured" class="syn-sound-toggle">
    <button
      type="button"
      class="syn-sound-toggle__button syn-bar-chip syn-bar-chip--icon"
      :aria-pressed="enabled ? 'true' : 'false'"
      :aria-label="enabled ? messages.soundOn : messages.soundOff"
      :data-enabled="enabled ? 'true' : 'false'"
      @click="toggle"
    >
      <!-- waveform -->
      <svg
        class="syn-bar-chip__icon"
        :class="{ 'syn-bar-chip__icon--muted': !enabled }"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <line x1="4" y1="9" x2="4" y2="15" />
        <line x1="8" y1="5" x2="8" y2="19" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="16" y1="4" x2="16" y2="20" />
        <line x1="20" y1="9" x2="20" y2="15" />
        <line
          v-if="!enabled"
          x1="3"
          y1="3"
          x2="21"
          y2="21"
          stroke-width="2"
        />
      </svg>
    </button>
  </div>
</template>
