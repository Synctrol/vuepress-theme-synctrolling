<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'info' | 'warning' | 'success'
    title?: string
  }>(),
  {
    type: 'info',
  },
)
</script>

<template>
  <section class="syn-notice" :data-type="type">
    <p v-if="title" class="syn-notice__title">{{ title }}</p>
    <div class="syn-notice__body">
      <slot />
    </div>
  </section>
</template>
