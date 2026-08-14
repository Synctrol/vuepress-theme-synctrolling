<script setup lang="ts">
withDefaults(
  defineProps<{
    align?: 'left' | 'center' | 'right'
  }>(),
  {
    align: 'left',
  },
)
</script>

<template>
  <div class="syn-button-group" :data-align="align">
    <slot />
  </div>
</template>
