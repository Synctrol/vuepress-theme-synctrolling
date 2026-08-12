<script setup lang="ts">
import { Content } from 'vuepress/client'
import DraftBadge from '../components/DraftBadge.vue'
import ReleaseArtwork from '../components/release/ReleaseArtwork.vue'
import ReleaseBookIdentity from '../components/release/ReleaseBookIdentity.vue'
import AlbumBookBody from '../components/release/AlbumBookBody.vue'
import GiftBookBody from '../components/release/GiftBookBody.vue'
import type { ReleaseDetailModel } from '../../shared/release/types.js'
import type { ContentDefinitions, LocaleKey } from '../../shared/types.js'
import type { PlatformTypeRegistration } from '../../shared/options.js'

defineProps<{
  model: ReleaseDetailModel
  authorsLabel: string
  locale: LocaleKey
  mainLocale: LocaleKey
  definitions: ContentDefinitions['platforms']
  types: Record<string, PlatformTypeRegistration>
  loadStrategy: 'interaction' | 'viewport'
  platformMessages: {
    platformLinks: string
    activateEmbed: string
    embedFailed: string
    openExternal: string
  }
}>()
</script>

<template>
  <article class="syn-release-detail" data-testid="release-detail-root">
    <DraftBadge v-if="model.showDraftBadge" :label="model.draftLabel" />

    <template
      v-for="(section, index) in model.sections"
      :key="`${section.kind}-${index}`"
    >
      <p
        v-if="section.kind === 'return-link'"
        data-detail-section="return-link"
        class="syn-release-return"
      >
        <a :href="section.href">{{ section.label }}</a>
      </p>

      <header
        v-else-if="section.kind === 'title-date'"
        data-detail-section="title-date"
        class="syn-release-title-date"
      >
        <h1 :lang="section.titleLang">{{ section.title }}</h1>
        <p>
          <span>{{ section.dateLabel }}</span>
          <time>{{ section.date }}</time>
        </p>
      </header>

      <div
        v-else-if="section.kind === 'artwork'"
        data-detail-section="artwork"
        class="syn-release-detail-artwork"
      >
        <ReleaseArtwork
          :kind="section.artworkKind"
          :artwork="section.artwork"
          :alt="section.alt"
          eager
        />
      </div>

      <ReleaseBookIdentity
        v-else-if="section.kind === 'book-identity'"
        data-detail-section="book-identity"
        :section="section"
        :authors-label="authorsLabel"
      />

      <AlbumBookBody
        v-else-if="section.kind === 'album-body'"
        data-detail-section="album-body"
        :links="section.links"
        :covers="section.covers"
        :discs="section.discs"
        :labels="section.labels"
        :locale="locale"
        :main-locale="mainLocale"
        :definitions="definitions"
        :types="types"
        :load-strategy="loadStrategy"
        :platform-messages="platformMessages"
      />

      <GiftBookBody
        v-else-if="section.kind === 'gift-body'"
        data-detail-section="gift-body"
        :items="section.items"
        :labels="section.labels"
        :locale="locale"
        :main-locale="mainLocale"
        :definitions="definitions"
        :types="types"
        :load-strategy="loadStrategy"
        :platform-messages="platformMessages"
      />

      <div
        v-else-if="section.kind === 'markdown'"
        data-detail-section="markdown"
        class="syn-release-markdown"
        :lang="section.bodyLang"
      >
        <Content />
      </div>
    </template>
  </article>
</template>
