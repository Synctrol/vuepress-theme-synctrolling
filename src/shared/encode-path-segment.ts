/** `encodeURIComponent` leaves these five unescaped; RFC 3986 does not. */
const RFC3986_EXTRA = /[!'()*]/g

/** Strict RFC 3986 percent-encoding for a single path segment (slug, tag, or locale). */
export function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(
    RFC3986_EXTRA,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}
