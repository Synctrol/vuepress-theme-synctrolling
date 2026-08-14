import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import type {
  ContentDefinitions,
  LocaleKey,
  NormalizedPlatformEntry,
} from '../../../shared/types.js'
import type { PlatformTypeRegistration } from '../../../shared/options.js'
import { PlatformEmbed } from './PlatformEmbed.js'
import { resolvePlatformLabel } from './resolve-platform-label.js'

export const PlatformEntry = defineComponent({
  name: 'PlatformEntry',
  props: {
    entry: {
      type: Object as PropType<NormalizedPlatformEntry>,
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
    standalone: {
      type: Boolean,
      default: false,
    },
    locale: { type: String as PropType<LocaleKey>, required: true },
    mainLocale: { type: String as PropType<LocaleKey>, required: true },
    messages: {
      type: Object as PropType<{
        activateEmbed: string
        embedFailed: string
        openExternal: string
      }>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const definition = props.definitions[props.entry.platform]
      const registration = props.types[definition.type]
      const label = resolvePlatformLabel({
        entry: props.entry,
        definitionName: definition.name,
        locale: props.locale,
        mainLocale: props.mainLocale,
      })
      const body =
        definition.type === 'link'
          ? h(registration.component, { entry: props.entry, title: label.text })
          : h(PlatformEmbed, {
              entry: props.entry,
              platformName: label.text,
              loadStrategy: props.loadStrategy,
              autoActivate: props.autoActivate,
              messages: props.messages,
              typeRegistration: registration,
            })
      if (props.standalone) {
        return h('div', { class: 'syn-platform-entry' }, [body])
      }
      return h(
        'li',
        { class: 'syn-platform-links__item', key: props.entry.platform + label.text },
        [body],
      )
    }
  },
})
