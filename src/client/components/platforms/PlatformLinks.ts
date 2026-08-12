import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import type { ContentDefinitions, LocaleKey, NormalizedPlatformEntry } from '../../../shared/types.js'
import type { PlatformTypeRegistration } from '../../../shared/options.js'
import { PlatformEmbed } from './PlatformEmbed.js'
import { resolvePlatformLabel } from './resolve-platform-label.js'

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
  },
  setup(props) {
    return () =>
      h('section', { class: 'syn-platform-links', 'aria-label': props.messages.platformLinks }, [
        h('h2', { class: 'syn-platform-links__title' }, props.messages.platformLinks),
        h(
          'ul',
          { class: 'syn-platform-links__list' },
          props.entries.map((entry) => {
            const definition = props.definitions[entry.platform]
            const type = definition.type
            const registration = props.types[type]
            const label = resolvePlatformLabel({
              entry,
              definitionName: definition.name,
              locale: props.locale,
              mainLocale: props.mainLocale,
            })
            const body =
              type === 'link'
                ? h(registration.component, { entry, title: label.text })
                : h(PlatformEmbed, {
                    entry,
                    platformName: label.text,
                    loadStrategy: props.loadStrategy,
                    messages: props.messages,
                    typeRegistration: registration,
                  })
            return h('li', { class: 'syn-platform-links__item', key: entry.platform + label.text }, [
              body,
            ])
          }),
        ),
      ])
  },
})
