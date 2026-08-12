<script setup lang="ts">
import { PlatformLinks } from '../platforms/PlatformLinks.js'
import { formatMessage } from '../../../shared/release/numbering.js'
import { resolveMultilanguage } from '../../../shared/multilanguage.js'
import type { NumberedDisc } from '../../../shared/release/numbering.js'
import type {
  ContentDefinitions,
  LocaleKey,
  NormalizedPlatformEntry,
} from '../../../shared/types.js'
import type { PlatformTypeRegistration } from '../../../shared/options.js'
import type { ResolvedAsset } from '../../../shared/asset-types.js'

defineProps<{
  links: NormalizedPlatformEntry[]
  covers: ResolvedAsset[]
  discs: NumberedDisc[]
  labels: {
    platformLinks: string
    covers: string
    tracklist: string
    disc: string
    track: string
  }
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
  <div class="syn-album-book-body" data-testid="album-book-body">
    <section v-if="links.length" data-section="links" class="syn-album-links">
      <PlatformLinks
        :entries="links"
        :definitions="definitions"
        :types="types"
        :load-strategy="loadStrategy"
        :locale="locale"
        :main-locale="mainLocale"
        :messages="platformMessages"
      />
    </section>

    <section v-if="covers.length" data-section="covers" class="syn-album-covers">
      <h2>{{ labels.covers }}</h2>
      <ul>
        <li v-for="(cover, i) in covers" :key="cover.publicPath">
          <img
            data-testid="album-cover"
            :src="cover.publicPath"
            :alt="`${labels.covers} ${i + 1}`"
            loading="lazy"
          />
        </li>
      </ul>
    </section>

    <section v-if="discs.length" data-section="discs" class="syn-album-discs">
      <h2>{{ labels.tracklist }}</h2>
      <article
        v-for="disc in discs"
        :id="disc.anchor"
        :key="disc.anchor"
        class="syn-album-disc"
      >
        <h3>
          {{ formatMessage(labels.disc, { number: disc.number }) }}
          ·
          <span
            :lang="
              resolveMultilanguage(disc.title, locale, mainLocale).fellBack
                ? resolveMultilanguage(disc.title, locale, mainLocale).locale
                : undefined
            "
          >
            {{ resolveMultilanguage(disc.title, locale, mainLocale).text }}
          </span>
        </h3>
        <ol class="syn-album-tracks">
          <li
            v-for="track in disc.tracks"
            :id="track.anchor"
            :key="track.anchor"
            data-testid="track-row"
            class="syn-album-track"
          >
            <span class="syn-album-track__label">
              {{ formatMessage(labels.track, { number: track.number }) }}
            </span>
            <span
              class="syn-album-track__title"
              :lang="
                resolveMultilanguage(track.title, locale, mainLocale).fellBack
                  ? resolveMultilanguage(track.title, locale, mainLocale).locale
                  : undefined
              "
            >
              {{ resolveMultilanguage(track.title, locale, mainLocale).text }}
            </span>
            <span class="syn-album-track__artists">{{
              track.artists.join(', ')
            }}</span>
            <time class="syn-album-track__duration">
              {{ track.durationLabel }}
            </time>
          </li>
        </ol>
      </article>
    </section>
  </div>
</template>
