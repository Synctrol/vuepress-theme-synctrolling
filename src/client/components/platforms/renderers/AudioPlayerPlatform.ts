import { defineComponent, h } from 'vue'

export const AudioPlayerPlatform = defineComponent({
  name: 'AudioPlayerPlatform',
  props: {
    entry: { type: Object, required: true },
    title: { type: String, required: true },
  },
  emits: ['error'],
  setup(props, { emit }) {
    return () =>
      h(
        'audio',
        {
          class: 'syn-platform-audio',
          controls: true,
          preload: 'none',
          title: props.title,
          'aria-label': props.title,
          onError: () => emit('error'),
        },
        [
          h('source', {
            src: String(props.entry.src),
            ...(props.entry.mime ? { type: String(props.entry.mime) } : {}),
          }),
        ],
      )
  },
})
