// Centralized formatters so every page shows money/dates the same way.
// Default locale + currency = Pakistan. Change LOCALE / CURRENCY only here.

const LOCALE = 'en-PK'
const CURRENCY = 'PKR'
const TZ = 'Asia/Karachi'

export function formatMoney(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}

export function formatTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
