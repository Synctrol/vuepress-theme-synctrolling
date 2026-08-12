<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { persistLocalePreference } from '../i18n/locale-alternates.js'
import { useLocaleShell } from '../composables/useLocaleShell.js'

const { messages, localeLabel, shell, locale } = useLocaleShell()
const open = ref(false)
const activeIndex = ref(0)
const rootRef = ref<HTMLElement | null>(null)
const toggleRef = ref<HTMLButtonElement | null>(null)
const listboxRef = ref<HTMLElement | null>(null)
const listboxId = 'syn-language-listbox'

const alternates = computed(() => shell.localeAlternates)

const activeOptionId = computed(() => {
  const item = alternates.value[activeIndex.value]
  return item ? optionId(item.locale) : undefined
})

function optionId(targetLocale: string): string {
  return `syn-language-option-${targetLocale}`
}

function close(): void {
  if (!open.value) return
  open.value = false
  toggleRef.value?.focus()
}

async function openList(preferredIndex?: number): Promise<void> {
  const currentIdx = alternates.value.findIndex(
    (item) => item.locale === locale.value,
  )
  if (preferredIndex !== undefined) {
    activeIndex.value = preferredIndex
  } else {
    activeIndex.value = currentIdx >= 0 ? currentIdx : 0
  }
  open.value = true
  await nextTick()
  listboxRef.value?.focus()
}

function toggle(): void {
  if (open.value) close()
  else void openList()
}

function select(href: string, targetLocale: string, event: Event): void {
  event.preventDefault()
  persistLocalePreference(window.localStorage, targetLocale)
  open.value = false
  window.location.assign(href)
}

function activateActive(event: Event): void {
  const item = alternates.value[activeIndex.value]
  if (!item) return
  select(item.href, item.locale, event)
}

function moveActive(delta: number): void {
  const count = alternates.value.length
  if (count === 0) return
  activeIndex.value = (activeIndex.value + delta + count) % count
}

function onToggleKeydown(event: KeyboardEvent): void {
  if (open.value) return

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (event.key === 'ArrowUp') {
      void openList(Math.max(alternates.value.length - 1, 0))
    } else {
      void openList(0)
    }
  }
}

function onListboxKeydown(event: KeyboardEvent): void {
  if (!open.value) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      moveActive(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveActive(-1)
      break
    case 'Home':
      event.preventDefault()
      activeIndex.value = 0
      break
    case 'End':
      event.preventDefault()
      activeIndex.value = Math.max(alternates.value.length - 1, 0)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      activateActive(event)
      break
    case 'Escape':
      event.preventDefault()
      close()
      break
    default:
      break
  }
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
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="listboxId"
      :aria-label="messages.language"
      @click="toggle"
      @keydown="onToggleKeydown"
    >
      {{ localeLabel }}
    </button>
    <ul
      ref="listboxRef"
      :id="listboxId"
      class="syn-language__list"
      :class="{ 'syn-language__list--open': open }"
      role="listbox"
      :tabindex="open ? 0 : -1"
      :aria-activedescendant="open ? activeOptionId : undefined"
      :aria-hidden="open ? 'false' : 'true'"
      @keydown="onListboxKeydown"
    >
      <li
        v-for="item in alternates"
        :key="item.locale"
        role="presentation"
      >
        <button
          type="button"
          class="syn-language__option"
          role="option"
          :id="optionId(item.locale)"
          :aria-selected="item.locale === locale ? 'true' : 'false'"
          tabindex="-1"
          @click="select(item.href, item.locale, $event)"
        >
          {{ item.label }}
        </button>
      </li>
    </ul>
  </div>
</template>
