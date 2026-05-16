// Returns "today" as a UTC-midnight Date whose calendar date matches the
// configured app timezone (default Asia/Karachi). This is the value to use
// as the key when reading/writing any `@db.Date` column, so "today" means
// the user's local calendar day instead of UTC's.
const APP_TZ = process.env.APP_TIMEZONE || 'Asia/Karachi'

export function todayInAppTz(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const y = parts.find((p) => p.type === 'year')!.value
  const m = parts.find((p) => p.type === 'month')!.value
  const d = parts.find((p) => p.type === 'day')!.value

  return new Date(`${y}-${m}-${d}T00:00:00.000Z`)
}
