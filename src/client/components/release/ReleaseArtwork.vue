<script setup lang="ts">
import type { ReleaseArtworkKind } from '../../../shared/release/types.js'
import type { ResolvedAsset } from '../../../shared/asset-types.js'

defineProps<{
  kind: ReleaseArtworkKind
  artwork?: ResolvedAsset
  alt: string
  eager?: boolean
}>()
</script>

<template>
  <div class="syn-release-artwork" data-testid="release-artwork">
    <img
      v-if="kind === 'artwork' || kind === 'placeholder'"
      :src="artwork!.publicPath"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      width="660"
      height="660"
    />
    <div
      v-else
      class="syn-release-artwork__empty"
      data-testid="release-empty-frame"
      role="img"
      :aria-label="alt"
    />
  </div>
</template>
