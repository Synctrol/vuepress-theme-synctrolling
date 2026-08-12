<script setup lang="ts">
import ContentColumn from '../components/ContentColumn.vue'
import ContentCover from '../components/ContentCover.vue'
import DraftBadge from '../components/DraftBadge.vue'
import TranslationUnavailableBadge from '../components/TranslationUnavailableBadge.vue'
import type { PageDetailPageData } from '../../shared/types/news.js'

defineProps<{
  data: PageDetailPageData
  draftLabel: string
}>()
</script>

<template>
  <ContentColumn>
    <article class="syn-page-detail" data-testid="page-detail">
      <ContentCover
        v-if="data.coverPublicPath"
        :src="data.coverPublicPath"
        :alt="data.title"
        eager
      />

      <DraftBadge v-if="data.isDraft" :label="draftLabel" />
      <TranslationUnavailableBadge
        v-if="data.isFallback && data.translationUnavailableMessage"
        :label="data.translationUnavailableMessage"
      />

      <h1 :lang="data.titleLang">{{ data.title }}</h1>

      <div data-testid="page-body" :lang="data.bodyLang">
        <slot />
      </div>
    </article>
  </ContentColumn>
</template>
