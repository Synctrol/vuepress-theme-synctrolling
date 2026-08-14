<script setup lang="ts">
import { computed, provide, reactive, ref, watch } from 'vue'
import { Content, useData } from 'vuepress/client'
import { setContentAssetMap } from '../assets/resolve-content-asset.js'
import BackgroundHost from '../background/BackgroundHost.vue'
import { useBackgroundRuntime } from '../background/use-background-runtime.js'
import {
  SYNCTROL_DRAWER_OPEN_KEY,
  SYNCTROL_SHELL_CONTEXT_KEY,
  SYNCTROL_THEME_OPTIONS_KEY,
  type SynctrolShellContext,
} from '../composables/keys.js'
import ShellLayout from '../components/ShellLayout.vue'
import HomeLogoSlot from '../components/home/HomeLogoSlot.vue'
import { useThemeOptions } from '../composables/useThemeOptions.js'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import { buildLocaleAlternates } from '../i18n/locale-alternates.js'
import { encodePathSegment } from '../../shared/encode-path-segment.js'
import { formatCalendarDate } from '../../shared/format-calendar-date.js'
import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'
import { resolvePlatformTypes } from '../../platforms/registry.js'
import type { SynctrolReleaseFrontmatter } from '../../shared/release/types.js'
import type {
  SynctrolHomeFrontmatter,
  SynctrolNewsFrontmatter,
  SynctrolPageFrontmatter,
} from '../../shared/types/news.js'
import type { ContentDefinitions } from '../../shared/types.js'
import NewsDetailLayout from './NewsDetailLayout.vue'
import NewsIndexLayout from './NewsIndexLayout.vue'
import NewsTagArchiveLayout from './NewsTagArchiveLayout.vue'
import NewsTagsIndexLayout from './NewsTagsIndexLayout.vue'
import PageDetailLayout from './PageDetailLayout.vue'
import ReleaseIndex from './ReleaseIndex.vue'
import ReleaseDetail from './ReleaseDetail.vue'

interface SynctrolFrontmatter {
  identity?: string
  locale?: string
  contentType?: string
  contentAssets?: Record<string, string>
  alternates?: Array<{ locale: string; publicPath: string }>
  platformDefinitions?: ContentDefinitions['platforms']
  release?: SynctrolReleaseFrontmatter
  news?: SynctrolNewsFrontmatter
  page?: SynctrolPageFrontmatter
  home?: SynctrolHomeFrontmatter
}

const theme = useThemeOptions()
const { page, siteData } = useData()
const drawerOpen = ref(false)
const { runtime, syncInput } = useBackgroundRuntime()

const synctrol = computed(
  () => (page.value.frontmatter.synctrol as SynctrolFrontmatter | undefined) ?? {},
)

const identity = computed(() => synctrol.value.identity ?? 'home')
const locale = computed(() => synctrol.value.locale ?? theme.mainLocale)

const localeAlternates = computed(() => {
  const injected = synctrol.value.alternates ?? []
  const pages = injected.length
    ? injected.map((entry) => ({
        identity: identity.value,
        locale: entry.locale,
        publicPath: entry.publicPath,
      }))
    : Object.keys(theme.locales).map((key) => ({
        identity: identity.value,
        locale: key,
        // Encoded locale home — never raw `/${key}/` for non-ASCII keys
        publicPath: joinPublicPath(
          normalizeBase(siteData.value.base),
          `/${encodePathSegment(key)}/`,
        ),
      }))
  return buildLocaleAlternates({
    identity: identity.value,
    localeOptions: Object.fromEntries(
      Object.entries(theme.locales).map(([key, value]) => [
        key,
        { label: value.label },
      ]),
    ),
    pages,
  })
})

watch(
  () => synctrol.value.contentAssets,
  (map) => {
    setContentAssetMap(map ?? {})
  },
  { immediate: true },
)

const shell = reactive<SynctrolShellContext>({
  locale: locale.value,
  identity: identity.value,
  publicPath: page.value.path,
  base: siteData.value.base,
  drawerOpen: false,
  setDrawerOpen: (open: boolean) => {
    drawerOpen.value = open
  },
  localeAlternates: localeAlternates.value,
})

