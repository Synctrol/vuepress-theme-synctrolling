import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReleaseIndex from '../../../src/client/layouts/ReleaseIndex.vue'
import type { ReleaseIndexModel } from '../../../src/shared/release/types'
import { enMessages } from '../../helpers/release-fixtures'

const baseModel: ReleaseIndexModel = {
  locale: 'en',
  page: 1,
  pageCount: 1,
  empty: true,
  tiles: [],
}

describe('ReleaseIndex layout', () => {
  it('shows emptyReleases when there are no tiles', () => {
    const wrapper = mount(ReleaseIndex, {
      props: {
        model: baseModel,
        messages: enMessages,
        collectionTitle: 'Releases',
        prevHref: null,
        nextHref: null,
      },
    })
    expect(wrapper.get('[data-testid="release-index-empty"]').text()).toBe(
      'No releases',
    )
  })

  it('renders grid and pagination links when pageCount > 1', () => {
    const model: ReleaseIndexModel = {
      ...baseModel,
      empty: false,
      page: 2,
      pageCount: 3,
      tiles: [
        {
          identity: 'release:b',
          slug: 'b',
          title: 'B',
          date: '2026-08-11',
          href: '/en/releases/b/',
          artworkKind: 'empty-frame',
          isDraft: false,
          showDraftBadge: false,
          isFallback: false,
          showDate: false,
          showDescription: false,
          accessibleName: 'B',
        },
      ],
    }
    const wrapper = mount(ReleaseIndex, {
      props: {
        model,
        messages: enMessages,
        collectionTitle: 'Releases',
        prevHref: '/en/releases/',
        nextHref: '/en/releases/page/3/',
      },
    })
    expect(wrapper.find('[data-testid="release-index-grid"]').exists()).toBe(true)
    expect(
      wrapper.get('[data-testid="release-pagination-prev"]').attributes('href'),
    ).toBe('/en/releases/')
    expect(
      wrapper.get('[data-testid="release-pagination-next"]').attributes('href'),
    ).toBe('/en/releases/page/3/')
    expect(wrapper.get('[data-testid="release-index-heading"]').text()).toContain(
      'Page 2',
    )
  })

  it('renders nothing when model is null (index disabled)', () => {
    const wrapper = mount(ReleaseIndex, {
      props: {
        model: null,
        messages: enMessages,
        collectionTitle: 'Releases',
        prevHref: null,
        nextHref: null,
      },
    })
    expect(wrapper.find('[data-testid="release-index-root"]').exists()).toBe(false)
  })
})
