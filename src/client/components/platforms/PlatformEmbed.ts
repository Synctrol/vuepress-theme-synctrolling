import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PropType } from 'vue'
import type { PlatformTypeRegistration } from '../../../shared/options.js'
import { formatMessage } from '../../../platforms/format-message.js'

type LoadStrategy = 'interaction' | 'viewport'

export const PlatformEmbed = defineComponent({
  name: 'PlatformEmbed',
  props: {
    entry: { type: Object, required: true },
    platformName: { type: String, required: true },
    loadStrategy: { type: String as PropType<LoadStrategy>, required: true },
    autoActivate: { type: Boolean, default: false },
    messages: {
      type: Object as PropType<{
        activateEmbed: string
        embedFailed: string
        openExternal: string
      }>,
      required: true,
    },
    typeRegistration: {
      type: Object as PropType<PlatformTypeRegistration>,
      required: true,
    },
  },
  setup(props) {
    const state = ref<'idle' | 'ready' | 'failed'>('idle')
    const root = ref<HTMLElement | null>(null)
    let observer: IntersectionObserver | null = null

    const activateLabel = computed(() =>
      formatMessage(props.messages.activateEmbed, { platform: props.platformName }),
    )
    const failedLabel = computed(() =>
      formatMessage(props.messages.embedFailed, { platform: props.platformName }),
    )
    const openLabel = computed(() =>
      formatMessage(props.messages.openExternal, { platform: props.platformName }),
    )
    const fallbackUrl = computed(
      () => props.typeRegistration.fallbackUrl?.(props.entry as never) ?? undefined,
    )

    function activate() {
      if (state.value !== 'idle') return
      state.value = 'ready'
    }

    function onError() {
      state.value = 'failed'
    }

    onMounted(() => {
      if (props.loadStrategy !== 'viewport' || !root.value) return
      observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          activate()
          observer?.disconnect()
        }
      })
      observer.observe(root.value)
    })

    onBeforeUnmount(() => observer?.disconnect())

    watch(
      () => props.autoActivate,
      (value) => {
        if (value) activate()
      },
      { immediate: true },
    )

    watch(
      () => props.loadStrategy,
      () => {
        /* strategy is fixed per mount in v1 */
      },
    )

    return () => {
      const children = []
      if (state.value === 'idle' && props.loadStrategy === 'interaction') {
        children.push(
          h(
            'button',
            {
              type: 'button',
              class: 'syn-platform-embed__activate',
              'aria-label': activateLabel.value,
              onClick: activate,
            },
            activateLabel.value,
          ),
        )
      }
      if (state.value === 'idle' && props.loadStrategy === 'viewport') {
        children.push(h('div', { class: 'syn-platform-embed__sentinel', 'aria-hidden': 'true' }))
      }
      if (state.value === 'ready') {
        children.push(
          h(props.typeRegistration.component, {
            entry: props.entry,
            title: props.platformName,
            onError,
          }),
        )
      }
      if (state.value === 'failed') {
        if (fallbackUrl.value) {
          children.push(
            h(
              'a',
              {
                class: 'syn-platform-embed__fallback',
                href: fallbackUrl.value,
                target: '_blank',
                rel: 'noopener noreferrer',
                'aria-label': openLabel.value,
              },
              failedLabel.value,
            ),
          )
        } else {
          children.push(
            h('p', { class: 'syn-platform-embed__failed', role: 'status' }, failedLabel.value),
          )
        }
      }
      return h('div', { class: 'syn-platform-embed', ref: root }, children)
    }
  },
})
