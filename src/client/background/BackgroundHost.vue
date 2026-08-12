<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { BackgroundRuntime, BackgroundSyncInput } from './runtime.js'
import './background-host.css'

const props = defineProps<{
  runtime: BackgroundRuntime
  syncInput?: BackgroundSyncInput | null
}>()

const hostRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!hostRef.value) return
  props.runtime.setHost(hostRef.value)
  if (props.syncInput) {
    void props.runtime.sync(props.syncInput)
  }
})

watch(
  () => props.syncInput,
  (input) => {
    if (!input || !hostRef.value) return
    void props.runtime.sync(input)
  },
  { deep: true },
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
