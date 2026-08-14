import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReleaseIndexGrid from '../../../src/client/components/release/ReleaseIndexGrid.vue'
import type { ReleaseIndexModel } from '../../../src/shared/release/types'
import { asset } from '../../helpers/release-fixtures'

const model: ReleaseIndexModel = {
  locale: 'en',
  page: 1,
  pageCount: 1,
  empty: false,
  tiles: [
    {
      identity: 'release:first-release',
      slug: 'first-release',
      title: 'First Album',
      date: '2026-08-11',
      href: '/en/releases/first-release/',
      artwork: asset('/assets/content/release/first-release/entry.hash.webp'),
      artworkKind: 'artwork',
      isDraft: false,
      showDraftBadge: false,
      isFallback: false,
      showDate: false,
      showDescription: false,
      accessibleName: 'First Album',
    },
    {
      identity: 'release:drafty',
      slug: 'drafty',
      title: 'Draft Release',
      date: '2026-08-10',
      href: '/en/releases/drafty/',
      artworkKind: 'empty-frame',
      isDraft: true,
      showDraftBadge: true,
      isFallback: false,
      showDate: false,
      showDescription: false,
      accessibleName: 'Draft Release',
    },
  ],
}

describe('ReleaseIndexGrid', () => {
  it('renders a square artwork grid with hover title overlays and no under-tile date/description', () => {
    const wrapper = mount(ReleaseIndexGrid, {
      props: {
        model,
        draftLabel: 'Draft',
      },
    })
    const root = wrapper.get('[data-testid="release-index-grid"]')
    expect(root.attributes('style')).toBeUndefined()

    const links = wrapper.findAll('a.syn-release-tile')
    expect(links).toHaveLength(2)
    expect(links[0].attributes('href')).toBe('/en/releases/first-release/')
    expect(links[0].attributes('aria-label')).toBe('First Album')

    const img = links[0].get('img')
    expect(img.attributes('alt')).toBe('First Album')
    expect(img.attributes('src')).toContain('entry.hash.webp')

    const overlays = wrapper.findAll('.syn-release-tile__title')
    expect(overlays).toHaveLength(2)
    expect(overlays[0].text()).toBe('First Album')

    const text = wrapper.text()
    expect(text).not.toContain('2026-08-11')
    expect(text).not.toContain('2026-08-10')
    expect(wrapper.find('.syn-release-tile__date').exists()).toBe(false)
    expect(wrapper.find('.syn-release-tile__description').exists()).toBe(false)
  })

  it('shows draft badge only when showDraftBadge is true', () => {
    const wrapper = mount(ReleaseIndexGrid, {
      props: { model, draftLabel: 'Draft' },
    })
    const badges = wrapper.findAll('[data-testid="draft-badge"]')
    expect(badges).toHaveLength(1)
    expect(badges[0].text()).toBe('Draft')
  })

  it('renders branded empty frame when artworkKind is empty-frame', () => {
    const wrapper = mount(ReleaseIndexGrid, {
      props: { model, draftLabel: 'Draft' },
    })
    expect(wrapper.findAll('[data-testid="release-empty-frame"]')).toHaveLength(1)
  })
})
