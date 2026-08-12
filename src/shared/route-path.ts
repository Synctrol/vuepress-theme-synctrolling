export function normalizePathSuffix(suffix: string): string {
  if (suffix === '' || suffix === '/') return '/'
  const withLeading = suffix.startsWith('/') ? suffix : `/${suffix}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

export function normalizeBase(base: string): string {
  if (!base || base === '/') return '/'
  const withLeading = base.startsWith('/') ? base : `/${base}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

export function joinPublicPath(base: string, routePath: string): string {
  const normalizedBase = normalizeBase(base)
  const normalizedRoute = routePath.startsWith('/')
    ? routePath
    : `/${routePath}`
  if (normalizedBase === '/') return normalizedRoute
  return `${normalizedBase.slice(0, -1)}${normalizedRoute}`
}
