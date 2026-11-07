/**
 * Validación compartida entre la app (navegador) y el servidor (Node).
 * Usa imports con extensión .ts explícita para que Node pueda ejecutarlo directamente.
 */
import { isValidISODate } from '../lib/dates.ts'
import { newId } from '../lib/text.ts'
import type { Liked, MealPlan, PlanItem, Profile, Reaction, SyncOp, Trial } from '../types.ts'

const LIKED: Liked[] = ['like', 'neutral', 'dislike']
const REACTIONS: Reaction[] = ['none', 'mild', 'severe']

export const MAX_NOTES = 2000
export const MAX_NAME = 60
export const MAX_PLAN_ITEMS = 1000

export function emptyPlan(): MealPlan {
  return { perDay: 2, items: [] }
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isNonEmptyString(v: unknown, max = 200): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max
}

export function parseProfile(raw: unknown): Profile | null {
  if (!isObject(raw)) return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, MAX_NAME) : ''
  const birthDate = isValidISODate(raw.birthDate) ? raw.birthDate : ''
  if (!name && !birthDate) return null
  return { name, birthDate }
}

/** Valida una prueba. Si no trae id, genera uno (útil al importar copias antiguas). */
export function parseTrial(raw: unknown): Trial | null {
  if (!isObject(raw)) return null
  if (!isNonEmptyString(raw.foodId, 100)) return null
  if (!isValidISODate(raw.date)) return null
  if (!LIKED.includes(raw.liked as Liked)) return null
  if (!REACTIONS.includes(raw.reaction as Reaction)) return null
  return {
    id: isNonEmptyString(raw.id, 100) ? raw.id : newId(),
    foodId: raw.foodId,
    date: raw.date,
    liked: raw.liked as Liked,
    reaction: raw.reaction as Reaction,
    notes: typeof raw.notes === 'string' ? raw.notes.slice(0, MAX_NOTES) : '',
    // Las pruebas guardadas antes de existir esta opción no la tienen.
    retry: raw.retry === true,
    createdAt:
      typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
        ? raw.createdAt
        : `${raw.date}T12:00:00.000Z`,
  }
}

/** Valida una lista de pruebas, descartando las inválidas y los ids repetidos. */
export function parseTrials(raw: unknown[]): { trials: Trial[]; skipped: number } {
  const seen = new Set<string>()
  const trials: Trial[] = []
  let skipped = 0
  for (const item of raw) {
    const t = parseTrial(item)
    if (!t) {
      skipped++
      continue
    }
    if (seen.has(t.id)) t.id = newId()
    seen.add(t.id)
    trials.push(t)
  }
  return { trials, skipped }
}

export function parsePlanItem(raw: unknown): PlanItem | null {
  if (!isObject(raw)) return null
  if (!isNonEmptyString(raw.id, 100) || !isNonEmptyString(raw.foodId, 100) || !isValidISODate(raw.date)) return null
  const item: PlanItem = { id: raw.id, foodId: raw.foodId, date: raw.date }
  if (isNonEmptyString(raw.retryOf, 100)) item.retryOf = raw.retryOf
  return item
}

/** Valida un plan de comidas. Devuelve `null` si no tiene el formato esperado. */
export function parsePlan(raw: unknown): MealPlan | null {
  if (!isObject(raw) || !Array.isArray(raw.items)) return null
  const perDay = raw.perDay === 1 ? 1 : 2
  const seen = new Set<string>()
  const items: PlanItem[] = []
  for (const r of raw.items.slice(0, MAX_PLAN_ITEMS)) {
    const item = parsePlanItem(r)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { perDay, items }
}

/** Valida una operación de sincronización. Devuelve `null` si no es válida. */
export function parseOp(raw: unknown): SyncOp | null {
  if (!isObject(raw) || !isNonEmptyString(raw.opId, 100)) return null
  const opId = raw.opId
  switch (raw.type) {
    case 'upsertTrial': {
      // El id es obligatorio: si se generase aquí, reenviar la operación duplicaría la prueba.
      if (!isObject(raw.trial) || !isNonEmptyString(raw.trial.id, 100)) return null
      const trial = parseTrial(raw.trial)
      return trial ? { opId, type: 'upsertTrial', trial } : null
    }
    case 'deleteTrial':
      return isNonEmptyString(raw.id, 100) ? { opId, type: 'deleteTrial', id: raw.id } : null
    case 'setProfile':
      return { opId, type: 'setProfile', profile: parseProfile(raw.profile) }
    case 'mergeProfile': {
      const profile = parseProfile(raw.profile)
      return profile ? { opId, type: 'mergeProfile', profile } : null
    }
    case 'replaceAll': {
      if (!Array.isArray(raw.trials)) return null
      const plan = raw.plan === undefined ? undefined : parsePlan(raw.plan) ?? emptyPlan()
      return {
        opId,
        type: 'replaceAll',
        profile: parseProfile(raw.profile),
        trials: parseTrials(raw.trials).trials,
        ...(plan ? { plan } : {}),
      }
    }
    case 'clearAll':
      return { opId, type: 'clearAll' }
    case 'markExported':
      return typeof raw.at === 'string' && !Number.isNaN(Date.parse(raw.at))
        ? { opId, type: 'markExported', at: raw.at }
        : null
    case 'replacePlan': {
      const plan = parsePlan(raw.plan)
      return plan ? { opId, type: 'replacePlan', plan } : null
    }
    case 'addPlanItems': {
      if (!Array.isArray(raw.items) || raw.items.length === 0 || raw.items.length > MAX_PLAN_ITEMS) return null
      const items = raw.items.map(parsePlanItem)
      return items.every((i): i is PlanItem => i !== null) ? { opId, type: 'addPlanItems', items } : null
    }
    case 'movePlanItems': {
      if (!Array.isArray(raw.moves) || raw.moves.length > MAX_PLAN_ITEMS) return null
      const moves: { id: string; date: string }[] = []
      for (const m of raw.moves) {
        if (!isObject(m) || !isNonEmptyString(m.id, 100) || !isValidISODate(m.date)) return null
        moves.push({ id: m.id, date: m.date })
      }
      return { opId, type: 'movePlanItems', moves }
    }
    case 'deletePlanItem':
      return isNonEmptyString(raw.id, 100) ? { opId, type: 'deletePlanItem', id: raw.id } : null
    default:
      return null
  }
}
