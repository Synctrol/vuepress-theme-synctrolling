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
      class="syn-sound-toggle__button syn-bar-chip"
      :aria-pressed="enabled ? 'true' : 'false'"
      :aria-label="enabled ? messages.soundOn : messages.soundOff"
      @click="toggle"
    >
      {{ enabled ? messages.soundOn : messages.soundOff }}
    </button>
  </div>
</template>
