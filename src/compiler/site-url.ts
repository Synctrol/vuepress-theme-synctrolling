import { fail } from './diagnostics.js'

function invalidSiteUrl(message: string): never {
  fail({ severity: 'error', code: 'INVALID_SITE_URL', message })
}

/**
 * `resolveThemeOptions` already strips trailing slashes, so this normalizes
 * rather than rejecting them and validates the remaining origin invariants.
 */
export function assertSiteUrl(siteUrl: string): string {
  if (typeof siteUrl !== 'string' || siteUrl.trim().length === 0) {
    invalidSiteUrl('siteUrl is required')
  }

  const normalized = siteUrl.trim().replace(/\/+$/, '')

  let url: URL
  try {
    url = new URL(normalized)
  } catch {
    invalidSiteUrl(`siteUrl must be an absolute http(s) origin: ${siteUrl}`)
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    invalidSiteUrl(`siteUrl must use http or https: ${siteUrl}`)
  }
  if (url.username !== '' || url.password !== '') {
    invalidSiteUrl('siteUrl must not contain credentials')
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    invalidSiteUrl(
      `siteUrl must be an origin without path, query, or hash: ${siteUrl}`,
    )
  }

  return normalized
}
