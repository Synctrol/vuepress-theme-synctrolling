import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, inject } from 'vue'
import ReleaseDetail from '../../../src/client/layouts/ReleaseDetail.vue'
import type { ReleaseDetailModel } from '../../../src/shared/release/types'
import { asset, zhMessages } from '../../helpers/release-fixtures'
import { builtInPlatformTypes } from '../../../src/platforms/builtins/index'
import { SYNCTROL_RELEASE_CONTEXT_KEY } from '../../../src/client/components/release/release-context'
import type { ContentDefinitions } from '../../../src/shared/types'

vi.mock('vuepress/client', () => ({
  Content: defineComponent({
    name: 'Content',
    setup: () => () => h('div', { 'data-testid': 'vuepress-content' }, '正文'),
  }),
}))

const Probe = defineComponent({
  name: 'Probe',
  setup() {
    const ctx = inject(SYNCTROL_RELEASE_CONTEXT_KEY)
    return () =>
      h('span', { 'data-testid': 'probe' }, ctx ? ctx.model.artwork.alt : 'none')
  },
})

const definitions: ContentDefinitions['platforms'] = {}

const model: ReleaseDetailModel = {
  includedInIndex: true,
  showDraftBadge: true,
  draftLabel: '草稿',
  artwork: { kind: 'artwork', artwork: asset('/entry.webp'), alt: '第一张专辑' },
}

describe('ReleaseDetail layout', () => {
  it('renders only the draft badge and Content, and provides the release context', () => {
    const wrapper = mount(ReleaseDetail, {
      props: {
        model,
        locale: 'zh',
        mainLocale: 'zh',
        definitions,
        types: builtInPlatformTypes,
        loadStrategy: 'interaction' as const,
        messages: zhMessages,
      },
      global: {
        stubs: { Content: Probe },
      },
    })
    expect(wrapper.get('[data-testid="draft-badge"]').text()).toBe('草稿')
    expect(wrapper.get('[data-testid="probe"]').text()).toBe('第一张专辑')
    expect(wrapper.find('[data-detail-section]').exists()).toBe(false)
  })

  it('omits the draft badge when the model disables it', () => {
    const wrapper = mount(ReleaseDetail, {
      props: {
        model: { ...model, showDraftBadge: false },
        locale: 'zh',
        mainLocale: 'zh',
        definitions,
        types: builtInPlatformTypes,
        loadStrategy: 'interaction' as const,
        messages: zhMessages,
      },
      global: { stubs: { Content: true } },
    })
    expect(wrapper.find('[data-testid="draft-badge"]').exists()).toBe(false)
  })
})
