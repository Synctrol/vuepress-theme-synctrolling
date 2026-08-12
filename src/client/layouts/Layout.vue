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
import { useThemeOptions } from '../composables/useThemeOptions.js'
import { buildLocaleAlternates } from '../i18n/locale-alternates.js'
import { encodePathSegment } from '../../shared/encode-path-segment.js'
import { joinPublicPath, normalizeBase } from '../../shared/route-path.js'

interface SynctrolFrontmatter {
  identity?: string
  locale?: string
  contentAssets?: Record<string, string>
  alternates?: Array<{ locale: string; publicPath: string }>
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
</script>

<template>
  <BackgroundHost :runtime="runtime" :sync-input="syncInput" />
  <ShellLayout>
    <Content />
  </ShellLayout>
</template>
