import { defineComponent, h } from 'vue'

export function createStubRenderer(name: string) {
  return defineComponent({
    name,
    props: {
      entry: { type: Object, required: true },
      title: { type: String, required: true },
    },
    setup(props) {
      return () => h('div', { 'data-platform-stub': name, title: props.title })
    },
  })
}
