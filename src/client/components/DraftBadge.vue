<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <span class="syn-badge syn-draft-badge" data-testid="draft-badge">{{ label }}</span>
</template>
