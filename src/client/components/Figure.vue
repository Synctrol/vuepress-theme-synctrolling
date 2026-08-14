<script setup lang="ts">
defineProps<{
  caption?: string
}>()
</script>

<template>
  <figure class="syn-figure">
    <slot />
    <figcaption v-if="caption" class="syn-figure__caption">{{ caption }}</figcaption>
  </figure>
</template>
