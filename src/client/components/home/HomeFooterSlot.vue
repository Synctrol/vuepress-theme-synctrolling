<script setup lang="ts">
defineProps<{
  html?: string
}>()
</script>

<template>
  <div data-testid="home-footer" class="syn-home-footer" v-html="html ?? ''" />
</template>
