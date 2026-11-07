import type { MinAge } from '../types'
import { daysBetween, isValidISODate, toISODate } from './dates'

export interface BabyAge {
  /** Meses cumplidos. */
  months: number
  /** Días adicionales tras los meses cumplidos. */
  days: number
}

/** Suma meses a una fecha, ajustando al último día si el mes es más corto (31 ene + 1 → 28/29 feb). */
export function addMonthsClamped(iso: string, add: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const total = y * 12 + (m - 1) + add
  const ny = Math.floor(total / 12)
  const nm = total % 12
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  const nd = Math.min(d, lastDay)
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(nd).padStart(2, '0')}`
}

/** Edad en meses cumplidos (y días sobrantes) entre la fecha de nacimiento y `today`. */
export function getAge(birthDate: string, today: string = toISODate()): BabyAge | null {
  if (!isValidISODate(birthDate) || !isValidISODate(today) || birthDate > today) return null
  const [by, bm] = birthDate.split('-').map(Number)
  const [ty, tm] = today.split('-').map(Number)
  let months = (ty - by) * 12 + (tm - bm)
  let monthDay = addMonthsClamped(birthDate, months)
  if (monthDay > today) {
    months -= 1
    monthDay = addMonthsClamped(birthDate, months)
  }
  return { months, days: daysBetween(monthDay, today) }
}

/** "7 meses y 12 días", "1 año y 2 meses"... */
export function formatAge(age: BabyAge): string {
  const { months, days } = age
  if (months >= 12) {
    const years = Math.floor(months / 12)
    const rest = months % 12
    const y = `${years} ${years === 1 ? 'año' : 'años'}`
    return rest ? `${y} y ${rest} ${rest === 1 ? 'mes' : 'meses'}` : y
  }
  const m = `${months} ${months === 1 ? 'mes' : 'meses'}`
  if (!days) return m
  return `${m} y ${days} ${days === 1 ? 'día' : 'días'}`
}

/** Etapa de la alimentación complementaria según los meses cumplidos. */
export function stageFor(months: number): MinAge | null {
  if (months < 6) return null
  if (months < 7) return 6
  if (months < 9) return 7
  return 9
}

export const MIN_AGE_LABEL: Record<MinAge, string> = {
  6: '6 m',
  7: '7–8 m',
  9: '9+ m',
}

export const STAGE_LABEL: Record<MinAge, string> = {
  6: 'Etapa 6 meses',
  7: 'Etapa 7–8 meses',
  9: 'Etapa 9+ meses',
}

/** ¿Es adecuado el alimento para la edad? `null` si no hay perfil. */
export function isSuitable(minAge: MinAge, months: number | null): boolean | null {
  if (months === null) return null
  return months >= 6 && minAge <= months
}
