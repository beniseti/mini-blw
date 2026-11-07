import { ALLERGEN_WAIT_DAYS } from '../data/allergens'
import { PLAN_CATEGORY_ORDER, PLAN_FIRST_FOODS, PLAN_RETRY_AFTER_DAYS } from '../data/plan'
import type { AllergenId, Food, MealPlan, PlanItem, Trial } from '../types'
import { addMonthsClamped, getAge } from './age'
import { firstIntroductions } from './allergenCheck'
import { addDays, daysBetween } from './dates'

/** Como mucho se planifican 2 años (evita bucles si no hay nada que planificar). */
const MAX_DAYS = 730

/** Orden de prioridad de los alimentos para el plan. */
export function planOrder(foods: Food[]): Food[] {
  const byId = new Map(foods.map((f) => [f.id, f]))
  const first = PLAN_FIRST_FOODS.map((id) => byId.get(id)).filter((f): f is Food => !!f)
  const used = new Set(first.map((f) => f.id))
  // El resto, alternando categorías para que haya variedad.
  const groups = PLAN_CATEGORY_ORDER.map((cat) => foods.filter((f) => f.category === cat && !used.has(f.id)))
  const rest: Food[] = []
  for (let i = 0; groups.some((g) => i < g.length); i++) for (const g of groups) if (i < g.length) rest.push(g[i])
  rest.forEach((f) => used.add(f.id))
  // Lo que quede (hierbas y especias, u otras categorías) al final.
  const last = foods.filter((f) => !used.has(f.id))
  return [...first, ...rest, ...last]
}

/** Fecha en la que el bebé cumple 6 meses. */
export function sixMonthsDate(birthDate: string): string {
  return addMonthsClamped(birthDate, 6)
}

export interface GenerateOptions {
  /** Catálogo de alimentos. */
  foods: Food[]
  /** Alimentos ya probados (no se planifican). */
  tried: Set<string>
  /** Fecha real de la primera introducción de cada alérgeno. */
  allergenIntro: Map<AllergenId, string>
  /** Fecha de nacimiento (para respetar la edad mínima); null = sin perfil. */
  birthDate: string | null
  perDay: 1 | 2
  /** Primer día del plan (YYYY-MM-DD). */
  startDate: string
  newId: () => string
}

/**
 * Genera el plan: recorre los días desde `startDate` y asigna hasta `perDay`
 * alimentos nuevos por día, en orden de prioridad, respetando:
 *  - la edad mínima de cada alimento ese día,
 *  - un alérgeno nuevo como mucho por día, y ese día solo ese alimento,
 *  - al menos 3 días entre alérgenos nuevos (planificados o ya introducidos).
 */
export function generatePlan(opts: GenerateOptions): PlanItem[] {
  const queue = planOrder(opts.foods).filter((f) => !opts.tried.has(f.id))
  const intro = new Map(opts.allergenIntro)
  const items: PlanItem[] = []
  let day = opts.startDate

  for (let n = 0; queue.length > 0 && n < MAX_DAYS; n++, day = addDays(day, 1)) {
    const months = opts.birthDate ? (getAge(opts.birthDate, day)?.months ?? -1) : null
    const chosen: Food[] = []
    let allergenDay = false

    for (const food of queue) {
      if (chosen.length >= opts.perDay || allergenDay) break
      if (months !== null && (months < 6 || food.minAge > months)) continue
      const newAllergens = (food.allergens ?? []).filter((a) => {
        const d = intro.get(a)
        return !d || d > day
      })
      if (newAllergens.length === 0) {
        chosen.push(food)
        continue
      }
      // Un alérgeno nuevo va solo ese día…
      if (chosen.length > 0) continue
      // …y separado al menos 3 días de cualquier otro alérgeno nuevo.
      const tooClose = [...intro].some(
        ([a, d]) => !newAllergens.includes(a) && Math.abs(daysBetween(d, day)) < ALLERGEN_WAIT_DAYS,
      )
      if (tooClose) continue
      chosen.push(food)
      allergenDay = true
      for (const a of newAllergens) intro.set(a, day)
    }

    for (const food of chosen) {
      items.push({ id: opts.newId(), foodId: food.id, date: day })
      queue.splice(queue.indexOf(food), 1)
    }
  }
  return items
}

/** ¿La prueba `a` es posterior a `b`? (por fecha y, el mismo día, por hora de registro) */
function isAfter(a: Trial, b: Trial): boolean {
  return a.date > b.date || (a.date === b.date && a.createdAt > b.createdAt)
}

/** Prueba más reciente de un alimento. */
export function latestTrialOf(trials: Trial[], foodId: string): Trial | undefined {
  let latest: Trial | undefined
  for (const t of trials) if (t.foodId === foodId && (!latest || isAfter(t, latest))) latest = t
  return latest
}

export type PlanItemDone = (item: PlanItem) => boolean

/**
 * Cuándo se da por hecho un alimento del plan:
 *  - alimento nuevo: en cuanto tiene alguna prueba;
 *  - repetición (`retryOf`): cuando hay una prueba de ese alimento posterior a la
 *    que pidió repetirlo (o si se quitó la marca «volver a probar»).
 */
