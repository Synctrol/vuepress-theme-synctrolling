import type { Plugin } from 'vite'
import { emitBackgroundsVirtualModule } from './emit-virtual-module.js'

const VIRTUAL_ID = 'virtual:synctrol-backgrounds'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

export function createSynctrolBackgroundsVitePlugin(options: {
  background?: string
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
        return emitBackgroundsVirtualModule(options.background, options.configDir)
      }
    },
  }
}
