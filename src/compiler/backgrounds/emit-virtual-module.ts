import { isAbsolute, resolve } from 'node:path'

export function emitBackgroundsVirtualModule(
  background: string | undefined,
  configDir: string,
): string {
  if (!background) return 'export default undefined\n'
  const id = isAbsolute(background)
    ? background
    : resolve(configDir, background)
  return `export default () => import(${JSON.stringify(id)})\n`
}
