<script setup lang="ts">
defineProps<{
  prevHref?: string
  nextHref?: string
  prevLabel: string
  nextLabel: string
  page: number
  pageCount: number
}>()
</script>

<template>
  <nav
    v-if="prevHref || nextHref"
    class="syn-pagination"
    aria-label="Pagination"
    data-testid="pagination"
  >
    <a
      v-if="prevHref"
      class="syn-pagination__link"
      data-testid="pagination-prev"
      :href="prevHref"
    >
      <span class="syn-pagination__arrow" aria-hidden="true">←</span>
      <span>{{ prevLabel }}</span>
    </a>
    <span v-else class="syn-pagination__slot" aria-hidden="true" />

    <span class="syn-pagination__status" data-testid="pagination-status">
      {{ page }} <span aria-hidden="true">/</span> {{ pageCount }}
    </span>

    <a
      v-if="nextHref"
      class="syn-pagination__link"
      data-testid="pagination-next"
      :href="nextHref"
    >
      <span>{{ nextLabel }}</span>
      <span class="syn-pagination__arrow" aria-hidden="true">→</span>
    </a>
    <span v-else class="syn-pagination__slot" aria-hidden="true" />
  </nav>
</template>
