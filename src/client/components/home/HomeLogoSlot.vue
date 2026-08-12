<script setup lang="ts">
defineProps<{
  html: string
  seoTitle?: string
}>()
</script>

<template>
  <div data-testid="home-logo" class="syn-home-logo" v-html="html" />
</template>
