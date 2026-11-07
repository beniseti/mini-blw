const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Comprueba que sea una fecha real con formato YYYY-MM-DD. */
export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const m = ISO_DATE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
}

/** Fecha local de hoy (o de `now`) como YYYY-MM-DD. */
export function toISODate(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Días transcurridos de `from` a `to` (negativo si `to` es anterior). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / 86_400_000)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(toUTC(iso) + days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

function asUTCDate(iso: string): Date {
  return new Date(toUTC(iso))
}

const longFmt = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const longYearFmt = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const shortFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const shortYearFmt = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "5 nov" (o "5 nov 2025" si no es del año en curso). */
export function formatShort(iso: string, today: string = toISODate()): string {
  const sameYear = iso.slice(0, 4) === today.slice(0, 4)
  return (sameYear ? shortFmt : shortYearFmt).format(asUTCDate(iso)).replace('.', '')
}

/** "Hoy", "Ayer" o "martes, 5 de noviembre". */
export function formatDayLabel(iso: string, today: string = toISODate()): string {
  const diff = daysBetween(iso, today)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  const sameYear = iso.slice(0, 4) === today.slice(0, 4)
  const text = (sameYear ? longFmt : longYearFmt).format(asUTCDate(iso))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "hoy", "ayer", "hace 3 días". */
export function formatRelative(iso: string, today: string = toISODate()): string {
  const diff = daysBetween(iso, today)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'ayer'
  if (diff === -1) return 'mañana'
  if (diff > 1) return `hace ${diff} días`
  return `dentro de ${-diff} días`
}
