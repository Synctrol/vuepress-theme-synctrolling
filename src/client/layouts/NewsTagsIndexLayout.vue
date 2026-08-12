<script setup lang="ts">
import ContentColumn from '../components/ContentColumn.vue'
import NewsTagsList from '../components/news/NewsTagsList.vue'
import type { NewsCollectionPageData } from '../../shared/types/news.js'

defineProps<{
  data: NewsCollectionPageData
}>()
</script>

<template>
  <ContentColumn>
    <section class="syn-news-tags-index" data-testid="news-tags-index">
      <h1>{{ data.heading }}</h1>
      <p v-if="data.description">{{ data.description }}</p>
      <NewsTagsList :tags="data.tags ?? []" />
    </section>
  </ContentColumn>
</template>
