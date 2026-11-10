<script setup lang="ts">
import { computed } from 'vue'
import { resolveMultilanguage } from '../../../shared/multilanguage.js'
import {
  formatMessage,
  numberDiscs,
} from '../../../shared/release/numbering.js'
import {
  normalizeAlbumSrc,
  useReleasePage,
} from './release-context.js'
import type { NumberedTrack } from '../../../shared/release/numbering.js'
import type { Multilanguage } from '../../../shared/types.js'

const props = withDefaults(
  defineProps<{
    src: string
    showArtist?: boolean
    showDesc?: boolean
  }>(),
  {
    showArtist: true,
    showDesc: false,
  },
)

const context = useReleasePage()
const album = computed(() =>
  context?.albumBySrc[normalizeAlbumSrc(props.src)],
)
const discs = computed(() => numberDiscs(album.value?.discs ?? []))

if (context && !album.value) {
  console.warn(`AlbumTracklist: no album metadata for src "${props.src}"`)
}

function resolved(value: Multilanguage) {
  const r = resolveMultilanguage(value, context!.locale, context!.mainLocale)
  return { text: r.text, lang: r.fellBack ? r.locale : undefined }
}

function trackTitle(track: NumberedTrack) {
  return resolved(track.title)
}
</script>

<template>
  <section
    v-if="album && discs.length"
    class="syn-album-section syn-album-tracklist"
    data-testid="album-tracklist"
  >
    <article
      v-for="disc in discs"
      :id="disc.anchor"
      :key="disc.anchor"
      class="syn-album-disc"
    >
      <h3 v-if="discs.length > 1">
        {{ formatMessage(context!.messages.disc, { number: disc.number }) }}
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
            {{ formatMessage(context!.messages.track, { number: track.number }) }}
          </span>
          <span class="syn-album-track__main">
            <span class="syn-album-track__title" :lang="trackTitle(track).lang">
              {{ trackTitle(track).text }}
            </span>
            <span
              v-if="props.showArtist"
              class="syn-album-track__artists"
              >{{ track.artists.join(' / ') }}</span
            >
            <span
              v-if="props.showDesc && track.desc"
              class="syn-album-track__desc"
              :lang="resolved(track.desc).lang"
              data-testid="track-desc"
              >{{ resolved(track.desc).text }}</span
            >
          </span>
        </li>
      </ol>
    </article>
  </section>
</template>
