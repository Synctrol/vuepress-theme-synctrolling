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
const credit = computed(() => context?.model.book?.credit)
const rows = computed(() =>
  credit.value
    ? CREDIT_ORDER.filter(([key]) => credit.value![key] !== undefined)
    : [],
)
</script>

<template>
  <section
    v-if="rows.length"
    class="syn-album-section syn-album-credit"
    data-testid="album-credit"
  >
    <dl>
      <template v-for="[key, labelKey] in rows" :key="key">
        <div class="syn-album-credit__row" data-testid="credit-row">
          <dt>{{ context!.messages[labelKey] }}</dt>
          <dd>{{ credit![key] }}</dd>
        </div>
      </template>
    </dl>
  </section>
</template>
