<script setup lang="ts">
import { computed, inject, useAttrs } from 'vue'
import type { PlatformTypeRegistration } from '../../../shared/options.js'
import { coercePlayerAttributes } from '../../../shared/player-entry.js'
import { builtInPlatformTypes } from '../../../platforms/builtins/index.js'
import { PlatformEmbed } from '../platforms/PlatformEmbed.js'
import { SYNCTROL_TAB_PANEL_ACTIVE_KEY } from './tabs-context.js'
import { useReleasePage } from './release-context.js'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ type: string }>()
const attrs = useAttrs()
const context = useReleasePage()
const panelActive = inject(
  SYNCTROL_TAB_PANEL_ACTIVE_KEY,
  computed(() => false),
)
const registration = computed(
  () =>
    (builtInPlatformTypes as Record<string, PlatformTypeRegistration>)[
      props.type
    ],
)
const entry = computed(() => {
  if (!registration.value) return undefined
  try {
    return registration.value.validate({
      platform: props.type,
      ...coercePlayerAttributes(attrs),
    })
  } catch {
    console.warn(`Player: invalid attributes for type "${props.type}"`)
    return undefined
  }
})
const messages = computed(() => ({
  activateEmbed: context?.messages.activateEmbed ?? '',
  embedFailed: context?.messages.embedFailed ?? '',
  openExternal: context?.messages.openExternal ?? '',
}))

if (!registration.value) {
  console.warn(`Player: unknown player type "${props.type}"`)
}
</script>

<template>
  <PlatformEmbed
    v-if="context && registration && entry"
    :entry="entry"
    :platform-name="props.type"
    :load-strategy="context.loadStrategy"
    :auto-activate="panelActive"
    :messages="messages"
    :type-registration="registration"
    data-testid="player"
  />
</template>
