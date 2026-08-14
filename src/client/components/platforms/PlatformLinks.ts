import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import type { ContentDefinitions, LocaleKey, NormalizedPlatformEntry } from '../../../shared/types.js'
import type { PlatformTypeRegistration } from '../../../shared/options.js'
import { PlatformEntry } from './PlatformEntry.js'

export const PlatformLinks = defineComponent({
  name: 'PlatformLinks',
  props: {
    entries: {
      type: Array as PropType<NormalizedPlatformEntry[]>,
      required: true,
    },
    definitions: {
      type: Object as PropType<ContentDefinitions['platforms']>,
      required: true,
    },
    types: {
      type: Object as PropType<Record<string, PlatformTypeRegistration>>,
      required: true,
    },
    loadStrategy: {
      type: String as PropType<'interaction' | 'viewport'>,
      required: true,
    },
    autoActivate: {
      type: Boolean,
      default: false,
    },
    locale: { type: String as PropType<LocaleKey>, required: true },
    mainLocale: { type: String as PropType<LocaleKey>, required: true },
    messages: {
      type: Object as PropType<{
        platformLinks: string
        activateEmbed: string
        embedFailed: string
        openExternal: string
      }>,
      required: true,
    },
    title: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    const sectionTitle = props.title ?? props.messages.platformLinks
    return () =>
      h('section', { class: 'syn-platform-links', 'aria-label': sectionTitle }, [
        h('h2', { class: 'syn-platform-links__title' }, sectionTitle),
        h(
          'ul',
          { class: 'syn-platform-links__list' },
          props.entries.map((entry) =>
            h(PlatformEntry, {
              entry,
              definitions: props.definitions,
              types: props.types,
              loadStrategy: props.loadStrategy,
              autoActivate: props.autoActivate,
              locale: props.locale,
              mainLocale: props.mainLocale,
              messages: props.messages,
              key: entry.platform,
            }),
          ),
        ),
      ])
  },
})
