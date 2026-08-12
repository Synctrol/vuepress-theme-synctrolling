import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { nextColorMode } from '../color-mode/cycle.js'
import { resolveSurfaceColorMode } from '../color-mode/resolve.js'
import {
  readColorModePreference,
  writeColorModePreference,
} from '../color-mode/storage.js'
import type { ColorModePreference } from '../color-mode/types.js'
import { useThemeOptions } from './useThemeOptions.js'

function getPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyDataset(surface: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = surface
}

export function useColorMode() {
  const theme = useThemeOptions()
  const preference = ref<ColorModePreference>(theme.defaultColorMode)
  const prefersDark = ref(false)

  const surface = computed(() =>
    resolveSurfaceColorMode(preference.value, prefersDark.value),
  )

  function syncFromStorage(): void {
    preference.value = readColorModePreference(
      window.localStorage,
      theme.defaultColorMode,
    )
  }

  function cycle(): void {
    preference.value = nextColorMode(preference.value)
    writeColorModePreference(window.localStorage, preference.value)
  }

  let media: MediaQueryList | undefined
  let onChange: (() => void) | undefined

  onMounted(() => {
    syncFromStorage()
    prefersDark.value = getPrefersDark()
    applyDataset(surface.value)
    media = window.matchMedia('(prefers-color-scheme: dark)')
    onChange = () => {
      prefersDark.value = media!.matches
    }
    media.addEventListener('change', onChange)
  })

  onUnmounted(() => {
    if (media && onChange) media.removeEventListener('change', onChange)
  })

  watch(surface, (value) => applyDataset(value), { flush: 'sync' })

  return { preference, surface, cycle }
}
