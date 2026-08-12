import { createHash } from 'node:crypto'

export function hashFileContents(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 8)
}

export function insertContentHash(filename: string, hash: string): string {
  const slash = filename.lastIndexOf('/')
  const dir = slash === -1 ? '' : filename.slice(0, slash + 1)
  const base = slash === -1 ? filename : filename.slice(slash + 1)
  const dot = base.lastIndexOf('.')
  if (dot <= 0) {
    return `${dir}${base}.${hash}`
  }
  return `${dir}${base.slice(0, dot)}.${hash}${base.slice(dot)}`
}
