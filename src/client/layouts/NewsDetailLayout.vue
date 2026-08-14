<script setup lang="ts">
import ArticleMeta from '../components/ArticleMeta.vue'
import ContentColumn from '../components/ContentColumn.vue'
import ContentCover from '../components/ContentCover.vue'
import DraftBadge from '../components/DraftBadge.vue'
import TranslationUnavailableBadge from '../components/TranslationUnavailableBadge.vue'
import type { NewsDetailPageData } from '../../shared/types/news.js'

defineProps<{
  data: NewsDetailPageData
  publishedLabel: string
  updatedLabel: string
  draftLabel: string
  formatDate: (date: string) => string
}>()
</script>

<template>
  <ContentColumn>
    <article class="syn-news-detail" data-testid="news-detail">
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

      <ArticleMeta
        :date="data.date"
        :updated="data.updated"
        :published-label="publishedLabel"
        :updated-label="updatedLabel"
        :format-date="formatDate"
        :tags="data.tags"
      />

      <div data-testid="article-body" class="syn-article-body" :lang="data.bodyLang">
        <slot />
      </div>
    </article>
  </ContentColumn>
</template>
