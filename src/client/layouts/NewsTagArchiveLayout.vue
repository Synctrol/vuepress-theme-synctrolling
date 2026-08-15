<script setup lang="ts">
import ContentColumn from '../components/ContentColumn.vue'
import PaginationNav from '../components/PaginationNav.vue'
import NewsList from '../components/news/NewsList.vue'
import type { NewsCollectionPageData } from '../../shared/types/news.js'

defineProps<{
  data: NewsCollectionPageData
  emptyLabel: string
  draftLabel: string
  translationUnavailableLabel: string
  previousPageLabel: string
  nextPageLabel: string
  formatDate: (date: string) => string
}>()
</script>

<template>
  <section
    class="syn-news-tag-archive"
    data-testid="news-tag-archive"
    :data-tag="data.tagKey"
  >
    <ContentColumn>
      <h1>{{ data.heading }}</h1>
      <NewsList
        :items="data.items"
        :empty-label="emptyLabel"
        :draft-label="draftLabel"
        :translation-unavailable-label="translationUnavailableLabel"
        :format-date="formatDate"
      />
      <PaginationNav
        v-if="data.pagination && data.pagination.pageCount > 1"
        :prev-href="data.pagination.prevPublicPath"
        :next-href="data.pagination.nextPublicPath"
        :prev-label="previousPageLabel"
        :next-label="nextPageLabel"
        :page="data.pagination.page"
        :page-count="data.pagination.pageCount"
      />
    </ContentColumn>
  </section>
</template>
