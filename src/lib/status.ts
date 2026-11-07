import type { Food, FoodStatus, Liked, Reaction, Trial } from '../types'

export interface FoodStats {
  count: number
  /** Peor reacción registrada en cualquiera de las pruebas. */
  worstReaction: Reaction
  lastDate: string
  lastLiked: Liked
  /** La prueba más reciente está marcada como «volver a probar». */
  retry: boolean
}

const REACTION_RANK: Record<Reaction, number> = { none: 0, mild: 1, severe: 2 }

export function compareTrialsDesc(a: Trial, b: Trial): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
}

/** Resumen por alimento a partir de todas las pruebas. */
export function computeFoodStats(trials: Trial[]): Map<string, FoodStats> {
  const map = new Map<string, FoodStats>()
  const sorted = [...trials].sort(compareTrialsDesc)
  for (const t of sorted) {
    const s = map.get(t.foodId)
    if (!s) {
      map.set(t.foodId, {
        count: 1,
        worstReaction: t.reaction,
        lastDate: t.date,
        lastLiked: t.liked,
        retry: t.retry,
      })
    } else {
      s.count += 1
      if (REACTION_RANK[t.reaction] > REACTION_RANK[s.worstReaction]) s.worstReaction = t.reaction
    }
  }
  return map
}

export function statusOf(stats: FoodStats | undefined): FoodStatus {
  if (!stats) return 'untried'
  return stats.worstReaction === 'none' ? 'tried' : 'reaction'
}

export interface Progress {
  tried: number
  total: number
  /** 0–100, redondeado. */
  pct: number
}

/** Alimentos probados (con o sin reacción) sobre el total. */
export function progressFor(foods: Food[], stats: Map<string, FoodStats>): Progress {
  const total = foods.length
  const tried = foods.reduce((n, f) => n + (stats.has(f.id) ? 1 : 0), 0)
  return { tried, total, pct: total ? Math.round((tried / total) * 100) : 0 }
}

/** Estado visual: la reacción tiene prioridad sobre «volver a probar». */
export type VisualStatus = 'untried' | 'tried' | 'retry' | 'mild' | 'severe'

export function visualStatus(stats: FoodStats | undefined): VisualStatus {
  if (!stats) return 'untried'
  if (stats.worstReaction === 'severe') return 'severe'
  if (stats.worstReaction === 'mild') return 'mild'
  if (stats.retry) return 'retry'
  return 'tried'
}

/** Alimentos pendientes de volver a probar, empezando por los que hace más que no prueba. */
export function retryFoods<T extends { id: string }>(foods: T[], stats: Map<string, FoodStats>): T[] {
  return foods
    .filter((f) => stats.get(f.id)?.retry)
    .sort((a, b) => (stats.get(a.id)!.lastDate < stats.get(b.id)!.lastDate ? -1 : 1))
}
