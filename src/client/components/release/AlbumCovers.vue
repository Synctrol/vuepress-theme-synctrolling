<script setup lang="ts">
import { computed } from 'vue'
import { useReleasePage } from './release-context.js'

const context = useReleasePage()
const covers = computed(() =>
  context && context.model.book?.type === 'album'
    ? context.model.book.covers
    : [],
)
</script>

<template>
  <section
    v-if="context && covers.length"
    class="syn-album-section syn-album-covers"
    data-testid="album-covers"
  >
    <h2>{{ context.messages.covers }}</h2>
    <ul>
      <li v-for="(cover, i) in covers" :key="cover.publicPath">
        <img
          data-testid="album-cover"
          :src="cover.publicPath"
          :alt="`${context.messages.covers} ${i + 1}`"
          loading="lazy"
        />
      </li>
    </ul>
  </section>
</template>
