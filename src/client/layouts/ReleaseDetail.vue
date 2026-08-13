<script setup lang="ts">
import { provide } from 'vue'
import { Content } from 'vuepress/client'
import DraftBadge from '../components/DraftBadge.vue'
import {
  SYNCTROL_RELEASE_CONTEXT_KEY,
} from '../components/release/release-context.js'
import type { ReleaseDetailModel } from '../../shared/release/types.js'
import type {
  ContentDefinitions,
  LocaleKey,
  LocaleMessages,
} from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'

const props = defineProps<{
  model: ReleaseDetailModel
  locale: LocaleKey
  mainLocale: LocaleKey
  definitions: ContentDefinitions['platforms']
  types: Record<string, PlatformTypeRegistration>
  loadStrategy: 'interaction' | 'viewport'
  messages: LocaleMessages
}>()

provide(SYNCTROL_RELEASE_CONTEXT_KEY, {
  locale: props.locale,
  mainLocale: props.mainLocale,
  model: props.model,
  definitions: props.definitions,
  types: props.types,
  loadStrategy: props.loadStrategy,
  messages: props.messages,
})
</script>

<template>
  <article class="syn-release-detail" data-testid="release-detail-root">
    <DraftBadge v-if="model.showDraftBadge" :label="model.draftLabel" />
    <Content />
  </article>
</template>
