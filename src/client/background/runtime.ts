import type { Ref } from 'vue'
import type {
  BackgroundLoader,
  BackgroundModule,
  BackgroundReactiveContext,
  BackgroundRequest,
  IBackgroundHost,
  PageContentType,
} from '../../shared/background.js'
import type { ContentType } from '../../shared/types.js'

export interface BackgroundRuntimeContextRefs {
  route: Ref<{ path: string; identity?: string }>
  contentType: Ref<{ raw: PageContentType; resolved: ContentType }>
  locale: Ref<string>
  colorMode: Ref<'light' | 'dark'>
  reducedMotion: Ref<boolean>
}

export interface BackgroundRuntimeOptions {
  loader?: BackgroundLoader
  context: BackgroundRuntimeContextRefs
}

export class BackgroundRuntime {
  private readonly loader?: BackgroundLoader
  private readonly context: BackgroundRuntimeContextRefs
  private host: HTMLElement | null = null
  private provider: IBackgroundHost | null = null
  private loadGeneration = 0
  private pendingRequest: BackgroundRequest | null = null

  constructor(options: BackgroundRuntimeOptions) {
    this.loader = options.loader
    this.context = options.context
  }

  mount(element: HTMLElement): void {
    this.loadGeneration += 1
    this.disposeProvider()
    this.host = element
    this.applySolidSurface(element)
  }

  request(input: BackgroundRequest): void {
    if (!this.host) return
    this.pendingRequest = input
    if (!this.provider) {
      void this.loadProvider()
      return
    }
    this.provider.request(input)
  }

  dispose(): void {
    this.loadGeneration += 1
    this.disposeProvider()
    if (this.host) {
      this.applySolidSurface(this.host)
      this.host.dataset.synBackground = 'solid'
      this.host = null
    }
    this.pendingRequest = null
  }

  private async loadProvider(): Promise<void> {
    if (!this.host) return
    if (!this.loader) {
      this.applySolidSurface(this.host)
      this.host.dataset.synBackground = 'solid'
      return
    }
    const generation = ++this.loadGeneration
    let mod: BackgroundModule
    try {
      mod = await this.loader()
    } catch {
      if (generation !== this.loadGeneration || !this.host) return
      this.applySolidSurface(this.host)
      this.host.dataset.synBackground = 'solid'
      return
    }
    if (generation !== this.loadGeneration || !this.host) return
    this.provider = mod.default(this.buildContext())
    this.host.dataset.synBackground = 'module'
    if (this.pendingRequest) {
      this.provider.request(this.pendingRequest)
    }
  }

  private buildContext(): BackgroundReactiveContext {
    if (!this.host) throw new Error('BackgroundRuntime host is not set')
    return {
      element: this.host,
      route: this.context.route,
      contentType: this.context.contentType,
      locale: this.context.locale,
      colorMode: this.context.colorMode,
      reducedMotion: this.context.reducedMotion,
    }
  }

  private disposeProvider(): void {
    if (this.provider) {
      this.provider.dispose()
    }
    this.provider = null
    if (this.host) {
      this.host.replaceChildren()
    }
  }

  private applySolidSurface(element: HTMLElement): void {
    element.style.backgroundColor = 'var(--syn-bg)'
  }
}
