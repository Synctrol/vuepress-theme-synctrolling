<script setup lang="ts">
import { computed } from 'vue'
import { PlatformLinks } from '../platforms/PlatformLinks.js'
import { useReleasePage } from './release-context.js'

const context = useReleasePage()
const platformLinks = computed(() =>
  context && context.model.book?.type === 'album'
    ? context.model.book.platformLinks
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
    v-if="context && platformLinks.length"
    data-testid="album-platform-links"
    class="syn-album-section syn-album-platform-links"
  >
    <PlatformLinks
      :entries="platformLinks"
      :definitions="context.definitions"
      :types="context.types"
      :load-strategy="context.loadStrategy"
      :locale="context.locale"
      :main-locale="context.mainLocale"
      :messages="platformMessages"
    />
  </div>
</template>
