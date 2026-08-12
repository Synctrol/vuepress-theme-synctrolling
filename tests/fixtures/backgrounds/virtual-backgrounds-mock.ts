import type { BackgroundLoader } from '../../../src/shared/background.js'
import type { ContentType } from '../../../src/shared/types.js'

/** Vitest alias stand-in for `virtual:synctrol-backgrounds` (empty by default). */
const loaders: Partial<Record<ContentType, BackgroundLoader>> = {}

export default loaders
