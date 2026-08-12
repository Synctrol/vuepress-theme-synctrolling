<script setup lang="ts">
import { computed } from 'vue'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'

const { theme, locale } = useLocaleShell()

const items = computed(() =>
  theme.socialLinks.items.map((item) => {
    const label = resolveMultilanguage(
      item.label,
      locale.value,
      theme.mainLocale,
    )
    return {
      href: item.url,
      icon: item.icon,
      label: label.text,
      labelLang: label.fellBack ? label.locale : undefined,
    }
  }),
)
</script>

<template>
  <ul class="syn-social-links" aria-label="Social links">
    <li v-for="(item, index) in items" :key="index" class="syn-social-links__item">
      <a
        class="syn-social-links__link"
        :href="item.href"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="item.label"
        :lang="item.labelLang"
      >
        <img
          class="syn-social-links__icon"
          :src="item.icon"
          alt=""
          aria-hidden="true"
          width="40"
          height="40"
        />
      </a>
    </li>
  </ul>
</template>
