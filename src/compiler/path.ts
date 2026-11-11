import { posix, resolve, win32 } from 'node:path'

export function toForwardSlashPath(p: string): string {
  return p.replace(/\\/g, '/')
}

/** True for POSIX absolute or Windows drive/UNC absolute paths on any host. */
export function isCrossPlatformAbsolute(p: string): boolean {
  return posix.isAbsolute(p) || win32.isAbsolute(p)
}

/**
 * Resolve a path against a VuePress config directory.
 *
 * Windows drive/UNC strings stay absolute even when the compiler runs on
 * POSIX (Linux CI); POSIX absolute config dirs resolve with posix semantics
 * so Windows hosts do not rewrite `/site/...` onto the current drive.
 */
export function resolveConfigRelativePath(
  configDir: string,
  relativeOrAbsolute: string,
): string {
  if (isCrossPlatformAbsolute(relativeOrAbsolute)) return relativeOrAbsolute
  if (win32.isAbsolute(configDir) && !posix.isAbsolute(configDir)) {
    return win32.resolve(configDir, relativeOrAbsolute)
  }
  if (posix.isAbsolute(configDir)) {
    return posix.resolve(configDir, relativeOrAbsolute)
  }
  return resolve(configDir, relativeOrAbsolute)
}
