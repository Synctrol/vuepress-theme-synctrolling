<script setup lang="ts">
import { computed, inject, provide, ref, type Ref } from 'vue'
import {
  SYNCTROL_DRAWER_OPEN_KEY,
} from '../composables/keys.js'
import HeaderBar from './HeaderBar.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import NavDrawer from './NavDrawer.vue'
import Navigation from './Navigation.vue'
import SiteFooter from './SiteFooter.vue'
import SocialLinks from './SocialLinks.vue'

const injected = inject(SYNCTROL_DRAWER_OPEN_KEY, null) as Ref<boolean> | null
const drawerOpen = injected ?? ref(false)
if (!injected) provide(SYNCTROL_DRAWER_OPEN_KEY, drawerOpen)

const shellClass = computed(() => ({
  'syn-shell': true,
  'syn-shell--drawer-open': drawerOpen.value,
}))
</script>

<template>
  <div :class="shellClass">
    <HeaderBar />
    <main class="syn-main">
      <section class="cell cell-title">
        <slot />
      </section>
      <NavDrawer />
    </main>
    <Navigation />
    <div class="syn-side-panel" />
    <SiteFooter>
      <slot name="footer" />
      <SocialLinks />
      <LanguageSwitcher />
    </SiteFooter>
  </div>
</template>
