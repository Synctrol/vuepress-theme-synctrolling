import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountShell } from './mount'

describe('client harness', () => {
  it('mounts a Vue SFC under happy-dom', () => {
    const Comp = defineComponent({
      setup() {
        return () => h('button', { type: 'button' }, 'OK')
      },
    })
    const wrapper = mountShell(Comp)
    expect(wrapper.get('button').text()).toBe('OK')
  })
})
