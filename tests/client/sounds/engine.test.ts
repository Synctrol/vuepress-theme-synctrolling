import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SoundsEngine } from '../../../src/client/sounds/engine'
import type {
  AudioContextLike,
  SoundSourceLike,
} from '../../../src/client/sounds/engine'
import { SOUND_ENABLED_STORAGE_KEY } from '../../../src/client/sounds/storage'
import type { SoundStorageLike } from '../../../src/client/sounds/storage'
import { joinSoundUrl } from '../../../src/client/sounds/runtime'
import type { SoundKey } from '../../../src/shared/options'

function memoryStorage(initial: Record<string, string> = {}): SoundStorageLike {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

interface FakeContextHarness {
  ctx: AudioContextLike & {
    sources: SoundSourceLike[]
    state: string
    suspend: ReturnType<typeof vi.fn>
    resume: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
  }
  fetchBuffer: ReturnType<typeof vi.fn<(url: string) => Promise<ArrayBuffer>>>
  storage: SoundStorageLike
  warn: ReturnType<typeof vi.fn<(message?: unknown, ...args: unknown[]) => void>>
  now(): number
  tick(ms: number): void
}

function createHarness(
  initialStorage: Record<string, string> = {},
): FakeContextHarness {
  const sources: SoundSourceLike[] = []
  const ctx = {
    state: 'running',
    destination: 'dest',
    sources,
    createBufferSource() {
      const source = {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
      }
      sources.push(source)
      return source
    },
    decodeAudioData: vi.fn(async () => ({ decoded: true })),
    suspend: vi.fn(async () => {}),
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  }
  let clock = 0
  return {
    ctx,
    fetchBuffer: vi.fn(async () => new ArrayBuffer(8)),
    storage: memoryStorage(initialStorage),
    warn: vi.fn(),
    now: () => clock,
    tick: (ms) => {
      clock += ms
    },
  }
}

function buildEngine(
  harness: FakeContextHarness,
  keys: Partial<Record<SoundKey, string>>,
  enabledFallback = true,
): SoundsEngine {
  return new SoundsEngine({
    storage: harness.storage,
    enabledFallback,
    urls: keys,
    absoluteUrls: Object.fromEntries(
      Object.entries(keys).map(([key, url]) => [key, `/base${url}`]),
    ),
    createContext: () => harness.ctx,
    fetchBuffer: harness.fetchBuffer,
    log: { warn: harness.warn },
    now: harness.now,
  })
}

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve()
  }
}

describe('SoundsEngine', () => {
  let harness: FakeContextHarness
  let engine: SoundsEngine

  beforeEach(() => {
    harness = createHarness()
    engine = buildEngine(harness, { navigate: '/sounds/navigate.webm' })
  })

  afterEach(() => {
    engine.dispose()
  })

  it('plays nothing when storage says off and never creates a context', () => {
    harness = createHarness({ [SOUND_ENABLED_STORAGE_KEY]: 'off' })
    engine = buildEngine(harness, { navigate: '/sounds/navigate.webm' })
    engine.play('navigate')
    expect(harness.fetchBuffer).not.toHaveBeenCalled()
    expect(harness.ctx.sources).toHaveLength(0)
  })

  it('fetches, decodes, and starts a source once for a configured key', async () => {
    engine.play('navigate')
    await flush()
    expect(harness.fetchBuffer).toHaveBeenCalledTimes(1)
    expect(harness.fetchBuffer).toHaveBeenCalledWith('/base/sounds/navigate.webm')
    expect(harness.ctx.sources).toHaveLength(1)
    expect(harness.ctx.sources[0]!.connect).toHaveBeenCalledWith('dest')
    expect(harness.ctx.sources[0]!.start).toHaveBeenCalledTimes(1)
  })

  it('replays from cache without refetching after the debounce window', async () => {
    engine.play('navigate')
    await flush()
    harness.tick(200)
    engine.play('navigate')
    expect(harness.fetchBuffer).toHaveBeenCalledTimes(1)
    expect(harness.ctx.sources).toHaveLength(2)
  })

  it('debounces rapid retriggers of the same key within 80ms', async () => {
    engine.play('navigate')
    engine.play('navigate')
    await flush()
    expect(harness.fetchBuffer).toHaveBeenCalledTimes(1)
    expect(harness.ctx.sources).toHaveLength(1)
  })

  it('allows different keys to overlap', async () => {
    engine = buildEngine(harness, {
      navigate: '/sounds/navigate.webm',
      paginate: '/sounds/paginate.webm',
    })
    engine.play('navigate')
    engine.play('paginate')
    await flush()
    expect(harness.fetchBuffer).toHaveBeenCalledTimes(2)
    expect(harness.ctx.sources).toHaveLength(2)
  })

  it('does nothing for an unconfigured key', () => {
    engine.play('embedActivate')
    expect(harness.fetchBuffer).not.toHaveBeenCalled()
  })

  it('suspends the context when disabled and stays silent', async () => {
    engine.play('navigate')
    await flush()
    expect(harness.ctx.sources).toHaveLength(1)
    engine.setEnabled(false)
    expect(harness.storage.getItem(SOUND_ENABLED_STORAGE_KEY)).toBe('off')
    expect(harness.ctx.suspend).toHaveBeenCalled()
    harness.tick(200)
    engine.play('navigate')
    await flush()
    expect(harness.ctx.sources).toHaveLength(1)
  })

  it('notifies enabled-change listeners', () => {
    const listener = vi.fn()
    engine.onChange(listener)
    engine.setEnabled(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('suppresses and consumes a single navigation', () => {
    engine.suppressNextNavigation()
    expect(engine.consumeSuppressedNavigation()).toBe(true)
    expect(engine.consumeSuppressedNavigation()).toBe(false)
  })

  it('lets a stale suppression expire instead of silencing a later route change', () => {
    engine.suppressNextNavigation()
    harness.tick(1100)
    expect(engine.consumeSuppressedNavigation()).toBe(false)
  })

  it('drops cues that are not inside a user gesture instead of queueing them', async () => {
    const originalActivation = Object.getOwnPropertyDescriptor(
      navigator,
      'userActivation',
    )
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { isActive: false },
    })
    try {
      engine.play('navigate')
      await flush()
      expect(harness.fetchBuffer).not.toHaveBeenCalled()
      expect(harness.ctx.sources).toHaveLength(0)
    } finally {
      if (originalActivation) {
        Object.defineProperty(navigator, 'userActivation', originalActivation)
      } else {
        Reflect.deleteProperty(navigator, 'userActivation')
      }
    }
  })

  it('marks failed loads and warns once per URL', async () => {
    harness.fetchBuffer.mockRejectedValueOnce(new Error('404'))
    engine.play('navigate')
    await flush()
    harness.tick(200)
    engine.play('navigate')
    await flush()
    expect(harness.warn).toHaveBeenCalledTimes(1)
    expect(harness.ctx.sources).toHaveLength(0)
  })
})

describe('joinSoundUrl', () => {
  it('joins a root base verbatim', () => {
    expect(joinSoundUrl('/', '/sounds/navigate.webm')).toBe(
      '/sounds/navigate.webm',
    )
    expect(joinSoundUrl('', '/sounds/navigate.webm')).toBe(
      '/sounds/navigate.webm',
    )
  })

  it('prepends a sub-path base without double slashes', () => {
    expect(joinSoundUrl('/repo/', '/sounds/navigate.webm')).toBe(
      '/repo/sounds/navigate.webm',
    )
    expect(joinSoundUrl('/repo', '/sounds/navigate.webm')).toBe(
      '/repo/sounds/navigate.webm',
    )
  })
})
