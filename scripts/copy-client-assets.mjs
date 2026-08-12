import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcClient = join(root, 'src', 'client')
const distClient = join(root, 'dist', 'client')

const COPY_EXTENSIONS = new Set([
  '.vue',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

if (!existsSync(srcClient)) {
  throw new Error(`Missing src/client at ${srcClient}`)
}
mkdirSync(distClient, { recursive: true })

let copied = 0
for (const file of walk(srcClient)) {
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
  if (!COPY_EXTENSIONS.has(ext)) continue
  const rel = relative(srcClient, file)
  const dest = join(distClient, rel)
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(file, dest)
  copied += 1
}

console.log(`copy-client-assets: copied ${copied} files into dist/client/`)
