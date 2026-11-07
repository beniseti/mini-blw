import { memo } from 'react'
import { MIN_AGE_LABEL } from '../../lib/age'
import { STATUS_STYLES } from '../../lib/labels'
import { visualStatus, type FoodStats } from '../../lib/status'
import type { Food } from '../../types'

interface Props {
  food: Food
  stats: FoodStats | undefined
  /** true = adecuado para su edad, false = todavía no, null = sin perfil. */
  suitable: boolean | null
  onOpen: (foodId: string) => void
}

const STATUS_ICON = { untried: '', tried: '✓', retry: '🔁', mild: '!', severe: '!' } as const
const STATUS_ICON_CLASS = {
  untried: '',
  tried: 'bg-mint-300 text-mint-800',
  retry: 'bg-sky-300 text-sky-700',
  mild: 'bg-amber-300 text-amber-700',
  severe: 'bg-rose-300 text-rose-700',
} as const
const STATUS_SR = {
  untried: 'no probado',
  tried: 'probado',
  retry: 'probado, volver a probar',
  mild: 'reacción leve',
  severe: 'reacción preocupante',
}

export const FoodCard = memo(function FoodCard({ food, stats, suitable, onOpen }: Props) {
  const status = visualStatus(stats)
  const dimmed = suitable === false && status === 'untried'
  const hasAllergen = (food.allergens?.length ?? 0) > 0
  // Los no probados y adecuados para su edad se resaltan con borde lila continuo.
  const cardClass =
    status === 'untried' && suitable === true ? 'bg-white border-2 border-lilac-300' : STATUS_STYLES[status].card

  return (
    <button
      type="button"
      onClick={() => onOpen(food.id)}
      className={`relative flex min-h-[7.5rem] flex-col items-center justify-start gap-1 rounded-2xl px-1.5 pt-3 pb-2 text-center transition-transform active:scale-[0.97] ${cardClass} ${
        dimmed ? 'opacity-50' : ''
      }`}
      aria-label={`${food.name}, ${STATUS_SR[status]}${stats ? `, ${stats.count} ${stats.count === 1 ? 'prueba' : 'pruebas'}` : ''}${
        hasAllergen ? ', alérgeno' : ''
      }${suitable === false ? `, a partir de ${MIN_AGE_LABEL[food.minAge]}` : ''}`}
    >
      {status !== 'untried' && (
        <span
          className={`absolute top-1.5 right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-extrabold ${STATUS_ICON_CLASS[status]}`}
          aria-hidden="true"
        >
          {STATUS_ICON[status]}
          {stats && stats.count > 1 ? <span className="ml-0.5 font-bold">{stats.count}</span> : null}
        </span>
      )}
      <span className="text-4xl leading-none" aria-hidden="true">
        {food.emoji}
      </span>
      <span className="line-clamp-2 text-[0.8rem] leading-tight font-bold text-ink">{food.name}</span>
      <span className="mt-auto flex flex-wrap items-center justify-center gap-1" aria-hidden="true">
        {hasAllergen && (
          <span className="rounded-full bg-amber-200 px-1.5 text-[0.65rem] font-extrabold text-amber-700">Alérgeno</span>
        )}
        {stats?.retry && status !== 'retry' && (
          <span className="rounded-full bg-sky-200 px-1.5 text-[0.65rem] font-extrabold text-sky-700">🔁 Repetir</span>
        )}
        {food.iron && <span className="text-xs" title="Rico en hierro">🩸</span>}
        {suitable === false && (
          <span className="rounded-full bg-white/80 px-1.5 text-[0.65rem] font-bold text-ink-soft ring-1 ring-line">
            {MIN_AGE_LABEL[food.minAge]}
          </span>
        )}
      </span>
    </button>
  )
})
