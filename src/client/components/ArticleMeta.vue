<script setup lang="ts">
import type { NewsTagLink } from '../../shared/types/news.js'

defineProps<{
  date: string
  updated?: string
  publishedLabel: string
  updatedLabel: string
  formatDate: (date: string) => string
  tags: NewsTagLink[]
}>()
</script>

<template>
  <div class="syn-article-meta" data-testid="article-meta">
    <p class="syn-article-meta__dates">
      <span>{{ publishedLabel }}</span>
      <time data-testid="published-date" :datetime="date">{{ formatDate(date) }}</time>
      <template v-if="updated">
        <span>{{ updatedLabel }}</span>
        <time data-testid="updated-date" :datetime="updated">{{ formatDate(updated) }}</time>
      </template>
    </p>
    <ul v-if="tags.length > 0" class="syn-article-meta__tags" data-testid="article-tags">
      <li v-for="tag in tags" :key="tag.key">
        <a :href="tag.publicPath">{{ tag.title }}</a>
      </li>
    </ul>
  </div>
</template>
