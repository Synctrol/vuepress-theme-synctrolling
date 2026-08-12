import { describe, expect, it } from 'vitest'
import SocialLinks from '../../../src/client/components/SocialLinks.vue'
import { mountShell } from '../harness/mount'

describe('SocialLinks', () => {
  it('renders icon-only links with accessible labels', () => {
    const wrapper = mountShell(SocialLinks, { locale: 'en' })
    const link = wrapper.get('a')
    expect(link.attributes('aria-label')).toBe('GitHub')
    expect(link.attributes('href')).toBe('https://github.com/synctrol')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(wrapper.get('img').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('img').attributes('alt')).toBe('')
  })

  it('does not expose an iconSize configuration surface', async () => {
    const mod = await import('../../../src/shared/options')
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync('src/shared/options.ts', 'utf8'),
    )
    expect(source).not.toMatch(/iconSize/)
    expect(mod).toBeTruthy()
  })
})
