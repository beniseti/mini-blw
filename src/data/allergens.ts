import type { AllergenId } from '../types'

export interface Allergen {
  id: AllergenId
  name: string
  emoji: string
}

export const ALLERGENS: Allergen[] = [
  { id: 'huevo', name: 'Huevo', emoji: '🥚' },
  { id: 'pescado', name: 'Pescado', emoji: '🐟' },
  { id: 'gluten', name: 'Gluten', emoji: '🌾' },
  { id: 'lacteos', name: 'Lácteos', emoji: '🥛' },
  { id: 'cacahuete', name: 'Cacahuete', emoji: '🥜' },
  { id: 'frutos_secos', name: 'Frutos secos', emoji: '🌰' },
  { id: 'sesamo', name: 'Sésamo', emoji: '⚪' },
  { id: 'soja', name: 'Soja', emoji: '🫘' },
  { id: 'marisco', name: 'Marisco', emoji: '🦐' },
]

export const ALLERGEN_BY_ID: Record<AllergenId, Allergen> = Object.fromEntries(
  ALLERGENS.map((a) => [a.id, a]),
) as Record<AllergenId, Allergen>

/** Días recomendados entre la introducción de dos alérgenos nuevos. */
export const ALLERGEN_WAIT_DAYS = 3
