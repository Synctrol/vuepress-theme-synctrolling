import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { AudioPlayerPlatform } from '../../../src/client/components/platforms/renderers/AudioPlayerPlatform'

describe('audio renderer', () => {
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
