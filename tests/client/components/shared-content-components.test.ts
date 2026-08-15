/** @vitest-environment happy-dom */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContentColumn from '../../../src/client/components/ContentColumn.vue'
import ContentCover from '../../../src/client/components/ContentCover.vue'
import DraftBadge from '../../../src/client/components/DraftBadge.vue'
import PaginationNav from '../../../src/client/components/PaginationNav.vue'
import TranslationUnavailableBadge from '../../../src/client/components/TranslationUnavailableBadge.vue'

describe('Plan 09 shared content components', () => {
  it('extends DraftBadge and adds translation status badge', () => {
    expect(mount(DraftBadge, { props: { label: 'Draft' } }).find('[data-testid="draft-badge"]').text()).toBe('Draft')
    const translation = mount(TranslationUnavailableBadge, { props: { label: 'Unavailable' } })
    expect(translation.find('[data-testid="translation-unavailable-badge"]').attributes('role')).toBe('status')
    expect(translation.text()).toBe('Unavailable')
  })

  it('renders a 760px content column wrapper', () => {
    const wrapper = mount(ContentColumn, { slots: { default: '<p>Body</p>' } })
    expect(wrapper.find('[data-testid="content-column"]').classes()).toContain('syn-content-column')
    expect(wrapper.text()).toBe('Body')
  })

  it('mirrors ReleaseIndex pagination nav accessibility and links', () => {
    const wrapper = mount(PaginationNav, {
      props: {
        prevHref: '/base/en/news/',
        nextHref: '/base/en/news/page/3/',
        prevLabel: 'Previous',
        nextLabel: 'Next',
        page: 2,
        pageCount: 3,
      },
    })
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Pagination')
    expect(wrapper.find('[data-testid="pagination-prev"]').attributes('href')).toBe('/base/en/news/')
    expect(wrapper.find('[data-testid="pagination-next"]').attributes('href')).toBe('/base/en/news/page/3/')
    expect(wrapper.find('[data-testid="pagination-status"]').text()).toBe('2 / 3')
  })

  it('renders a page indicator without a prev link on the first page', () => {
    const wrapper = mount(PaginationNav, {
      props: {
        nextHref: '/base/en/news/page/2/',
        prevLabel: 'Previous',
        nextLabel: 'Next',
        page: 1,
        pageCount: 2,
      },
    })
    expect(wrapper.find('[data-testid="pagination-prev"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="pagination-next"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="pagination-status"]').text()).toBe('1 / 2')
  })

  it('renders optional covers with lazy/eager loading', () => {
    const wrapper = mount(ContentCover, { props: { src: '/cover.webp', alt: 'Cover', eager: true } })
    expect(wrapper.find('[data-testid="content-cover"]').attributes()).toMatchObject({
      src: '/cover.webp',
      alt: 'Cover',
      loading: 'eager',
    })
  })
})
