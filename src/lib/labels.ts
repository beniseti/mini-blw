import type { FoodStatus, Liked, Reaction } from '../types'

export const LIKED_OPTIONS: { value: Liked; emoji: string; label: string }[] = [
  { value: 'like', emoji: '👍', label: 'Le gustó' },
  { value: 'neutral', emoji: '😐', label: 'Normal' },
  { value: 'dislike', emoji: '👎', label: 'No le gustó' },
]

export const LIKED_EMOJI: Record<Liked, string> = { like: '👍', neutral: '😐', dislike: '👎' }
export const LIKED_LABEL: Record<Liked, string> = { like: 'Le gustó', neutral: 'Normal', dislike: 'No le gustó' }

export const REACTION_OPTIONS: { value: Reaction; emoji: string; label: string }[] = [
  { value: 'none', emoji: '✅', label: 'Ninguna' },
  { value: 'mild', emoji: '🟡', label: 'Leve' },
  { value: 'severe', emoji: '🔴', label: 'Preocupante' },
]

export const REACTION_LABEL: Record<Reaction, string> = {
  none: 'Sin reacción',
  mild: 'Reacción leve',
  severe: 'Reacción preocupante',
}

/** Clases para el estado visual de cada alimento. */
export const STATUS_STYLES: Record<FoodStatus | 'mild' | 'severe', { card: string; badge: string }> = {
  untried: {
    card: 'bg-white border-2 border-dashed border-line',
    badge: 'bg-white text-ink-soft ring-1 ring-line',
  },
  tried: {
    card: 'bg-mint-100 border-2 border-mint-300',
    badge: 'bg-mint-200 text-mint-800',
  },
  reaction: {
    card: 'bg-amber-100 border-2 border-amber-300',
    badge: 'bg-amber-200 text-amber-700',
  },
  mild: {
    card: 'bg-amber-100 border-2 border-amber-300',
    badge: 'bg-amber-200 text-amber-700',
  },
  severe: {
    card: 'bg-rose-100 border-2 border-rose-300',
    badge: 'bg-rose-200 text-rose-700',
  },
}

export const STATUS_LABEL: Record<FoodStatus, string> = {
  untried: 'No probado',
  tried: 'Probado',
  reaction: 'Con reacción',
}
