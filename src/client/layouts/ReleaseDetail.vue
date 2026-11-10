<script setup lang="ts">
import { provide } from 'vue'
import { Content } from 'vuepress/client'
import DraftBadge from '../components/DraftBadge.vue'
import {
  SYNCTROL_RELEASE_CONTEXT_KEY,
} from '../components/release/release-context.js'
import type { ReleaseDetailModel } from '../../shared/release/types.js'

const props = defineProps<{
  model: ReleaseDetailModel
}>()

provide(SYNCTROL_RELEASE_CONTEXT_KEY, {
  locale: props.model.locale,
  mainLocale: props.model.mainLocale,
  date: props.model.date,
  artwork: props.model.artwork,
  albumBySrc: props.model.albumBySrc,
  loadStrategy: props.model.loadStrategy,
  messages: props.model.messages,
})
</script>

<template>
  <article class="syn-release-detail" data-testid="release-detail-root">
    <DraftBadge v-if="model.showDraftBadge" :label="model.draftLabel" />
    <div class="syn-article-body">
      <Content />
    </div>
  </article>
</template>
