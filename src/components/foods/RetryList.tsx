import { FOODS } from '../../data/foods'
import { formatRelative } from '../../lib/dates'
import { LIKED_EMOJI } from '../../lib/labels'
import { retryFoods } from '../../lib/status'
import { useStore } from '../../store/AppStore'
import { Card } from '../ui/Card'

interface Props {
  onRegister: (foodId: string) => void
  onOpenFood: (foodId: string) => void
  /** Ver todos en Alimentos (filtrados). */
  onSeeAll?: () => void
  /** Cuántos mostrar como máximo. */
  limit?: number
}

/** Alimentos marcados para volver a probar, empezando por los que hace más que no prueba. */
export function RetryList({ onRegister, onOpenFood, onSeeAll, limit = 5 }: Props) {
  const { stats, today } = useStore()
  const foods = retryFoods(FOODS, stats)
  if (foods.length === 0) return null
  const shown = foods.slice(0, limit)

  return (
    <Card
      title={`🔁 Para volver a probar (${foods.length})`}
      className="bg-sky-100"
      action={
        onSeeAll && foods.length > shown.length ? (
          <button type="button" onClick={onSeeAll} className="min-h-10 rounded-full px-3 text-sm font-bold text-sky-700">
            Ver todos ›
          </button>
        ) : undefined
      }
    >
      <ul className="flex flex-col gap-2">
        {shown.map((food) => {
          const s = stats.get(food.id)!
          return (
            <li key={food.id} className="flex items-center gap-3 rounded-2xl bg-white p-2 ring-1 ring-sky-200">
              <button
                type="button"
                onClick={() => onOpenFood(food.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-label={`Ver ${food.name}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream text-2xl" aria-hidden="true">
                  {food.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-extrabold text-ink">{food.name}</span>
                  <span className="block text-xs font-semibold text-ink-soft">
                    Última vez {formatRelative(s.lastDate, today)} <span aria-hidden="true">{LIKED_EMOJI[s.lastLiked]}</span>
                    {s.count > 1 ? ` · ${s.count} pruebas` : ''}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRegister(food.id)}
                className="min-h-11 shrink-0 rounded-xl bg-sky-300 px-3 text-sm font-extrabold text-sky-700"
              >
                Registrar
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
