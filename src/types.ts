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
  /** Probado, pero hay que volver a ofrecérselo (no le gustó, apenas comió…). */
  retry: boolean
  /** Marca de tiempo ISO de creación (para ordenar pruebas del mismo día). */
  createdAt: string
}

export interface Profile {
  name: string
  /** YYYY-MM-DD */
  birthDate: string
}

/** Un alimento nuevo planificado para un día concreto. */
export interface PlanItem {
  id: string
  foodId: string
  /** YYYY-MM-DD */
  date: string
  /**
   * Si es una repetición («volver a probar»): id de la prueba que pidió repetirlo.
   * Se da por hecha cuando hay una prueba posterior de ese alimento.
   */
  retryOf?: string
}

/** Plan de comidas: alimentos nuevos a introducir, 1 o 2 por día. */
export interface MealPlan {
  perDay: 1 | 2
  items: PlanItem[]
}

export interface AppData {
  version: 1
  profile: Profile | null
  trials: Trial[]
  /** Última vez que se exportó una copia de seguridad (ISO). */
  lastExportAt: string | null
  plan: MealPlan
}

export type FoodStatus = 'untried' | 'tried' | 'reaction'

/**
 * Operación de cambio que el cliente envía al servidor (cola de sincronización).
 * Cada una lleva un `opId` único para que reenviarla no la aplique dos veces.
 */
export type SyncOp =
  | { opId: string; type: 'upsertTrial'; trial: Trial }
  | { opId: string; type: 'deleteTrial'; id: string }
  | { opId: string; type: 'setProfile'; profile: Profile | null }
  /** Solo fija el perfil si el servidor aún no tiene uno (migración de datos antiguos). */
  | { opId: string; type: 'mergeProfile'; profile: Profile }
  /** Importar copia: sustituye perfil y pruebas (y el plan, si la copia lo incluye). */
  | { opId: string; type: 'replaceAll'; profile: Profile | null; trials: Trial[]; plan?: MealPlan }
  | { opId: string; type: 'clearAll' }
  | { opId: string; type: 'markExported'; at: string }
  /** Crear o rehacer el plan de comidas (sustituye el anterior). */
  | { opId: string; type: 'replacePlan'; plan: MealPlan }
  /** Añadir alimentos al plan (p. ej. una repetición). */
  | { opId: string; type: 'addPlanItems'; items: PlanItem[] }
  /** Cambiar de fecha alimentos del plan (aplazar). */
  | { opId: string; type: 'movePlanItems'; moves: { id: string; date: string }[] }
  | { opId: string; type: 'deletePlanItem'; id: string }

export interface SyncResponse {
  data: AppData
  applied: number
  rejected: number
}
