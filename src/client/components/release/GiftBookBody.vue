<script setup lang="ts">
import { PlatformLinks } from '../platforms/PlatformLinks.js'
import type { ReleaseDetailSection } from '../../../shared/release/types.js'
import type { ContentDefinitions, LocaleKey } from '../../../shared/types.js'
import type { PlatformTypeRegistration } from '../../../shared/options.js'

defineProps<{
  items: Extract<ReleaseDetailSection, { kind: 'gift-body' }>['items']
  labels: Extract<ReleaseDetailSection, { kind: 'gift-body' }>['labels']
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
  <section class="syn-gift-book-body" data-testid="gift-book-body">
    <h2>{{ labels.giftItems }}</h2>
    <article
      v-for="item in items"
      :id="`gift-${item.id}`"
      :key="item.id"
      class="syn-gift-item"
      data-testid="gift-item"
    >
      <h3 :lang="item.title.lang">{{ item.title.text }}</h3>
      <p v-if="item.desc" :lang="item.desc.lang">{{ item.desc.text }}</p>

      <div
        v-if="item.covers.length"
        data-item-section="covers"
        class="syn-gift-item__covers"
      >
        <h4>{{ labels.covers }}</h4>
        <ul>
          <li v-for="(cover, i) in item.covers" :key="cover.publicPath">
            <img
              data-testid="gift-item-cover"
              :src="cover.publicPath"
              :alt="`${item.title.text} ${labels.covers} ${i + 1}`"
              loading="lazy"
            />
          </li>
        </ul>
      </div>

      <div
        v-if="item.links.length"
        data-item-section="links"
        class="syn-gift-item__links"
      >
        <PlatformLinks
          :entries="item.links"
          :definitions="definitions"
          :types="types"
          :load-strategy="loadStrategy"
          :locale="locale"
          :main-locale="mainLocale"
          :messages="platformMessages"
        />
      </div>

      <p v-if="item.copyright">{{ item.copyright }}</p>
    </article>
  </section>
</template>
