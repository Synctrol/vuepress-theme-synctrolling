<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import {
  isMusicPlaying,
  onChangeMusicPlaying,
  toggleMusic,
} from '../music/runtime.js'

const { theme, messages } = useLocaleShell()

const configured = computed(() => theme.music !== undefined)
const playing = ref(false)

let unsubscribe: (() => void) | null = null

function refresh(): void {
  playing.value = isMusicPlaying()
}

function toggle(): void {
  toggleMusic()
  refresh()
}

onMounted(() => {
  refresh()
  unsubscribe = onChangeMusicPlaying(refresh)
})

onBeforeUnmount(() => {
  unsubscribe?.()
  unsubscribe = null
})
</script>

<template>
  <div v-if="configured" class="syn-music-toggle">
    <button
      type="button"
      class="syn-music-toggle__button syn-bar-chip"
      :aria-pressed="playing ? 'true' : 'false'"
      :aria-label="playing ? messages.musicOn : messages.musicOff"
      @click="toggle"
    >
      {{ playing ? messages.musicOn : messages.musicOff }}
    </button>
  </div>
</template>