watch(
  [locale, identity, localeAlternates, page, siteData, drawerOpen],
  () => {
    shell.locale = locale.value
    shell.identity = identity.value
    shell.publicPath = page.value.path
    shell.base = siteData.value.base
    shell.localeAlternates = localeAlternates.value
    shell.drawerOpen = drawerOpen.value
  },
  { immediate: true, deep: true },
)

provide(SYNCTROL_THEME_OPTIONS_KEY, theme)
provide(SYNCTROL_SHELL_CONTEXT_KEY, shell)
provide(SYNCTROL_DRAWER_OPEN_KEY, drawerOpen)

// Layout owns the shell context, so resolve the footbar text locally
// (a component cannot inject its own provide).
const footbarText = computed(() =>
  theme.footbarText === undefined
    ? undefined
    : resolveMultilanguage(theme.footbarText, locale.value, theme.mainLocale),
)

const release = computed(() => synctrol.value.release)
const news = computed(() => synctrol.value.news)
const pageFrontmatter = computed(() => synctrol.value.page)
const home = computed(() => synctrol.value.home)
const platformDefinitions = computed(
  () => synctrol.value.platformDefinitions ?? {},
)
const platformTypes = resolvePlatformTypes({})
const localeMessages = computed(
  () =>
    theme.locales[locale.value]?.messages ??
    theme.locales[theme.mainLocale].messages,
)
const localeOption = computed(
  () => theme.locales[locale.value] ?? theme.locales[theme.mainLocale],
)
const formatDate = (date: string) =>
  formatCalendarDate(date, localeOption.value.lang, localeOption.value.dateFormat)
</script>

<template>
  <BackgroundHost :runtime="runtime" :sync-input="syncInput" />
  <ShellLayout>
    <ReleaseIndex
      v-if="release?.kind === 'index'"
      :model="release.model"
      :messages="localeMessages"
      :collection-title="release.collectionTitle"
      :prev-href="release.prevHref"
      :next-href="release.nextHref"
    />
    <ReleaseDetail
      v-else-if="release?.kind === 'detail'"
      :model="release.model"
      :locale="locale"
      :main-locale="theme.mainLocale"
      :definitions="platformDefinitions"
      :types="platformTypes"
      :load-strategy="theme.platforms.loadStrategy"
      :messages="localeMessages"
    />
    <NewsIndexLayout
      v-else-if="news?.kind === 'index'"
      :data="news.data"
      :empty-label="localeMessages.emptyNews"
      :draft-label="localeMessages.draft"
      :translation-unavailable-label="localeMessages.translationUnavailable"
      :previous-page-label="localeMessages.previousPage"
      :next-page-label="localeMessages.nextPage"
      :format-date="formatDate"
    />
    <NewsTagsIndexLayout
      v-else-if="news?.kind === 'tags-index'"
      :data="news.data"
    />
    <NewsTagArchiveLayout
      v-else-if="news?.kind === 'tag'"
      :data="news.data"
      :empty-label="localeMessages.emptyNews"
      :draft-label="localeMessages.draft"
      :translation-unavailable-label="localeMessages.translationUnavailable"
      :previous-page-label="localeMessages.previousPage"
      :next-page-label="localeMessages.nextPage"
      :format-date="formatDate"
    />
    <NewsDetailLayout
      v-else-if="news?.kind === 'detail'"
      :data="news.data"
      :published-label="localeMessages.published"
      :updated-label="localeMessages.updated"
      :draft-label="localeMessages.draft"
      :format-date="formatDate"
    >
      <Content />
    </NewsDetailLayout>
    <PageDetailLayout
      v-else-if="pageFrontmatter?.kind === 'detail'"
      :data="pageFrontmatter.data"
      :draft-label="localeMessages.draft"
    >
      <Content />
    </PageDetailLayout>
    <template v-else-if="home?.kind === 'home'">
      <HomeLogoSlot
        :html="home.logoHtml"
        :seo-title="String(page.frontmatter.title ?? '')"
      />
      <Content />
    </template>
    <Content v-else />
    <template #footer>
      <p
        v-if="footbarText !== undefined"
        class="syn-footbar-text"
        :lang="footbarText.fellBack ? footbarText.locale : undefined"
      >
        {{ footbarText.text }}
      </p>
    </template>
  </ShellLayout>
</template>
