import { describe, expect, it, vi } from 'vitest'
import type { ClientConfig } from 'vuepress/client'

vi.mock('vuepress/client', () => {
  return {
    defineClientConfig: (config: unknown) => config,
  }
})

const { default: clientConfig } = await import('../../src/client/config.js')

describe('client config', () => {
  it('registers both Layout and NotFound so the automatic /404.html page can render', () => {
    const layouts = (clientConfig as ClientConfig).layouts
    expect(layouts).toBeDefined()
    expect(layouts?.Layout).toBeDefined()
    expect(layouts?.NotFound).toBeDefined()
  })
})
