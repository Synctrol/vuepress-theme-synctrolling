<script setup lang="ts">
import { onMounted } from 'vue'
import { useData } from 'vuepress/client'
import { useThemeOptions } from '../composables/useThemeOptions.js'
import {
  matchBrowserLocale,
  toLocaleTable,
} from '../../shared/match-browser-locale.js'
import { LOCALE_STORAGE_KEY } from '../../shared/locale-storage.js'
import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'
import { encodePathSegment } from '../../compiler/path-suffix.js'

const theme = useThemeOptions()
const { siteData } = useData()

const base = normalizeBase(siteData.value.base)

const homes = Object.fromEntries(
  Object.keys(theme.locales).map((key) => [
    key,
    joinPublicPath(base, `/${encodePathSegment(key)}/`),
  ]),
)

function resolveLocale(): string | null {
  const known = Object.keys(theme.locales)
  let stored: string | null = null
  try {
    stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    stored = null
  }
  if (stored !== null && known.includes(stored)) return stored
  const preferences =
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : navigator.language
        ? [navigator.language]
        : []
  return matchBrowserLocale(preferences, toLocaleTable(theme.locales), theme.mainLocale)
}

onMounted(() => {
  const locale = resolveLocale()
  const target = locale === null ? undefined : homes[locale]
  // Client-side navigation: never an HTTP redirect, so the browser
  // cannot treat it as permanent.
  if (target !== undefined) location.replace(target)
})
</script>

<template>
  <nav class="syn-root-router" :aria-label="String(theme.locales[theme.mainLocale].label)">
    <ul class="syn-root-router__list">
      <li v-for="(href, key) in homes" :key="key" class="syn-root-router__item">
        <a
          class="syn-root-router__link"
          :href="href"
          :lang="theme.locales[key].lang"
          :hreflang="theme.locales[key].lang"
        >
          {{ theme.locales[key].label }}
        </a>
      </li>
    </ul>
  </nav>
</template>
