import type { Plugin } from 'vite'
import type { BackgroundLoader } from '../../shared/background.js'
import type { ContentType } from '../../shared/types.js'
import { emitBackgroundsVirtualModule } from './emit-virtual-module.js'

const VIRTUAL_ID = 'virtual:synctrol-backgrounds'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

export function createSynctrolBackgroundsVitePlugin(options: {
  backgrounds: Partial<Record<ContentType, BackgroundLoader>>
  configDir: string
}): Plugin {
  return {
    name: 'synctrol-backgrounds',
    resolveId(id) {
      if (id === VIRTUAL_ID || id === '@synctrol/backgrounds') {
        return RESOLVED_ID
      }
    },
    load(id) {
      if (id === RESOLVED_ID) {
        return emitBackgroundsVirtualModule(
          options.backgrounds,
          options.configDir,
        )
      }
    },
  }
}
