import { ALLERGEN_WAIT_DAYS } from '../data/allergens'
import { PLAN_CATEGORY_ORDER, PLAN_FIRST_FOODS } from '../data/plan'
import type { AllergenId, Food, MealPlan, PlanItem } from '../types'
import { addMonthsClamped, getAge } from './age'
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

/** Agrupa el plan por días, en orden. Un alimento cuenta como hecho si ya tiene alguna prueba. */
export function groupPlan(plan: MealPlan, foodsById: Map<string, Food>, isTried: (foodId: string) => boolean): PlanDay[] {
  const days = new Map<string, PlanDayItem[]>()
  for (const item of plan.items) {
    const entry = { item, food: foodsById.get(item.foodId), done: isTried(item.foodId) }
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

export function planProgress(plan: MealPlan, isTried: (foodId: string) => boolean): PlanProgress {
  let done = 0
  let firstPending: string | null = null
  for (const i of plan.items) {
    if (isTried(i.foodId)) done++
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
  isTried: (foodId: string) => boolean,
  fromDate: string,
  days = 1,
): { id: string; date: string }[] {
  return plan.items
    .filter((i) => i.date >= fromDate && !isTried(i.foodId))
    .map((i) => ({ id: i.id, date: addDays(i.date, days) }))
}

/** Si hay días atrasados, desplaza todo lo pendiente para que el primer día pendiente sea hoy. */
export function catchUpMoves(
  plan: MealPlan,
  isTried: (foodId: string) => boolean,
  today: string,
): { id: string; date: string }[] {
  const { firstPending } = planProgress(plan, isTried)
  if (!firstPending || firstPending >= today) return []
  return postponeMoves(plan, isTried, firstPending, daysBetween(firstPending, today))
}
