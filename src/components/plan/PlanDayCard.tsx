import { useState } from 'react'
import { ALLERGEN_BY_ID } from '../../data/allergens'
import { FOOD_BY_ID } from '../../data/foods'
import { checkNewAllergen } from '../../lib/allergenCheck'
import { daysBetween, formatDayLabel, formatWeekday } from '../../lib/dates'
import type { PlanDay } from '../../lib/plan'
import type { Trial } from '../../types'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface Props {
  day: PlanDay
  today: string
  trials: Trial[]
  /** Abre la ficha del alimento con el formulario de nueva prueba. */
  onRegister: (foodId: string) => void
  onOpenFood: (foodId: string) => void
  onPostpone?: (date: string) => void
  /** Abre la hoja para cambiarlo por otro alimento del plan. */
  onOptions?: (itemId: string) => void
  /** Quita el alimento del plan (se pide confirmación antes). */
  onRemove?: (itemId: string) => void
  highlight?: boolean
}

function dayTitle(date: string, today: string): string {
  const diff = daysBetween(today, date)
  if (diff === 1) return 'Mañana'
  return formatDayLabel(date, today)
}

const actionClass =
  'flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 text-sm font-extrabold transition-colors'

export function PlanDayCard({ day, today, trials, onRegister, onOpenFood, onPostpone, onOptions, onRemove, highlight }: Props) {
  const [toRemove, setToRemove] = useState<{ id: string; name: string; retry: boolean } | null>(null)
  const overdue = day.date < today && !day.done
  const pending = day.items.some((i) => !i.done)
  const isToday = day.date === today
  const title = isToday ? 'hoy' : dayTitle(day.date, today).toLowerCase()

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
          const isRetry = !!item.retryOf
          const allergenWarning =
            !done && !isRetry && food.allergens?.length
              ? checkNewAllergen(food, day.date < today ? today : day.date, trials, FOOD_BY_ID)
              : null
          const newAllergen =
            !done &&
            !isRetry &&
            food.allergens?.some((a) => !trials.some((t) => FOOD_BY_ID.get(t.foodId)?.allergens?.includes(a)))
          return (
            <li key={item.id} className="rounded-2xl bg-white/80 p-2 ring-1 ring-line/60">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenFood(food.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  aria-label={`Ver ${food.name}`}
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cream text-3xl"
                    aria-hidden="true"
                  >
                    {food.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className={`block font-extrabold ${done ? 'text-ink-soft line-through decoration-2' : 'text-ink'}`}>
                      {food.name}
                    </span>
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      {isRetry && (
                        <span className="rounded-full bg-sky-200 px-2 py-0.5 text-[0.7rem] font-bold text-sky-700">🔁 Repetir</span>
                      )}
                      {newAllergen &&
                        food.allergens!.map((a) => (
                          <span key={a} className="rounded-full bg-amber-200 px-2 py-0.5 text-[0.7rem] font-bold text-amber-700">
                            {ALLERGEN_BY_ID[a].emoji} Alérgeno nuevo
                          </span>
                        ))}
                      {food.iron && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[0.7rem] font-bold text-rose-700">🩸 Hierro</span>
                      )}
                    </span>
                    {allergenWarning && allergenWarning.recent.length > 0 && (
                      <span className="mt-1 block text-xs font-bold text-amber-700">
                        ⚠️ Otro alérgeno se introdujo hace menos de 3 días: mejor aplazar
                      </span>
                    )}
                  </span>
                </button>
                {done && (
                  <span className="shrink-0 rounded-full bg-mint-200 px-3 py-1.5 text-sm font-bold text-mint-800">
                    {isRetry ? '✓ Repetido' : '✓ Probado'}
                  </span>
                )}
              </div>

              {!done && (
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onRegister(food.id)}
                    className={`${actionClass} flex-1 bg-mint-300 text-mint-800`}
                  >
                    ✓ Registrar
                  </button>
                  {onOptions && (
                    <button
                      type="button"
                      onClick={() => onOptions(item.id)}
                      className={`${actionClass} bg-white text-lilac-700 ring-1 ring-line`}
                      aria-label={`Cambiar ${food.name} por otro alimento del plan`}
                    >
                      <span aria-hidden="true">🔄</span>
                      <span className="max-[379px]:sr-only">Cambiar</span>
                    </button>
                  )}
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => setToRemove({ id: item.id, name: food.name, retry: isRetry })}
                      className={`${actionClass} bg-white text-rose-700 ring-1 ring-line`}
                      aria-label={`Quitar ${food.name} del plan`}
                    >
                      <span aria-hidden="true">🗑️</span>
                      <span className="max-[379px]:sr-only">Quitar</span>
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

      <ConfirmDialog
        open={!!toRemove}
        title={`¿Quitar ${toRemove?.name.toLowerCase() ?? ''} del plan de ${title}?`}
        confirmLabel="Sí, quitar"
        danger
        onConfirm={() => {
          if (toRemove) onRemove?.(toRemove.id)
          setToRemove(null)
        }}
        onCancel={() => setToRemove(null)}
      >
        {toRemove?.retry
          ? 'Se quita esta repetición del plan. El alimento seguirá marcado para volver a probar.'
          : 'No se volverá a proponer hasta que rehagas el plan. Las pruebas registradas no se borran.'}
      </ConfirmDialog>
    </section>
  )
}
