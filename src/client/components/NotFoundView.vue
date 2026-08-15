<script setup lang="ts">
import { computed } from 'vue'
import { useLocaleShell } from '../composables/useLocaleShell.js'
import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'
import { encodePathSegment } from '../../shared/encode-path-segment.js'

const { shell, locale, messages } = useLocaleShell()

const homeHref = computed(() =>
  joinPublicPath(
    normalizeBase(shell.base),
    `/${encodePathSegment(locale.value)}/`,
  ),
)
</script>

<template>
  <section class="syn-notfound">
    <p class="syn-notfound__code" aria-hidden="true">404</p>
    <h1 class="syn-notfound__title">{{ messages.notFoundTitle }}</h1>
    <p class="syn-notfound__description">{{ messages.notFoundDescription }}</p>
    <a class="syn-button syn-notfound__home" :href="homeHref">
      {{ messages.notFoundBackHome }}
    </a>
  </section>
</template>
