import { describe, expect, it } from 'vitest'
import { FOOD_BY_ID, FOODS } from '../data/foods'
import type { AllergenId, MealPlan, PlanItem } from '../types'
import { daysBetween } from './dates'
import { catchUpMoves, generatePlan, groupPlan, planOrder, planProgress, postponeMoves, sixMonthsDate } from './plan'

let n = 0
const newId = () => `p${++n}`

function gen(opts: Partial<Parameters<typeof generatePlan>[0]> = {}): PlanItem[] {
  return generatePlan({
    foods: FOODS,
    tried: new Set(),
    allergenIntro: new Map(),
    birthDate: '2026-04-01', // 7 meses el 7-nov-2026
    perDay: 2,
    startDate: '2026-11-07',
    newId,
    ...opts,
  })
}

/** Alérgenos que introduce cada día (por primera vez) según el plan. */
function newAllergensByDay(items: PlanItem[], initial = new Map<AllergenId, string>()) {
  const seen = new Map(initial)
  const byDay = new Map<string, AllergenId[]>()
  for (const i of [...items].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    for (const a of FOOD_BY_ID.get(i.foodId)?.allergens ?? []) {
      if (!seen.has(a)) {
        seen.set(a, i.date)
        byDay.set(i.date, [...(byDay.get(i.date) ?? []), a])
      }
    }
  }
  return byDay
}

describe('generatePlan', () => {
  it('planifica todos los alimentos no probados, como mucho 2 al día', () => {
    const items = gen()
    expect(items).toHaveLength(FOODS.length)
    expect(new Set(items.map((i) => i.foodId)).size).toBe(FOODS.length)
    const perDay = new Map<string, number>()
    for (const i of items) perDay.set(i.date, (perDay.get(i.date) ?? 0) + 1)
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(2)
    expect(items[0].date).toBe('2026-11-07')
  })

  it('con 1 al día, un alimento por día', () => {
    const items = gen({ perDay: 1 })
    expect(new Set(items.map((i) => i.date)).size).toBe(items.length)
  })

  it('empieza por los primeros alimentos recomendados', () => {
    const items = gen()
    expect(items.slice(0, 2).map((i) => i.foodId)).toEqual(['brocoli', 'platano'])
  })

  it('cada alérgeno nuevo va solo ese día y separado al menos 3 días', () => {
    const items = gen()
    const byDay = newAllergensByDay(items)
    const dates = [...byDay.keys()].sort()
    expect(dates.length).toBe(9) // los 9 alérgenos
    for (const d of dates) {
      expect(byDay.get(d)).toHaveLength(1)
      expect(items.filter((i) => i.date === d)).toHaveLength(1) // solo ese alimento
    }
    for (let i = 1; i < dates.length; i++) expect(daysBetween(dates[i - 1], dates[i])).toBeGreaterThanOrEqual(3)
  })

  it('respeta los alérgenos ya introducidos en pruebas reales', () => {
    const intro = new Map<AllergenId, string>([['huevo', '2026-11-06']])
    const items = gen({ allergenIntro: intro, tried: new Set(['huevo']) })
    const first = [...newAllergensByDay(items, intro).keys()].sort()[0]
    expect(daysBetween('2026-11-06', first)).toBeGreaterThanOrEqual(3)
    expect(items.some((i) => i.foodId === 'huevo')).toBe(false)
  })

  it('respeta la edad mínima según la fecha de cada día', () => {
    const items = gen()
    const nineMonths = '2027-01-01'
    for (const i of items) {
      if (FOOD_BY_ID.get(i.foodId)!.minAge === 9) expect(i.date >= nineMonths).toBe(true)
      if (FOOD_BY_ID.get(i.foodId)!.minAge === 7) expect(i.date >= '2026-11-01').toBe(true)
    }
  })

  it('antes de los 6 meses no planifica nada hasta que los cumpla', () => {
    const items = gen({ birthDate: '2026-08-15', startDate: '2026-11-07' })
    expect(items[0].date).toBe(sixMonthsDate('2026-08-15'))
    expect(sixMonthsDate('2026-08-15')).toBe('2027-02-15')
  })

  it('no incluye los alimentos ya probados', () => {
    const items = gen({ tried: new Set(['brocoli', 'platano']) })
    expect(items.some((i) => i.foodId === 'brocoli' || i.foodId === 'platano')).toBe(false)
  })

  it('el orden incluye todo el catálogo una vez, con hierbas al final', () => {
    const order = planOrder(FOODS)
    expect(order).toHaveLength(FOODS.length)
    expect(order.at(-1)!.category).toBe('hierbas')
  })
})

describe('aplazar', () => {
  const plan: MealPlan = {
    perDay: 2,
    items: [
      { id: 'a', foodId: 'brocoli', date: '2026-11-05' },
      { id: 'b', foodId: 'platano', date: '2026-11-05' },
      { id: 'c', foodId: 'huevo', date: '2026-11-07' },
      { id: 'd', foodId: 'pera', date: '2026-11-08' },
    ],
  }
  const tried = (id: string) => id === 'brocoli'

  it('postponeMoves mueve ese día y los siguientes (solo lo pendiente)', () => {
    expect(postponeMoves(plan, tried, '2026-11-07')).toEqual([
      { id: 'c', date: '2026-11-08' },
      { id: 'd', date: '2026-11-09' },
    ])
    expect(postponeMoves(plan, tried, '2026-11-05').map((m) => m.id)).toEqual(['b', 'c', 'd'])
  })

  it('catchUpMoves hace que lo pendiente empiece hoy', () => {
    const moves = catchUpMoves(plan, tried, '2026-11-07')
    expect(moves).toEqual([
      { id: 'b', date: '2026-11-07' },
      { id: 'c', date: '2026-11-09' },
      { id: 'd', date: '2026-11-10' },
    ])
    expect(catchUpMoves(plan, tried, '2026-11-05')).toEqual([])
  })

  it('agrupa por días y calcula el progreso', () => {
    const days = groupPlan(plan, FOOD_BY_ID, tried)
    expect(days.map((d) => d.date)).toEqual(['2026-11-05', '2026-11-07', '2026-11-08'])
    expect(days[0].items.map((i) => i.done)).toEqual([true, false])
    expect(planProgress(plan, tried)).toEqual({ done: 1, total: 4, firstPending: '2026-11-05' })
  })
})
