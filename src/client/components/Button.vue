<script setup lang="ts">
import { computed } from 'vue'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import { resolveLinkHref } from '../navigation/resolve-link-href.js'

const props = defineProps<{
  href?: string
}>()

const { shell, locale } = useLocaleShell()
const resolvedHref = computed(() =>
  props.href === undefined
    ? undefined
    : resolveLinkHref({
        href: props.href,
        locale: locale.value,
        base: shell.base,
      }).href,
)
</script>

<template>
  <a v-if="resolvedHref" :href="resolvedHref" class="syn-button"><slot /></a>
  <button v-else type="button" class="syn-button"><slot /></button>
</template>
