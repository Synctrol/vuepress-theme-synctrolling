<script setup lang="ts">
import { computed } from 'vue'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import { resolveNavHref } from '../navigation/resolve-nav-href.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'

const { theme, shell, locale } = useLocaleShell()

const items = computed(() =>
  theme.navigation.items.map((item) => {
    const label = resolveMultilanguage(
      item.label,
      locale.value,
      theme.mainLocale,
    )
    const resolved = resolveNavHref({
      href: item.href,
      locale: locale.value,
      base: shell.base,
      mainLocale: theme.mainLocale,
    })
    const target = resolved.external
      ? theme.navigation.externalTarget
      : undefined
    const rel =
      resolved.external && theme.navigation.externalTarget === '_blank'
        ? 'noopener noreferrer'
        : undefined
    return {
      label: label.text,
      labelLang: label.fellBack ? label.locale : undefined,
      href: resolved.href,
      external: resolved.external,
      icon: item.icon,
      target,
      rel,
    }
  }),
)
</script>

<template>
  <nav class="syn-navigation" aria-label="Navigation">
    <ul class="syn-navigation__list">
      <li v-for="(item, index) in items" :key="index" class="syn-navigation__item">
        <a
          class="syn-navigation__link"
          :href="item.href"
          :target="item.target"
          :rel="item.rel"
          :lang="item.labelLang"
        >
          <span
            v-if="item.icon !== undefined"
            class="syn-navigation__mark"
            aria-hidden="true"
          >
            <img
              class="syn-navigation__mark-icon"
              :src="item.icon"
              alt=""
              width="36"
              height="36"
            />
          </span>
          <span class="syn-navigation__label">{{ item.label }}</span>
        </a>
      </li>
    </ul>
    <div class="syn-navigation__side-panel">
      <slot name="side-panel" />
    </div>
  </nav>
</template>
