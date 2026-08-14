<script setup lang="ts">
import { computed } from 'vue'
import { PlatformLinks } from '../platforms/PlatformLinks.js'
import { useReleasePage } from './release-context.js'

const context = useReleasePage()
const previewLinks = computed(() =>
  context && context.model.book?.type === 'album'
    ? context.model.book.previewLinks
    : [],
)
const platformMessages = computed(() => ({
  platformLinks: context?.messages.platformLinks ?? '',
  activateEmbed: context?.messages.activateEmbed ?? '',
  embedFailed: context?.messages.embedFailed ?? '',
  openExternal: context?.messages.openExternal ?? '',
}))
</script>

<template>
  <div
    v-if="context && previewLinks.length"
    data-testid="album-previews"
    class="syn-album-section syn-album-previews"
  >
    <PlatformLinks
      :entries="previewLinks"
      :definitions="context.definitions"
      :types="context.types"
      :load-strategy="context.loadStrategy"
      :locale="context.locale"
      :main-locale="context.mainLocale"
      :messages="platformMessages"
      :title="context.messages.previewSectionTitle"
    />
  </div>
</template>
