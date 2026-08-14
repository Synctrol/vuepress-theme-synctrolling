<script setup lang="ts">
import { computed } from 'vue'
import { useReleasePage } from './release-context.js'

const context = useReleasePage()
const book = computed(() => context?.model.book)
</script>

<template>
  <h2
    v-if="book"
    class="syn-album-identity"
    data-testid="album-identity"
    :lang="book.title.lang"
  >
    {{ book.title.text }}
  </h2>
</template>
