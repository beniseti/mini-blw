import type { AllergenId, CategoryId, FoodStatus } from '../types'

export interface Filters {
  query: string
  category: CategoryId | 'all'
  status: FoodStatus | 'all'
  /** 'any' = solo alérgenos, 'none' = sin alérgenos, o un alérgeno concreto. */
  allergen: AllergenId | 'any' | 'none' | 'all'
  ironOnly: boolean
  ageOnly: boolean
}

export const DEFAULT_FILTERS: Filters = {
  query: '',
  category: 'all',
  status: 'all',
  allergen: 'all',
  ironOnly: false,
  ageOnly: false,
}

export function activeFilterCount(f: Filters): number {
  return (
    (f.category !== 'all' ? 1 : 0) +
    (f.status !== 'all' ? 1 : 0) +
    (f.allergen !== 'all' ? 1 : 0) +
    (f.ironOnly ? 1 : 0) +
    (f.ageOnly ? 1 : 0)
  )
}
