<script setup lang="ts">
import { computed } from 'vue'
import { resolveContentAsset } from '../../assets/resolve-content-asset.js'

const props = defineProps<{
  title: string
  text?: string
  href?: string
  background: string
}>()

const rootStyle = computed(() => {
  try {
    const src = resolveContentAsset(props.background)
    return {
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("${src}")`,
    }
  } catch {
    console.warn(
      `NewAlbumReleased: unknown package asset "${props.background}"`,
    )
    return {}
  }
})
</script>

<template>
  <a
    v-if="href"
    :href="href"
    class="syn-new-album"
    data-testid="new-album-released"
    :style="rootStyle"
  >
    <h2 class="syn-new-album__title">
      {{ title }}<span class="syn-new-album__arrow" aria-hidden="true">↗</span>
    </h2>
    <p v-if="text" class="syn-new-album__intro">{{ text }}</p>
  </a>
  <div
    v-else
    class="syn-new-album"
    data-testid="new-album-released"
    :style="rootStyle"
  >
    <h2 class="syn-new-album__title">
      {{ title }}<span class="syn-new-album__arrow" aria-hidden="true">↗</span>
    </h2>
    <p v-if="text" class="syn-new-album__intro">{{ text }}</p>
  </div>
</template>
