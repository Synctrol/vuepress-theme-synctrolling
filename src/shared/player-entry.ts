const BOOLEAN_ATTRIBUTES = new Set(['autoplay'])
const INTEGER_ATTRIBUTES = new Set(['page', 'start'])

function normalizeAttributeName(name: string): string {
  return name.replace(/-([a-z])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  )
}

function normalizeAttributeValue(name: string, value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (BOOLEAN_ATTRIBUTES.has(name) && (value === 'true' || value === 'false')) {
    return value === 'true'
  }
  if (INTEGER_ATTRIBUTES.has(name) && /^\d+$/.test(value)) {
    return Number(value)
  }
  return value
}

export function coercePlayerAttributes(
  attrs: Record<string, unknown>,
): Record<string, unknown> {
  const entry: Record<string, unknown> = {}
  for (const [rawName, rawValue] of Object.entries(attrs)) {
    const name = normalizeAttributeName(rawName)
    entry[name] = normalizeAttributeValue(name, rawValue)
  }
  return entry
}
