<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { BackgroundRuntime } from './runtime.js'
import type { BackgroundRequest } from '../../shared/background.js'
import './background-surface.css'

const props = defineProps<{
  runtime: BackgroundRuntime
  requestInput?: BackgroundRequest | null
}>()

const hostRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!hostRef.value) return
  props.runtime.mount(hostRef.value)
  if (props.requestInput) {
    props.runtime.request({ ...props.requestInput, reason: 'init' })
  }
})

watch(
  () => props.requestInput,
  (input) => {
    if (!hostRef.value || !input) return
    props.runtime.request(input)
  },
)

onBeforeUnmount(() => {
  props.runtime.dispose()
})
</script>

<template>
  <div
    ref="hostRef"
    class="syn-background"
    data-syn-background="solid"
    aria-hidden="true"
  />
</template>
