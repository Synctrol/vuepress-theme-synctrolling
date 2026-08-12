import type {
  BackgroundContext,
  BackgroundController,
  BackgroundLoader,
  BackgroundModule,
} from '../../shared/background.js'
import type { ContentType } from '../../shared/types.js'
import {
  resolveBackgroundContentType,
  type PageContentType,
} from './resolve-type.js'

export interface BackgroundRuntimeOptions {
  backgrounds: Partial<Record<ContentType, BackgroundLoader>>
}

export interface BackgroundSyncInput {
  contentType: PageContentType
  route: string
  locale: string
  colorMode: 'light' | 'dark'
  reducedMotion: boolean
}

export class BackgroundRuntime {
  private readonly backgrounds: Partial<Record<ContentType, BackgroundLoader>>
  private host: HTMLElement | null = null
  private activeKey: ContentType | null = null
  private controller: BackgroundController | null = null
  private loadGeneration = 0

  constructor(options: BackgroundRuntimeOptions) {
    this.backgrounds = options.backgrounds
  }

  setHost(element: HTMLElement): void {
    // Invalidate in-flight loads so a late resolve cannot mount into the old host.
    this.loadGeneration += 1
    this.disposeActive()
    this.host = element
    this.applySolidSurface(element)
  }

  async sync(input: BackgroundSyncInput): Promise<void> {
    if (!this.host) return

    const key = resolveBackgroundContentType(input.contentType)
    const loader = this.backgrounds[key]
    const context = this.buildContext(input)

    if (!loader) {
      await this.replaceWithSolid()
      return
    }

    if (this.activeKey === key && this.controller) {
      this.controller.update(context)
      this.host.dataset.synBackground = 'module'
      return
    }

    await this.replaceWithModule(key, loader, context)
  }

  dispose(): void {
    this.loadGeneration += 1
    this.disposeActive()
    if (this.host) {
      this.applySolidSurface(this.host)
      this.host.dataset.synBackground = 'solid'
    }
  }

  private buildContext(input: BackgroundSyncInput): BackgroundContext {
    if (!this.host) {
      throw new Error('BackgroundRuntime host is not set')
    }
    return {
      element: this.host,
      route: input.route,
      locale: input.locale,
      colorMode: input.colorMode,
      reducedMotion: input.reducedMotion,
    }
  }

  private async replaceWithSolid(): Promise<void> {
    // Invalidate any in-flight module load (pending → solid).
    this.loadGeneration += 1
    this.disposeActive()
    if (!this.host) return
    this.applySolidSurface(this.host)
    this.host.dataset.synBackground = 'solid'
  }

  private async replaceWithModule(
    key: ContentType,
    loader: BackgroundLoader,
    context: BackgroundContext,
  ): Promise<void> {
    const generation = ++this.loadGeneration
    this.disposeActive()

    const mod: BackgroundModule = await loader()
    if (generation !== this.loadGeneration || !this.host) {
      return
    }

    this.controller = mod.default(context)
    this.activeKey = key
    this.host.dataset.synBackground = 'module'
  }

  private disposeActive(): void {
    if (this.controller) {
      this.controller.dispose()
    }
    this.controller = null
    this.activeKey = null
    if (this.host) {
      this.host.replaceChildren()
    }
  }

  private applySolidSurface(element: HTMLElement): void {
    element.style.backgroundColor = 'var(--syn-bg)'
  }
}
