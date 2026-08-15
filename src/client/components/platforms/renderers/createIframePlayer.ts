import { defineComponent, h } from 'vue'
import type { BuiltInPlatformType } from '../../../../shared/types.js'
import { buildEmbedUrl } from '../../../../platforms/urls.js'

export type EmbedKind = 'video' | 'player' | 'fixed-height'

export function createIframePlayer(
  name: string,
  type: BuiltInPlatformType,
  kind: EmbedKind = 'player',
  sandbox?: string,
) {
  return defineComponent({
    name,
    props: {
      entry: { type: Object, required: true },
      title: { type: String, required: true },
    },
    emits: ['error'],
    setup(props, { emit }) {
      return () => {
        const src = buildEmbedUrl(type, props.entry as Record<string, unknown>)
        if (!src) {
          emit('error')
          return h('div', { class: 'syn-platform-iframe syn-platform-iframe--missing' })
        }
        return h('iframe', {
          class: 'syn-platform-iframe',
          'data-embed-kind': kind,
          src,
          title: props.title,
          loading: 'lazy',
          referrerpolicy: 'strict-origin-when-cross-origin',
          ...(sandbox === undefined ? {} : { sandbox }),
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowfullscreen: true,
          onError: () => emit('error'),
        })
      }
    },
  })
}
