<script setup lang="ts">
import type { NewsTagCount } from '../../../shared/types/news.js'

defineProps<{
  tags: readonly NewsTagCount[]
}>()
</script>

<template>
  <ul class="syn-news-tags-list" data-testid="news-tags-list">
    <li v-for="tag in tags" :key="tag.key" class="syn-news-tags-list__item">
      <a
        v-if="tag.publicPath"
        class="syn-news-tags-list__link"
        :href="tag.publicPath"
        :lang="tag.titleLang"
      >{{ tag.title }}</a>
      <span
        v-else
        class="syn-news-tags-list__title"
        :lang="tag.titleLang"
      >{{ tag.title }}</span>
      <span class="syn-news-tags-list__count">({{ tag.count }})</span>
    </li>
  </ul>
</template>
