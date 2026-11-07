export type CategoryId =
  | 'verduras'
  | 'frutas'
  | 'proteinas'
  | 'cereales'
  | 'lacteos'
  | 'grasas'
  | 'hierbas'

export type AllergenId =
  | 'huevo'
  | 'pescado'
  | 'gluten'
  | 'lacteos'
  | 'cacahuete'
  | 'frutos_secos'
  | 'sesamo'
  | 'soja'
  | 'marisco'

/** Edad mínima recomendada: 6 meses, 7–8 meses o 9+ meses. */
export type MinAge = 6 | 7 | 9

export interface Food {
  /** Identificador único y estable (no lo cambies si ya hay pruebas guardadas). */
  id: string
  name: string
  emoji: string
  category: CategoryId
  minAge: MinAge
  /** Cómo ofrecerlo al empezar (agarre palmar, trozos grandes). */
  prep: string
  /** Variante opcional cuando ya hace la pinza (≈ 9 meses). */
  prep9m?: string
  allergens?: AllergenId[]
  /** Buena fuente de hierro. */
  iron?: boolean
  /** Advertencia o matiz importante. */
  note?: string
}

export type Liked = 'like' | 'neutral' | 'dislike'
export type Reaction = 'none' | 'mild' | 'severe'

export interface Trial {
  id: string
  foodId: string
  /** Fecha local en formato YYYY-MM-DD. */
  date: string
  liked: Liked
  reaction: Reaction
  notes: string
  /** Marca de tiempo ISO de creación (para ordenar pruebas del mismo día). */
  createdAt: string
}

export interface Profile {
  name: string
  /** YYYY-MM-DD */
  birthDate: string
}

export interface AppData {
  version: 1
  profile: Profile | null
  trials: Trial[]
  /** Última vez que se exportó una copia de seguridad (ISO). */
  lastExportAt: string | null
}

export type FoodStatus = 'untried' | 'tried' | 'reaction'
