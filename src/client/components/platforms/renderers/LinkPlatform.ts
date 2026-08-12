import { defineComponent, h } from 'vue'

export const LinkPlatform = defineComponent({
  name: 'LinkPlatform',
  props: {
    entry: { type: Object, required: true },
    title: { type: String, required: true },
  },
  setup(props) {
    return () =>
      h(
        'a',
        {
          class: 'syn-platform-link',
          href: String(props.entry.url),
          target: '_blank',
          rel: 'noopener noreferrer',
          'aria-label': props.title,
        },
        props.title,
      )
  },
})
