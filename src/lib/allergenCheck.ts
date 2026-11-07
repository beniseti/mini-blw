import { ALLERGEN_WAIT_DAYS } from '../data/allergens'
import type { AllergenId, Food, Trial } from '../types'
import { daysBetween } from './dates'

/**
 * Fecha de la primera prueba de cada alérgeno.
 * `excludeTrialId` permite ignorar la prueba que se está editando.
 */
export function firstIntroductions(
  trials: Trial[],
  foodsById: Map<string, Food>,
  excludeTrialId?: string,
): Map<AllergenId, string> {
  const result = new Map<AllergenId, string>()
  for (const t of trials) {
    if (t.id === excludeTrialId) continue
    const food = foodsById.get(t.foodId)
    for (const a of food?.allergens ?? []) {
      const prev = result.get(a)
      if (!prev || t.date < prev) result.set(a, t.date)
    }
  }
  return result
}

export interface RecentAllergen {
  allergen: AllergenId
  /** Fecha de su primera introducción. */
  date: string
  /** Días desde esa introducción hasta la nueva prueba (negativo si fue después). */
  diffDays: number
}

export interface AllergenWarning {
  /** Alérgenos que esta prueba introduciría por primera vez. */
  newAllergens: AllergenId[]
  /** Otros alérgenos introducidos por primera vez a menos de 3 días de distancia. */
  recent: RecentAllergen[]
  /** El alimento introduce varios alérgenos nuevos a la vez. */
  multipleNew: boolean
}

/**
 * Comprueba si registrar `food` en `date` introduce un alérgeno nuevo cuando hace
 * menos de 3 días que se introdujo otro alérgeno nuevo. Devuelve `null` si no hay
 * nada que avisar. El aviso es orientativo: nunca bloquea el registro.
 */
export function checkNewAllergen(
  food: Food,
  date: string,
  trials: Trial[],
  foodsById: Map<string, Food>,
  excludeTrialId?: string,
): AllergenWarning | null {
  const allergens = food.allergens ?? []
  if (allergens.length === 0) return null

  const intro = firstIntroductions(trials, foodsById, excludeTrialId)
  // Nuevo = no hay ninguna otra prueba con ese alérgeno en esa fecha o antes.
  const newAllergens = allergens.filter((a) => {
    const first = intro.get(a)
    return !first || first > date
  })
  if (newAllergens.length === 0) return null

  const recent: RecentAllergen[] = []
  for (const [allergen, first] of intro) {
    if (newAllergens.includes(allergen)) continue
    const diffDays = daysBetween(first, date)
    if (Math.abs(diffDays) < ALLERGEN_WAIT_DAYS) recent.push({ allergen, date: first, diffDays })
  }
  recent.sort((a, b) => Math.abs(a.diffDays) - Math.abs(b.diffDays))

  const multipleNew = newAllergens.length > 1
  if (recent.length === 0 && !multipleNew) return null
  return { newAllergens, recent, multipleNew }
}

/** El alérgeno introducido más recientemente (para la pantalla de inicio). */
export function latestIntroduction(
  intro: Map<AllergenId, string>,
): { allergens: AllergenId[]; date: string } | null {
  let latest: string | null = null
  for (const d of intro.values()) if (!latest || d > latest) latest = d
  if (!latest) return null
  const allergens = [...intro].filter(([, d]) => d === latest).map(([a]) => a)
  return { allergens, date: latest }
}
