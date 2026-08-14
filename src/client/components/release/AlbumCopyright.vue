<script setup lang="ts">
import { computed } from 'vue'
import { useReleasePage } from './release-context.js'

const context = useReleasePage()
const book = computed(() => context?.model.book)
</script>

<template>
  <p
    v-if="book?.copyright"
    class="syn-album-copyright"
    data-testid="album-copyright"
  >
    {{ book.copyright }}
  </p>
</template>
