<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { persistLocalePreference } from '../i18n/locale-alternates.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'

const { messages, localeLabel, shell, locale } = useLocaleShell()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const toggleRef = ref<HTMLButtonElement | null>(null)

const alternates = computed(() => shell.localeAlternates)

function close(): void {
  if (!open.value) return
  open.value = false
  toggleRef.value?.focus()
}

function toggle(): void {
  open.value = !open.value
}

function select(href: string, targetLocale: string, event: Event): void {
  event.preventDefault()
  persistLocalePreference(window.localStorage, targetLocale)
  open.value = false
  window.location.assign(href)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

function onPointerDown(event: MouseEvent): void {
  if (!open.value || !rootRef.value) return
  if (!rootRef.value.contains(event.target as Node)) close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('mousedown', onPointerDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousedown', onPointerDown)
})
</script>

<template>
  <div ref="rootRef" class="syn-language">
    <button
      ref="toggleRef"
      type="button"
      class="syn-language__toggle"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-label="messages.language"
      @click="toggle"
    >
      {{ localeLabel }}
    </button>
    <ul
      class="syn-language__list"
      :class="{ 'syn-language__list--open': open }"
      role="listbox"
      :aria-hidden="open ? 'false' : 'true'"
    >
      <li v-for="item in alternates" :key="item.locale" role="option">
        <a
          class="syn-language__option"
          :href="item.href"
          :aria-current="item.locale === locale ? 'page' : undefined"
          @click="select(item.href, item.locale, $event)"
        >
          {{ item.label }}
        </a>
      </li>
    </ul>
  </div>
</template>
