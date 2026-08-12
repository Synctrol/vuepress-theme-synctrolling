<script setup lang="ts">
defineProps<{ src: string; alt: string; eager?: boolean }>()
</script>

<template>
  <img
    class="syn-cover"
    data-testid="content-cover"
    :src="src"
    :alt="alt"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
  />
</template>
