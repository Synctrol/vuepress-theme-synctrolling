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
      class="syn-music-toggle__button syn-bar-chip syn-bar-chip--icon"
      :aria-pressed="playing ? 'true' : 'false'"
      :aria-label="playing ? messages.musicOn : messages.musicOff"
      :data-playing="playing ? 'true' : 'false'"
      @click="toggle"
    >
      <!-- speaker -->
      <svg
        class="syn-bar-chip__icon"
        :class="{ 'syn-bar-chip__icon--muted': !playing }"
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
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <template v-if="playing">
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </template>
        <template v-else>
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </template>
      </svg>
    </button>
  </div>
</template>
