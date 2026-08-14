<script setup lang="ts">
import { computed } from 'vue'
import { resolveContentAsset } from '../../assets/resolve-content-asset.js'

const props = defineProps<{
  title: string
  text?: string
  href?: string
  cover: string
}>()

const coverSrc = computed(() => {
  try {
    return resolveContentAsset(props.cover)
  } catch {
    console.warn(
      `NewAlbumReleased: unknown package asset "${props.cover}"`,
    )
    return ''
  }
})
</script>

<template>
  <section class="syn-new-album" data-testid="new-album-released">
    <a v-if="href" :href="href" class="syn-new-album__cover">
      <img v-if="coverSrc" :src="coverSrc" :alt="title" />
    </a>
    <div v-else class="syn-new-album__cover">
      <img v-if="coverSrc" :src="coverSrc" :alt="title" />
    </div>
    <h2 class="syn-new-album__title">{{ title }}</h2>
    <p v-if="text" class="syn-new-album__intro">{{ text }}</p>
  </section>
</template>
