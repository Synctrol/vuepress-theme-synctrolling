<script setup lang="ts">
import ReleaseIndexGrid from '../components/release/ReleaseIndexGrid.vue'
import { formatMessage } from '../../shared/release/numbering.js'
import type { ReleaseIndexModel } from '../../shared/release/types.js'
import type { LocaleMessages } from '../../shared/types.js'

const props = defineProps<{
  model: ReleaseIndexModel | null
  messages: LocaleMessages
  collectionTitle: string
  prevHref: string | null
  nextHref: string | null
}>()

const heading = () => {
  if (!props.model) return ''
  if (props.model.page <= 1) return props.collectionTitle
  return formatMessage(props.messages.paginatedTitle, {
    title: props.collectionTitle,
    page: props.model.page,
  })
}
</script>

<template>
  <section
    v-if="model"
    class="syn-release-index"
    data-testid="release-index-root"
  >
    <h1 data-testid="release-index-heading">{{ heading() }}</h1>

    <p v-if="model.empty" data-testid="release-index-empty">
      {{ messages.emptyReleases }}
    </p>

    <ReleaseIndexGrid
      v-else
      :model="model"
      :draft-label="messages.draft"
    />

    <nav
      v-if="model.pageCount > 1"
      class="syn-release-pagination"
      aria-label="Pagination"
    >
      <a
        v-if="prevHref"
        data-testid="release-pagination-prev"
        :href="prevHref"
      >{{ messages.previousPage }}</a>
      <a
        v-if="nextHref"
        data-testid="release-pagination-next"
        :href="nextHref"
      >{{ messages.nextPage }}</a>
    </nav>
  </section>
</template>
