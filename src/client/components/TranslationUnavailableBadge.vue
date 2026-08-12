<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <p class="syn-badge syn-translation-badge" data-testid="translation-unavailable-badge" role="status">
    {{ label }}
  </p>
</template>
