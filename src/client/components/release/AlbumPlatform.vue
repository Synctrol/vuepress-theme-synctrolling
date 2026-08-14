<script setup lang="ts">
import { computed, inject } from 'vue'
import { PlatformEntry } from '../platforms/PlatformEntry.js'
import { SYNCTROL_TAB_PANEL_ACTIVE_KEY } from './tabs-context.js'
import { useReleasePage } from './release-context.js'

const props = defineProps<{ platform: string }>()

const context = useReleasePage()
const entry = computed(() => {
  if (!context || context.model.book?.type !== 'album') return undefined
  const book = context.model.book
  return (
    book.previewLinks.find((link) => link.platform === props.platform) ??
    book.platformLinks.find((link) => link.platform === props.platform)
  )
})
const panelActive = inject(
  SYNCTROL_TAB_PANEL_ACTIVE_KEY,
  computed(() => false),
)
const platformMessages = computed(() => ({
  activateEmbed: context?.messages.activateEmbed ?? '',
  embedFailed: context?.messages.embedFailed ?? '',
  openExternal: context?.messages.openExternal ?? '',
}))

if (context && entry.value === undefined) {
  console.warn(`AlbumPlatform: no entry for platform "${props.platform}"`)
}
</script>

<template>
  <PlatformEntry
    v-if="context && entry"
    :entry="entry"
    :definitions="context.definitions"
    :types="context.types"
    :load-strategy="context.loadStrategy"
    :auto-activate="panelActive"
    :locale="context.locale"
    :main-locale="context.mainLocale"
    :messages="platformMessages"
    standalone
    data-testid="album-platform"
  />
</template>
