<script setup lang="ts">
import { computed } from 'vue'
import { resolveContentAsset } from '../assets/resolve-content-asset.js'

const props = defineProps<{
  src: string
  alt?: string
  caption?: string
}>()

const imageSrc = computed(() => {
  try {
    return resolveContentAsset(props.src)
  } catch {
    console.warn(`Figure: unknown package asset "${props.src}"`)
    return ''
  }
})
</script>

<template>
  <figure class="syn-figure">
    <img
      v-if="imageSrc"
      :src="imageSrc"
      :alt="alt ?? caption ?? ''"
    />
    <figcaption v-if="caption" class="syn-figure__caption">{{ caption }}</figcaption>
  </figure>
</template>
