import { ALLERGEN_BY_ID } from '../../data/allergens'
import { FOOD_BY_ID } from '../../data/foods'
import { checkNewAllergen } from '../../lib/allergenCheck'
import { daysBetween, formatDayLabel, formatWeekday } from '../../lib/dates'
import type { PlanDay } from '../../lib/plan'
import type { Trial } from '../../types'

interface Props {
  day: PlanDay
  today: string
  trials: Trial[]
  /** Abre la ficha del alimento con el formulario de nueva prueba. */
  onRegister: (foodId: string) => void
  onOpenFood: (foodId: string) => void
  onPostpone?: (date: string) => void
  onRemove?: (itemId: string) => void
  highlight?: boolean
}

function dayTitle(date: string, today: string): string {
  const diff = daysBetween(today, date)
  if (diff === 1) return 'Mañana'
  return formatDayLabel(date, today)
}

export function PlanDayCard({ day, today, trials, onRegister, onOpenFood, onPostpone, onRemove, highlight }: Props) {
  const overdue = day.date < today && !day.done
  const pending = day.items.some((i) => !i.done)
  const isToday = day.date === today

  return (
    <section
      aria-label={`Plan del ${dayTitle(day.date, today).toLowerCase()}`}
      className={`rounded-3xl p-3 ring-1 ${
        highlight ? 'bg-lilac-100 ring-lilac-300' : overdue ? 'bg-amber-100 ring-amber-300' : 'bg-white ring-line'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h3 className="font-extrabold text-ink">
          {isToday ? `Hoy · ${formatWeekday(day.date)}` : dayTitle(day.date, today)}
        </h3>
        {day.done ? (
          <span className="rounded-full bg-mint-200 px-2.5 py-0.5 text-xs font-bold text-mint-800">✓ Hecho</span>
        ) : overdue ? (
          <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">Atrasado</span>
        ) : null}
      </div>

      <ul className="flex flex-col gap-2">
        {day.items.map(({ item, food, done }) => {
          if (!food) return null
          const allergenWarning =
            !done && food.allergens?.length
              ? checkNewAllergen(food, day.date < today ? today : day.date, trials, FOOD_BY_ID)
              : null
          const newAllergen = !done && food.allergens?.some((a) => !trials.some((t) => FOOD_BY_ID.get(t.foodId)?.allergens?.includes(a)))
          return (
            <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-white/80 p-2 ring-1 ring-line/60">
              <button
                type="button"
                onClick={() => onOpenFood(food.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-label={`Ver ${food.name}`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cream text-3xl" aria-hidden="true">
                  {food.emoji}
                </span>
                <span className="min-w-0">
                  <span className={`block font-extrabold ${done ? 'text-ink-soft line-through decoration-2' : 'text-ink'}`}>
                    {food.name}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-1">
                    {newAllergen &&
                      food.allergens!.map((a) => (
                        <span key={a} className="rounded-full bg-amber-200 px-2 py-0.5 text-[0.7rem] font-bold text-amber-700">
                          {ALLERGEN_BY_ID[a].emoji} Alérgeno nuevo
                        </span>
                      ))}
                    {food.iron && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[0.7rem] font-bold text-rose-700">🩸 Hierro</span>}
                  </span>
                  {allergenWarning && allergenWarning.recent.length > 0 && (
                    <span className="mt-1 block text-xs font-bold text-amber-700">
                      ⚠️ Otro alérgeno se introdujo hace menos de 3 días: mejor aplazar
                    </span>
                  )}
                </span>
              </button>
              {done ? (
                <span className="shrink-0 rounded-full bg-mint-200 px-3 py-1.5 text-sm font-bold text-mint-800">✓ Probado</span>
              ) : (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onRegister(food.id)}
                    className="min-h-11 rounded-xl bg-mint-300 px-3 text-sm font-extrabold text-mint-800"
                  >
                    Registrar
                  </button>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="flex h-11 w-9 items-center justify-center rounded-xl text-lg text-ink-soft"
                      aria-label={`Quitar ${food.name} del plan`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {pending && onPostpone && day.date >= today && (
        <button
          type="button"
          onClick={() => onPostpone(day.date)}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-ink-soft ring-1 ring-line"
        >
          <span aria-hidden="true">⏭️</span>
          {isToday ? 'Hoy no puedo: aplazar a mañana' : 'Aplazar este día'}
        </button>
      )}
    </section>
  )
}
