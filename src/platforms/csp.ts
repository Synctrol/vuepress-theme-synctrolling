export interface SynctrolCspJson {
  'frame-src': string[]
  'media-src': string[]
  'connect-src': string[]
}

export type SynctrolCspChunk = Partial<SynctrolCspJson>

export function emptyCspJson(): SynctrolCspJson {
  return {
    'frame-src': [],
    'media-src': [],
    'connect-src': [],
  }
}

export function normalizeOrigin(urlOrOrigin: string): string | undefined {
  if (urlOrOrigin === "'self'") return "'self'"
  try {
    const url = new URL(urlOrOrigin)
    if (url.protocol !== 'https:') return undefined
    return url.origin
  } catch {
    return undefined
  }
}

function dedupeAppend(target: string[], values: string[] | undefined): void {
  if (!values) return
  for (const value of values) {
    const origin = value === "'self'" ? "'self'" : normalizeOrigin(value)
    if (!origin) continue
    if (!target.includes(origin)) target.push(origin)
  }
}

export function mergeCspDirectives(chunks: SynctrolCspChunk[]): SynctrolCspJson {
  const result = emptyCspJson()
  for (const chunk of chunks) {
    dedupeAppend(result['frame-src'], chunk['frame-src'])
    dedupeAppend(result['media-src'], chunk['media-src'])
    dedupeAppend(result['connect-src'], chunk['connect-src'])
  }
  return result
}