export function planItemDoneChecker(trials: Trial[]): PlanItemDone {
  const tried = new Set<string>()
  const byId = new Map<string, Trial>()
  const latest = new Map<string, Trial>()
  for (const t of trials) {
    tried.add(t.foodId)
    byId.set(t.id, t)
    const cur = latest.get(t.foodId)
    if (!cur || isAfter(t, cur)) latest.set(t.foodId, t)
  }
  return (item) => {
    if (!item.retryOf) return tried.has(item.foodId)
    const last = latest.get(item.foodId)
    if (!last) return false
    const origin = byId.get(item.retryOf)
    if (!origin) return !last.retry // la prueba original se borró
    return isAfter(last, origin) || !origin.retry
  }
}

export interface PlanDayItem {
  item: PlanItem
  food: Food | undefined
  done: boolean
}

export interface PlanDay {
  date: string
  items: PlanDayItem[]
  /** Todos los alimentos del día ya se han probado. */
  done: boolean
}

/** Agrupa el plan por días, en orden. */
export function groupPlan(plan: MealPlan, foodsById: Map<string, Food>, isDone: PlanItemDone): PlanDay[] {
  const days = new Map<string, PlanDayItem[]>()
  for (const item of plan.items) {
    const entry = { item, food: foodsById.get(item.foodId), done: isDone(item) }
    const list = days.get(item.date)
    if (list) list.push(entry)
    else days.set(item.date, [entry])
  }
  return [...days]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, items]) => ({ date, items, done: items.every((i) => i.done) }))
}

export interface PlanProgress {
  done: number
  total: number
  /** Primer día con alimentos pendientes (o null si no hay). */
  firstPending: string | null
}

export function planProgress(plan: MealPlan, isDone: PlanItemDone): PlanProgress {
  let done = 0
  let firstPending: string | null = null
  for (const i of plan.items) {
    if (isDone(i)) done++
    else if (!firstPending || i.date < firstPending) firstPending = i.date
  }
  return { done, total: plan.items.length, firstPending }
}

/**
 * Aplazar: mueve los alimentos pendientes de `fromDate` y de los días siguientes
 * `days` días más tarde. Desplazar todo a la vez mantiene la separación entre alérgenos.
 */
export function postponeMoves(
  plan: MealPlan,
  isDone: PlanItemDone,
  fromDate: string,
  days = 1,
): { id: string; date: string }[] {
  return plan.items.filter((i) => i.date >= fromDate && !isDone(i)).map((i) => ({ id: i.id, date: addDays(i.date, days) }))
}

/** Si hay días atrasados, desplaza todo lo pendiente para que el primer día pendiente sea hoy. */
export function catchUpMoves(plan: MealPlan, isDone: PlanItemDone, today: string): { id: string; date: string }[] {
  const { firstPending } = planProgress(plan, isDone)
  if (!firstPending || firstPending >= today) return []
  return postponeMoves(plan, isDone, firstPending, daysBetween(firstPending, today))
}

/**
 * Día para una repetición: el primero desde `fromDate` que no sea un día de
 * alérgeno nuevo (esos días el alimento nuevo va solo).
 */
export function retrySlot(
  plan: MealPlan,
  isDone: PlanItemDone,
  foodsById: Map<string, Food>,
  allergenIntro: Map<AllergenId, string>,
  fromDate: string,
): string {
  const allergenDays = new Set(
    plan.items
      .filter((i) => !i.retryOf && !isDone(i))
      .filter((i) => (foodsById.get(i.foodId)?.allergens ?? []).some((a) => !allergenIntro.has(a)))
      .map((i) => i.date),
  )
  let date = fromDate
  while (allergenDays.has(date)) date = addDays(date, 1)
  return date
}

export interface RetryPlanOptions {
  plan: MealPlan
  /** Pruebas ya con el cambio aplicado. */
  trials: Trial[]
  foodId: string
  foodsById: Map<string, Food>
  today: string
  newId: () => string
}

/**
 * Qué cambiar en el plan cuando cambia la marca «volver a probar» de un alimento:
 *  - si su prueba más reciente pide repetirlo, se programa una repetición
 *    PLAN_RETRY_AFTER_DAYS días después (como pronto, mañana);
 *  - si ya no, se quitan las repeticiones pendientes.
 */
export function retryPlanChange(opts: RetryPlanOptions): { remove: string[]; add: PlanItem | null } {
  const byId = new Map(opts.trials.map((t) => [t.id, t]))
  const latest = latestTrialOf(opts.trials, opts.foodId)
  // Repeticiones de este alimento que aún no se han hecho (no hay prueba posterior):
  // siguen pendientes o se han cancelado al quitar la marca.
  const open = opts.plan.items.filter((i) => {
    if (i.foodId !== opts.foodId || !i.retryOf) return false
    const origin = byId.get(i.retryOf)
    return !origin || !latest || !isAfter(latest, origin)
  })
  if (!latest?.retry) return { remove: open.map((i) => i.id), add: null }
  // Ya hay una repetición programada para esta misma prueba: no se duplica.
  if (open.some((i) => i.retryOf === latest.id)) {
    return { remove: open.filter((i) => i.retryOf !== latest.id).map((i) => i.id), add: null }
  }
  const isDone = planItemDoneChecker(opts.trials)
  const earliest = addDays(latest.date, PLAN_RETRY_AFTER_DAYS)
  const tomorrow = addDays(opts.today, 1)
  const date = retrySlot(
    opts.plan,
    isDone,
    opts.foodsById,
    firstIntroductions(opts.trials, opts.foodsById),
    earliest > tomorrow ? earliest : tomorrow,
  )
  return {
    remove: open.map((i) => i.id),
    add: { id: opts.newId(), foodId: opts.foodId, date, retryOf: latest.id },
  }
}
