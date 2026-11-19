<script setup lang="ts">
import { computed } from 'vue'
import { resolveContentAsset } from '../assets/resolve-content-asset.js'

defineOptions({ name: 'Social' })

const props = defineProps<{
  icon: string
  href: string
  label: string
}>()

function resolveIconSrc(ref: string): string {
  if (/^(https?:|data:|\/)/i.test(ref)) {
    return ref
  }
  try {
    return resolveContentAsset(ref)
  } catch {
    console.warn(`Social: unknown package asset "${ref}"`)
    return ''
  }
}

const iconSrc = computed(() => resolveIconSrc(props.icon))
</script>

<template>
  <a
    class="syn-social"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="label"
  >
    <img
      v-if="iconSrc"
      class="syn-social__icon"
      :src="iconSrc"
      alt=""
      aria-hidden="true"
      width="40"
      height="40"
    />
  </a>
</template>
