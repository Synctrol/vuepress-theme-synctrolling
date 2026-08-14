<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    open?: boolean
  }>(),
  {
    open: false,
  },
)

const isOpen = ref(props.open)

function toggle(): void {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <section class="syn-accordion">
    <button
      type="button"
      class="syn-accordion__header"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span class="syn-accordion__label">{{ label }}</span>
      <span class="syn-accordion__indicator" aria-hidden="true">{{
        isOpen ? '−' : '+'
      }}</span>
    </button>
    <div v-show="isOpen" class="syn-accordion__body" data-testid="accordion-body">
      <slot />
    </div>
  </section>
</template>
