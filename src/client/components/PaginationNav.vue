<script setup lang="ts">
defineProps<{
  prevHref?: string
  nextHref?: string
  prevLabel: string
  nextLabel: string
}>()
</script>

<template>
  <nav
    v-if="prevHref || nextHref"
    class="syn-pagination"
    aria-label="Pagination"
    data-testid="pagination"
  >
    <a v-if="prevHref" data-testid="pagination-prev" :href="prevHref">{{ prevLabel }}</a>
    <a v-if="nextHref" data-testid="pagination-next" :href="nextHref">{{ nextLabel }}</a>
  </nav>
</template>
