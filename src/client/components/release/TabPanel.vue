<script setup lang="ts">
import { computed, inject, onBeforeUnmount, provide } from 'vue'
import {
  SYNCTROL_TABS_CONTEXT_KEY,
  SYNCTROL_TAB_PANEL_ACTIVE_KEY,
} from './tabs-context.js'

const props = defineProps<{ label: string }>()

const context = inject(SYNCTROL_TABS_CONTEXT_KEY, null)
if (context === null) {
  console.warn(
    'TabPanel must be rendered inside a TabView; rendering content without tabs.',
  )
}

const id = context === null ? null : context.register(props.label)
if (context !== null && id !== null) {
  onBeforeUnmount(() => context.unregister(id))
}

const active = computed(() =>
  context === null || id === null ? true : context.activeId.value === id,
)

provide(SYNCTROL_TAB_PANEL_ACTIVE_KEY, active)
</script>

<template>
  <div
    v-if="context !== null && id !== null"
    :id="`syn-tab-panel-${id}`"
    :aria-labelledby="`syn-tab-${id}`"
    v-show="active"
    role="tabpanel"
    class="syn-tabview__panel"
    data-testid="tab-panel"
  >
    <slot />
  </div>
  <div v-else class="syn-tabview__panel">
    <slot />
  </div>
</template>
