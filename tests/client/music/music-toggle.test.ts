import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import MusicToggle from '../../../src/client/components/MusicToggle.vue'
import { BackgroundMusic } from '../../../src/client/music/music'
import { setMusicRuntimeForTesting } from '../../../src/client/music/runtime'
import { mountShell } from '../harness/mount'

class FakeBackgroundMusic extends BackgroundMusic {
  active = false

  constructor() {
    super({
      url: '/music/Beater.mp3',
      createAudio: () => {
        throw new Error('unused')
      },
    })
  }

  override isPlaying(): boolean {
    return this.active
  }

  override start(): void {
    this.active = true
  }

  override stop(): void {
    this.active = false
  }
}

describe('MusicToggle', () => {
  it('renders nothing when no music option is configured', () => {
    const wrapper = mountShell(MusicToggle)
    expect(wrapper.find('.syn-music-toggle').exists()).toBe(false)
  })

  it('renders the chip and flips the playing state', async () => {
    const fake = new FakeBackgroundMusic()
    setMusicRuntimeForTesting(fake)
    try {
      const wrapper = mountShell(MusicToggle, {
        themeOverrides: { music: '/music/Beater.mp3' },
      })
      await nextTick()
      const button = wrapper.get('.syn-music-toggle__button')
      expect(button.attributes('data-playing')).toBe('false')
      expect(button.attributes('aria-pressed')).toBe('false')
      expect(button.attributes('aria-label')).toBe('背景乐关')
      expect(button.get('svg.syn-bar-chip__icon').attributes('stroke-width')).toBe(
        '2',
      )
      await button.trigger('click')
      expect(button.attributes('data-playing')).toBe('true')
      expect(button.attributes('aria-pressed')).toBe('true')
      expect(button.attributes('aria-label')).toBe('背景乐开')
      expect(fake.isPlaying()).toBe(true)
      await button.trigger('click')
      expect(button.attributes('data-playing')).toBe('false')
      expect(fake.isPlaying()).toBe(false)
    } finally {
      setMusicRuntimeForTesting(null)
    }
  })
})
