<script setup lang="ts">
import { computed } from 'vue'
import { resolveContentAsset } from '../../assets/resolve-content-asset.js'

const props = withDefaults(
  defineProps<{
    title: string
    text?: string
    href?: string
    background: string
    position?: string
  }>(),
  {
    position: 'right center',
  },
)

const rootStyle = computed(() => {
  let image = ''
  try {
    image = `url("${resolveContentAsset(props.background)}")`
  } catch {
    console.warn(
      `NewAlbumReleased: unknown package asset "${props.background}"`,
    )
  }
  return {
    '--syn-new-album-image': image,
    '--syn-new-album-position': props.position,
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
