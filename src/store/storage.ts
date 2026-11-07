import { isValidISODate } from '../lib/dates'
import { newId } from '../lib/text'
import type { AppData, Liked, Profile, Reaction, Trial } from '../types'

export const STORAGE_KEY = 'bocaditos-blw:v1'
export const BACKUP_APP_ID = 'bocaditos-blw'

export function emptyData(): AppData {
  return { version: 1, profile: null, trials: [], lastExportAt: null }
}

const LIKED: Liked[] = ['like', 'neutral', 'dislike']
const REACTIONS: Reaction[] = ['none', 'mild', 'severe']

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseProfile(raw: unknown): Profile | null {
  if (!isObject(raw)) return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 60) : ''
  const birthDate = isValidISODate(raw.birthDate) ? raw.birthDate : ''
  if (!name && !birthDate) return null
  return { name, birthDate }
}

function parseTrial(raw: unknown): Trial | null {
  if (!isObject(raw)) return null
  if (typeof raw.foodId !== 'string' || !raw.foodId) return null
  if (!isValidISODate(raw.date)) return null
  if (!LIKED.includes(raw.liked as Liked)) return null
  if (!REACTIONS.includes(raw.reaction as Reaction)) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    foodId: raw.foodId,
    date: raw.date,
    liked: raw.liked as Liked,
    reaction: raw.reaction as Reaction,
    notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 2000) : '',
    createdAt:
      typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
        ? raw.createdAt
        : `${raw.date}T12:00:00.000Z`,
  }
}

export type ParseResult =
  | { ok: true; data: AppData; skipped: number }
  | { ok: false; error: string }

/**
 * Valida datos guardados o importados. Acepta tanto el formato interno como el de
 * copia de seguridad ({ app, exportedAt, ...datos }). Las pruebas inválidas se descartan
 * y se informa de cuántas.
 */
export function parseAppData(raw: unknown): ParseResult {
  if (!isObject(raw)) return { ok: false, error: 'El archivo no contiene datos válidos.' }
  if ('app' in raw && raw.app !== BACKUP_APP_ID) {
    return { ok: false, error: 'El archivo no es una copia de seguridad de esta app.' }
  }
  if (raw.version !== 1) {
    return { ok: false, error: 'Versión de datos no compatible.' }
  }
  if (!Array.isArray(raw.trials)) return { ok: false, error: 'Faltan las pruebas en el archivo.' }

  const seen = new Set<string>()
  const trials: Trial[] = []
  let skipped = 0
  for (const item of raw.trials) {
    const t = parseTrial(item)
    if (!t) {
      skipped++
      continue
    }
    if (seen.has(t.id)) t.id = newId()
    seen.add(t.id)
    trials.push(t)
  }

  return {
    ok: true,
    skipped,
    data: {
      version: 1,
      profile: parseProfile(raw.profile),
      trials,
      lastExportAt: typeof raw.lastExportAt === 'string' ? raw.lastExportAt : null,
    },
  }
}

export function loadData(): AppData {
  let text: string | null = null
  try {
    text = localStorage.getItem(STORAGE_KEY)
  } catch {
    return emptyData()
  }
  if (!text) return emptyData()
  try {
    const result = parseAppData(JSON.parse(text))
    if (result.ok) return result.data
  } catch {
    // JSON corrupto: se trata igual que datos inválidos
  }
  // No perdemos nada: guardamos una copia del contenido ilegible antes de empezar de cero.
  try {
    localStorage.setItem(`${STORAGE_KEY}:corrupt:${Date.now()}`, text)
  } catch {
    // sin espacio: no hay más que hacer
  }
  return emptyData()
}

/** Guarda los datos. Devuelve `false` si el navegador no lo permite (modo privado, sin espacio…). */
export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

/** Contenido del archivo de copia de seguridad. */
export function buildBackup(data: AppData, now: Date = new Date()): string {
  return JSON.stringify(
    {
      app: BACKUP_APP_ID,
      exportedAt: now.toISOString(),
      version: data.version,
      profile: data.profile,
      trials: data.trials,
    },
    null,
    2,
  )
}
