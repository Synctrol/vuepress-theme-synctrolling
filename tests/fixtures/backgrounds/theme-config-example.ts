import type { BackgroundLoader } from '../../../src/shared/background'

const emptyModule = {
  default() {
    return {
      request() {},
      dispose() {},
    }
  },
}

/** Canonical theme config shape — a single global background provider loader. */
export const exampleBackground: BackgroundLoader = async () => emptyModule
