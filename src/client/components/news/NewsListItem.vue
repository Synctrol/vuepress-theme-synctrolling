<script setup lang="ts">
import ContentCover from '../ContentCover.vue'
import DraftBadge from '../DraftBadge.vue'
import TranslationUnavailableBadge from '../TranslationUnavailableBadge.vue'
import type { NewsListItem } from '../../../shared/types/news.js'

defineProps<{
  item: NewsListItem
  formattedDate: string
  draftLabel: string
  translationUnavailableLabel: string
}>()
</script>

<template>
  <article
    class="syn-news-list-item"
    :data-layout="item.coverPublicPath ? 'cover' : 'text'"
    data-testid="news-list-item"
  >
    <ContentCover
      v-if="item.coverPublicPath"
      :src="item.coverPublicPath"
      :alt="item.title"
    />

    <div class="syn-news-list-item__body">
      <DraftBadge v-if="item.isDraft" :label="draftLabel" />
      <TranslationUnavailableBadge
        v-if="item.isFallback"
        :label="translationUnavailableLabel"
      />

      <a
        data-testid="item-title"
        class="syn-news-list-item__title"
        :href="item.publicPath"
        :lang="item.titleLang"
      >{{ item.title }}</a>

      <time class="syn-news-list-item__date" :datetime="item.date">{{ formattedDate }}</time>

      <p
        v-if="item.description"
        data-testid="item-description"
        class="syn-news-list-item__description"
        :lang="item.descriptionLang"
      >{{ item.description }}</p>

      <ul v-if="item.tags.length > 0" class="syn-news-list-item__tags" data-testid="item-tags">
        <li v-for="tag in item.tags" :key="tag.key">
          <a :href="tag.publicPath">{{ tag.title }}</a>
        </li>
      </ul>
    </div>
  </article>
</template>
