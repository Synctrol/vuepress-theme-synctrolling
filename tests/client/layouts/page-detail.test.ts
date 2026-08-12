/** @vitest-environment happy-dom */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PageDetailLayout from '../../../src/client/layouts/PageDetailLayout.vue'
import type { PageDetailPageData } from '../../../src/shared/types/news'

describe('PageDetailLayout', () => {
  it('renders 760px page body with optional cover and no listing', () => {
    const data: PageDetailPageData = {
      kind: 'page-detail',
      slug: 'team',
      title: 'Team',
      titleLang: 'en-US',
      coverPublicPath: '/base/team.webp',
      isFallback: false,
      isDraft: false,
      bodyLang: 'en-US',
    }
    const wrapper = mount(PageDetailLayout, {
      props: { data, draftLabel: 'Draft' },
      slots: { default: '<p>Team body</p>' },
    })
    expect(wrapper.find('[data-testid="content-column"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="content-cover"]').attributes('src')).toBe('/base/team.webp')
    expect(wrapper.find('[data-testid="page-listing"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="search"]').exists()).toBe(false)
    expect((wrapper.props() as { layout?: unknown }).layout).toBeUndefined()
  })
})
