const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatCalendarDate(
  date: string,
  localeLang: string,
  dateFormat: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  const match = DATE_PATTERN.exec(date)
  if (match === null) return date
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const value = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat(localeLang, {
    ...dateFormat,
    timeZone: 'UTC',
  }).format(value)
}
