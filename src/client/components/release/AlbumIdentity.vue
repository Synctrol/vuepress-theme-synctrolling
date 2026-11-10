<script setup lang="ts">
import { computed } from 'vue'
import { resolveMultilanguage } from '../../../shared/multilanguage.js'
import {
  normalizeAlbumSrc,
  useReleasePage,
} from './release-context.js'

const props = defineProps<{ src: string }>()
const context = useReleasePage()
const album = computed(() =>
  context?.albumBySrc[normalizeAlbumSrc(props.src)],
)
const title = computed(() => {
  if (!context || !album.value) return undefined
  const resolved = resolveMultilanguage(
    album.value.title,
    context.locale,
    context.mainLocale,
  )
  return {
    text: resolved.text,
    lang: resolved.fellBack ? resolved.locale : undefined,
  }
})

if (context && !album.value) {
  console.warn(`AlbumIdentity: no album metadata for src "${props.src}"`)
}
</script>

<template>
  <h2
    v-if="title"
    class="syn-album-identity"
    data-testid="album-identity"
    :lang="title.lang"
  >
    {{ title.text }}
  </h2>
</template>
