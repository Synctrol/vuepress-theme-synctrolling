<script setup lang="ts">
import { computed } from 'vue'
import { useReleasePage } from './release-context.js'
import type { BookCreditKey } from '../../../shared/types.js'

const CREDIT_ORDER: Array<
  [BookCreditKey, `credit${Capitalize<BookCreditKey>}`]
> = [
  ['catalogNumber', 'creditCatalogNumber'],
  ['illustrator', 'creditIllustrator'],
  ['designer', 'creditDesigner'],
  ['mastering', 'creditMastering'],
  ['mix', 'creditMix'],
  ['webDesign', 'creditWebDesign'],
  ['producer', 'creditProducer'],
  ['specialThanks', 'creditSpecialThanks'],
]

const context = useReleasePage()
const book = computed(() => context?.model.book)
const credit = computed(() => book.value?.credit)
const copyright = computed(() => book.value?.copyright)
const rows = computed(() =>
  credit.value
    ? CREDIT_ORDER.filter(([key]) => credit.value![key] !== undefined)
    : [],
)

function values(key: BookCreditKey): string[] {
  const entry = credit.value?.[key]
  if (entry === undefined) return []
  return Array.isArray(entry) ? entry : [entry]
}
</script>

<template>
  <section
    v-if="rows.length || copyright"
    class="syn-album-section syn-album-credit"
    data-testid="album-credit"
  >
    <h2>{{ context!.messages.credits }}</h2>
    <dl>
      <template v-for="[key, labelKey] in rows" :key="key">
        <div class="syn-album-credit__row" data-testid="credit-row">
          <dt>{{ context!.messages[labelKey] }}</dt>
          <dd>
            <span
              v-for="(value, index) in values(key)"
              :key="index"
              class="syn-album-credit__value"
              data-testid="credit-value"
              >{{ value }}</span
            >
          </dd>
        </div>
      </template>
      <div v-if="copyright" class="syn-album-credit__row" data-testid="credit-row">
        <dt>{{ context!.messages.creditCopyright }}</dt>
        <dd>
          <span class="syn-album-credit__value" data-testid="credit-value">{{
            copyright
          }}</span>
        </dd>
      </div>
    </dl>
  </section>
</template>
