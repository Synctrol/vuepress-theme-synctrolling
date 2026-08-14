<script setup lang="ts">
import { computed } from 'vue'
import ReleaseArtwork from './ReleaseArtwork.vue'
import { useReleasePage } from './release-context.js'

const context = useReleasePage()
const artwork = computed(() => context?.model.artwork)
</script>

<template>
  <div
    v-if="artwork"
    class="syn-release-detail-artwork"
    data-testid="album-artwork"
  >
    <ReleaseArtwork
      :kind="artwork.kind"
      :artwork="artwork.artwork"
      :alt="artwork.alt"
      eager
    />
  </div>
</template>
