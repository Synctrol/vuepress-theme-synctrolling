import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type Ref,
} from 'vue'
import { nextColorMode } from '../color-mode/cycle.js'
import { resolveSurfaceColorMode } from '../color-mode/resolve.js'
import {
  readColorModePreference,
  writeColorModePreference,
} from '../color-mode/storage.js'
import type { ColorModePreference } from '../color-mode/types.js'
import { useThemeOptions } from './useThemeOptions.js'

type ColorModeApi = {
  preference: Ref<ColorModePreference>
  surface: Ref<'light' | 'dark'>
  cycle: () => void
}

let shared: ColorModeApi | null = null

function getPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyDataset(surface: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = surface
}

function createColorModeState(): ColorModeApi {
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

export function useColorMode(): ColorModeApi {
  if (!shared) shared = createColorModeState()
  return shared
}

export function useResolvedColorMode(): Ref<'light' | 'dark'> {
  return useColorMode().surface
}

/** Test-only reset between cases. */
export function __resetColorModeStateForTests(): void {
  shared = null
}
