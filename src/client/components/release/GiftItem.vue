<script setup lang="ts">
import { computed } from 'vue'
import { PlatformLinks } from '../platforms/PlatformLinks.js'
import { useReleasePage } from './release-context.js'

const props = defineProps<{ id: string }>()

const context = useReleasePage()
const item = computed(() =>
  context && context.model.book?.type === 'gift'
    ? context.model.book.items.find((entry) => entry.id === props.id)
    : undefined,
)
const platformMessages = computed(() => ({
  platformLinks: context?.messages.platformLinks ?? '',
  activateEmbed: context?.messages.activateEmbed ?? '',
  embedFailed: context?.messages.embedFailed ?? '',
  openExternal: context?.messages.openExternal ?? '',
}))

if (context !== undefined && item.value === undefined) {
  console.warn(
    context.model.book?.type === 'gift'
      ? `[vuepress-theme-synctrolling] GiftItem: unknown id "${props.id}"`
      : `[vuepress-theme-synctrolling] GiftItem: no gift data for id "${props.id}"`,
  )
}
</script>

<template>
  <article
    v-if="item"
    :id="`gift-${item.id}`"
    class="syn-gift-item"
    data-testid="gift-item"
  >
    <h3 :lang="item.title.lang">{{ item.title.text }}</h3>
    <p v-if="item.desc" :lang="item.desc.lang">{{ item.desc.text }}</p>

    <div v-if="item.covers.length" class="syn-gift-item__covers">
      <h4>{{ context!.messages.covers }}</h4>
      <ul>
        <li v-for="(cover, i) in item.covers" :key="cover.publicPath">
          <img
            data-testid="gift-item-cover"
            :src="cover.publicPath"
            :alt="`${item.title.text} ${context!.messages.covers} ${i + 1}`"
            loading="lazy"
          />
        </li>
      </ul>
    </div>

    <div v-if="item.previewLinks.length" class="syn-gift-item__previews">
      <PlatformLinks
        :entries="item.previewLinks"
        :definitions="context!.definitions"
        :types="context!.types"
        :load-strategy="context!.loadStrategy"
        :locale="context!.locale"
        :main-locale="context!.mainLocale"
        :messages="platformMessages"
        :title="context!.messages.previewSectionTitle"
      />
    </div>

    <div v-if="item.platformLinks.length" class="syn-gift-item__links">
      <PlatformLinks
        :entries="item.platformLinks"
        :definitions="context!.definitions"
        :types="context!.types"
        :load-strategy="context!.loadStrategy"
        :locale="context!.locale"
        :main-locale="context!.mainLocale"
        :messages="platformMessages"
      />
    </div>

    <p v-if="item.copyright">{{ item.copyright }}</p>
  </article>
</template>
