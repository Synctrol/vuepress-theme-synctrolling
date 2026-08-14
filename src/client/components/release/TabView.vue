<script setup lang="ts">
import { computed, provide, reactive, ref, useSlots } from 'vue'
import type { VNode } from 'vue'
import { SYNCTROL_TABS_CONTEXT_KEY } from './tabs-context.js'
import type { SynctrolTabPanelRegistration } from './tabs-context.js'

const slots = useSlots()
const panels = reactive<SynctrolTabPanelRegistration[]>([])
const activeId = ref<number | null>(1)
let nextId = 0

function register(label: string): number {
  const id = ++nextId
  panels.push({ id, label })
  return id
}

function unregister(id: number): void {
  const index = panels.findIndex((panel) => panel.id === id)
  if (index >= 0) panels.splice(index, 1)
  if (activeId.value === id) {
    activeId.value = panels[0]?.id ?? null
  }
}

function select(id: number): void {
  activeId.value = id
}

provide(SYNCTROL_TABS_CONTEXT_KEY, {
  panels,
  activeId,
  register,
  unregister,
})

const tabs = computed<Array<{ id: number; label: string }>>(() => {
  const vnodes = (slots.default?.() ?? []) as VNode[]
  return vnodes.map((vnode, index) => ({
    id: index + 1,
    label: (vnode.props?.label as string | undefined) ?? '',
  }))
})
</script>

<template>
  <div class="syn-tabview" data-testid="tabview">
    <div v-if="tabs.length" class="syn-tabview__bar" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :id="`syn-tab-${tab.id}`"
        :aria-controls="`syn-tab-panel-${tab.id}`"
        :aria-selected="activeId === tab.id"
        class="syn-tabview__tab"
        @click="select(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
    <slot />
  </div>
</template>
