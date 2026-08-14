<script setup lang="ts">
defineProps<{
  href?: string
}>()
</script>

<template>
  <a v-if="href" :href="href" class="syn-button"><slot /></a>
  <button v-else type="button" class="syn-button"><slot /></button>
</template>
