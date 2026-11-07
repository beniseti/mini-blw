import type { CategoryId } from '../types'

export interface Category {
  id: CategoryId
  name: string
  emoji: string
  /** Clases de Tailwind (escritas completas para que Tailwind las detecte). */
  styles: {
    /** Fondo suave de la sección. */
    soft: string
    /** Etiqueta / chip. */
    chip: string
    /** Relleno de la barra de progreso. */
    bar: string
  }
}

export const CATEGORIES: Category[] = [
  {
    id: 'verduras',
    name: 'Verduras',
    emoji: '🥦',
    styles: { soft: 'bg-sage-100', chip: 'bg-sage-200 text-sage-700', bar: 'bg-sage-300' },
  },
  {
    id: 'frutas',
    name: 'Frutas',
    emoji: '🍓',
    styles: { soft: 'bg-peach-100', chip: 'bg-peach-200 text-peach-700', bar: 'bg-peach-300' },
  },
  {
    id: 'proteinas',
    name: 'Proteínas',
    emoji: '🍗',
    styles: { soft: 'bg-rose-100', chip: 'bg-rose-200 text-rose-700', bar: 'bg-rose-300' },
  },
  {
    id: 'cereales',
    name: 'Cereales y féculas',
    emoji: '🍞',
    styles: { soft: 'bg-butter-100', chip: 'bg-butter-200 text-butter-700', bar: 'bg-butter-300' },
  },
  {
    id: 'lacteos',
    name: 'Lácteos',
    emoji: '🧀',
    styles: { soft: 'bg-sky-100', chip: 'bg-sky-200 text-sky-700', bar: 'bg-sky-300' },
  },
  {
    id: 'grasas',
    name: 'Grasas y frutos secos',
    emoji: '🥑',
    styles: { soft: 'bg-lilac-100', chip: 'bg-lilac-200 text-lilac-700', bar: 'bg-lilac-300' },
  },
  {
    id: 'hierbas',
    name: 'Hierbas y especias',
    emoji: '🌿',
    styles: { soft: 'bg-mint-100', chip: 'bg-mint-200 text-mint-700', bar: 'bg-mint-300' },
  },
]

export const CATEGORY_BY_ID: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>
