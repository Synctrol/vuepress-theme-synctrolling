import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { LinkPlatform } from '../../../src/client/components/platforms/renderers/LinkPlatform'
import { AudioPlayerPlatform } from '../../../src/client/components/platforms/renderers/AudioPlayerPlatform'

describe('link and audio renderers', () => {
  it('renders an external link with safe rel and accessible name', () => {
    const wrapper = mount(LinkPlatform, {
      props: {
        entry: { platform: 'taobao', url: 'https://item.taobao.com/x' },
        title: '淘宝',
      },
    })
    const a = wrapper.get('a')
    expect(a.attributes('href')).toBe('https://item.taobao.com/x')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toBe('noopener noreferrer')
    expect(a.attributes('aria-label')).toBe('淘宝')
    expect(a.text()).toBe('淘宝')
  })

  it('renders audio with title and optional mime type source', () => {
    const wrapper = mount(AudioPlayerPlatform, {
      props: {
        entry: {
          platform: 'host',
          src: 'https://cdn.example.com/a.mp3',
          mime: 'audio/mpeg',
          autoplay: false,
        },
        title: 'Audio',
      },
    })
    const audio = wrapper.get('audio')
    expect(audio.attributes('controls')).toBeDefined()
    expect(audio.attributes('title')).toBe('Audio')
    expect(audio.attributes('aria-label')).toBe('Audio')
    expect(wrapper.get('source').attributes('src')).toBe('https://cdn.example.com/a.mp3')
    expect(wrapper.get('source').attributes('type')).toBe('audio/mpeg')
  })
})
