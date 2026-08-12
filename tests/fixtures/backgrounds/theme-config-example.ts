import type { BackgroundModule } from '../../../src/shared/background'

const emptyModule: BackgroundModule = {
  default() {
    return {
      update() {},
      dispose() {},
    }
  },
}

/** Canonical theme config shape — selection by content type only. */
export const exampleBackgrounds = {
  home: async () => emptyModule,
  release: async () => emptyModule,
  news: async () => emptyModule,
  page: async () => emptyModule,
}
