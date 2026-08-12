<script setup lang="ts">
import type { ReleaseDetailSection } from '../../../shared/release/types.js'

defineProps<{
  section: Extract<ReleaseDetailSection, { kind: 'book-identity' }>
  authorsLabel: string
}>()
</script>

<template>
  <header class="syn-release-book-identity" data-testid="book-identity">
    <h2 :lang="section.title.lang">{{ section.title.text }}</h2>
    <p v-if="section.desc" :lang="section.desc.lang">{{ section.desc.text }}</p>
    <p v-if="section.authors?.length">
      <span>{{ authorsLabel }}</span>
      {{ section.authors.join(', ') }}
    </p>
    <p v-if="section.copyright">{{ section.copyright }}</p>
  </header>
</template>
