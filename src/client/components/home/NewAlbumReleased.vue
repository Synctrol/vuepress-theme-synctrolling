<script setup lang="ts">
import { computed } from 'vue'
import { resolveContentAsset } from '../../assets/resolve-content-asset.js'
import { useLocaleShell } from '../../composables/useLocaleShell.js'
import { resolveLinkHref } from '../../navigation/resolve-link-href.js'

const props = withDefaults(
  defineProps<{
    title: string
    text?: string
    href?: string
    background: string
    position?: string
  }>(),
  {
    position: 'right center',
  },
)

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

const rootStyle = computed(() => {
  let image = ''
  try {
    image = `url("${resolveContentAsset(props.background)}")`
  } catch {
    console.warn(
      `NewAlbumReleased: unknown package asset "${props.background}"`,
    )
  }
  return {
    '--syn-new-album-image': image,
    '--syn-new-album-position': props.position,
  }
})
</script>

<template>
  <a
    v-if="resolvedHref"
    :href="resolvedHref"
    class="syn-new-album"
    data-testid="new-album-released"
    :style="rootStyle"
  >
    <div class="syn-new-album__body">
      <h2 class="syn-new-album__title">
        {{ title }}<span class="syn-new-album__arrow" aria-hidden="true">↗</span>
      </h2>
      <p v-if="text" class="syn-new-album__intro">{{ text }}</p>
    </div>
  </a>
  <div
    v-else
    class="syn-new-album"
    data-testid="new-album-released"
    :style="rootStyle"
  >
    <div class="syn-new-album__body">
      <h2 class="syn-new-album__title">
        {{ title }}<span class="syn-new-album__arrow" aria-hidden="true">↗</span>
      </h2>
      <p v-if="text" class="syn-new-album__intro">{{ text }}</p>
    </div>
  </div>
</template>
