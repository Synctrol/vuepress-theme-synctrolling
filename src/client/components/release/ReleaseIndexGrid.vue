<script setup lang="ts">
import DraftBadge from '../DraftBadge.vue'
import ReleaseArtwork from './ReleaseArtwork.vue'
import type { ReleaseIndexModel } from '../../../shared/release/types.js'

defineProps<{
  model: ReleaseIndexModel
  draftLabel: string
}>()
</script>

<template>
  <ul
    class="syn-release-index-grid"
    data-testid="release-index-grid"
  >
    <li
      v-for="tile in model.tiles"
      :key="tile.identity"
      class="syn-release-index-grid__item"
    >
      <a
        class="syn-release-tile"
        :href="tile.href"
        :aria-label="tile.accessibleName"
      >
        <ReleaseArtwork
          :kind="tile.artworkKind"
          :artwork="tile.artwork"
          :alt="tile.accessibleName"
          :eager="model.page === 1"
        />
        <span class="syn-release-tile__title" aria-hidden="true">{{
          tile.accessibleName
        }}</span>
        <DraftBadge v-if="tile.showDraftBadge" :label="draftLabel" />
      </a>
    </li>
  </ul>
</template>
