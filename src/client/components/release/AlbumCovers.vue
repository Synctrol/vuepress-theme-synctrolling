<script setup lang="ts">
import { computed } from 'vue'
import {
  normalizeAlbumSrc,
  useReleasePage,
} from './release-context.js'

const props = defineProps<{ src: string }>()
const context = useReleasePage()
const album = computed(() =>
  context?.albumBySrc[normalizeAlbumSrc(props.src)],
)
const covers = computed(() => album.value?.covers ?? [])

if (context && !album.value) {
  console.warn(`AlbumCovers: no album metadata for src "${props.src}"`)
}
</script>

<template>
  <section
    v-if="context && covers.length"
    class="syn-album-section syn-album-covers"
    data-testid="album-covers"
  >
    <h2>{{ context.messages.covers }}</h2>
    <ul>
      <li v-for="(cover, i) in covers" :key="cover">
        <img
          data-testid="album-cover"
          :src="cover"
          :alt="`${context.messages.covers} ${i + 1}`"
          loading="lazy"
        />
      </li>
    </ul>
  </section>
</template>
