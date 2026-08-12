<script setup lang="ts">
import NewsListItem from './NewsListItem.vue'
import type { NewsListItem as NewsListItemModel } from '../../../shared/types/news.js'

defineProps<{
  items: readonly NewsListItemModel[]
  emptyLabel: string
  draftLabel: string
  translationUnavailableLabel: string
  formatDate: (date: string) => string
}>()
</script>

<template>
  <div class="syn-news-list" data-testid="news-list">
    <p v-if="items.length === 0" data-testid="empty-news">{{ emptyLabel }}</p>
    <template v-else>
      <NewsListItem
        v-for="entry in items"
        :key="entry.identity"
        :item="entry"
        :formatted-date="formatDate(entry.date)"
        :draft-label="draftLabel"
        :translation-unavailable-label="translationUnavailableLabel"
      />
    </template>
  </div>
</template>
