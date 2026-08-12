<script setup lang="ts">
import { computed } from 'vue'
import { resolveMultilanguage } from '../../shared/multilanguage.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'

const { theme, locale } = useLocaleShell()

const items = computed(() =>
  theme.linkCloud === undefined
    ? []
    : theme.linkCloud.items.map((item) => {
        const label = resolveMultilanguage(
          item.label,
          locale.value,
          theme.mainLocale,
        )
        return {
          label: label.text,
          labelLang: label.fellBack ? label.locale : undefined,
          href: item.href,
        }
      }),
)
</script>

<template>
  <div v-if="items.length > 0" class="syn-link-cloud">
    <div class="syn-link-cloud__divider" aria-hidden="true" />
    <ul class="syn-link-cloud__list">
      <li v-for="(item, index) in items" :key="index" class="syn-link-cloud__item">
        <a
          class="syn-link-cloud__link"
          :href="item.href"
          :lang="item.labelLang"
        >
          {{ item.label }}
        </a>
      </li>
    </ul>
  </div>
</template>
