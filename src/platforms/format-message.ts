export function formatMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return String(vars[key])
    }
    return match
  })
}
