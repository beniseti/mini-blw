import { useDeferredValue, useMemo, useState } from 'react'
import { FOOD_BY_ID } from '../data/foods'
import { daysBetween, formatDayLabel, formatShort } from '../lib/dates'
import { planItemDoneChecker, swapOptions } from '../lib/plan'
import { normalize } from '../lib/text'
import { useStore } from '../store/AppStore'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'

interface Props {
  /** Elemento del plan a cambiar (null = cerrado). */
  itemId: string | null
  onClose: () => void
}

const PAGE = 15

function dayName(date: string, today: string): string {
  if (daysBetween(today, date) === 1) return 'Mañana'
  return formatDayLabel(date, today)
}

/** Opciones de un alimento del plan: cambiarlo por otro (intercambiando días) o quitarlo. */
export function PlanItemSheet({ itemId, onClose }: Props) {
  const { data } = useStore()
  const item = itemId ? data.plan.items.find((i) => i.id === itemId) : undefined
  const food = item ? FOOD_BY_ID.get(item.foodId) : undefined
  return (
    <BottomSheet open={!!itemId} title={food ? `Cambiar ${food.name}` : 'Plan'} onClose={onClose}>
      {item && food ? (
        <PlanItemOptions key={item.id} itemId={item.id} onClose={onClose} />
      ) : (
        <p className="py-6 text-center font-semibold text-ink-soft">Este alimento ya no está en el plan.</p>
      )}
    </BottomSheet>
  )
}

function PlanItemOptions({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { data, today, allergenIntro, swapPlanItems, removePlanItem } = useStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const q = useDeferredValue(query)

  const item = data.plan.items.find((i) => i.id === itemId)!
  const food = FOOD_BY_ID.get(item.foodId)!
  const isDone = useMemo(() => planItemDoneChecker(data.trials), [data.trials])
  const done = isDone(item)
  const { options, blocked } = useMemo(
    () =>
      swapOptions({
        plan: data.plan,
        isDone,
        foodsById: FOOD_BY_ID,
        allergenIntro,
        birthDate: data.profile?.birthDate || null,
        itemId,
      }),
    [data.plan, isDone, allergenIntro, data.profile, itemId],
  )
  const filtered = q.trim() ? options.filter((o) => normalize(o.food.name).includes(normalize(q))) : options

  const swap = (targetId: string) => {
    const target = options.find((o) => o.item.id === targetId)!
    swapPlanItems(item.id, targetId)
    toast.show(`🔄 ${target.food.name}: ${formatShort(item.date, today)} · ${food.name}: ${formatShort(target.item.date, today)}`)
    onClose()
  }

  const remove = () => {
    removePlanItem(item.id)
    toast.show(`${food.name} quitado del plan`)
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 pt-1">
      <div className="flex items-center gap-4 pr-12">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-lilac-100 text-4xl" aria-hidden="true">
          {food.emoji}
        </span>
        <div className="min-w-0">
          <h2 className="text-2xl leading-tight font-black text-ink">{food.name}</h2>
          <p className="text-sm font-bold text-ink-soft">
            {item.retryOf ? '🔁 Repetición · ' : ''}Planificado para {dayName(item.date, today).toLowerCase()}
          </p>
        </div>
      </div>

      {done ? (
        <p className="rounded-2xl bg-mint-100 p-3 text-sm font-bold text-mint-800">✓ Ya está hecho: no hace falta cambiarlo.</p>
      ) : (
        <section aria-labelledby="swap-title" className="flex flex-col gap-3">
          <div>
            <h3 id="swap-title" className="font-extrabold text-ink">
              🔄 Cambiar por otro alimento del plan
            </h3>
            <p className="text-sm font-semibold text-ink-soft">
              El que elijas pasa a este día y {food.name.toLowerCase()} se mueve al día de ese alimento.
            </p>
          </div>

          {options.length > 0 && (
            <label className="relative">
              <span className="sr-only">Buscar alimento del plan</span>
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2" aria-hidden="true">
                🔍
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setLimit(PAGE)
                }}
                placeholder="Buscar en el plan…"
                className="h-12 w-full rounded-2xl bg-white pr-4 pl-11 font-semibold text-ink ring-1 ring-line placeholder:text-ink-soft/70 focus:ring-2 focus:ring-lilac-300 focus:outline-none"
              />
            </label>
          )}

          {filtered.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-center text-sm font-semibold text-ink-soft ring-1 ring-line">
              {options.length === 0 ? 'No hay ningún alimento del plan por el que se pueda cambiar.' : 'Ningún alimento coincide.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.slice(0, limit).map(({ item: target, food: tf }) => (
                <li key={target.id}>
                  <button
                    type="button"
                    onClick={() => swap(target.id)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white p-2 text-left ring-1 ring-line active:bg-lilac-100"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream text-2xl" aria-hidden="true">
                      {tf.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-extrabold text-ink">{tf.name}</span>
                      <span className="block text-xs font-semibold text-ink-soft">
                        {dayName(target.date, today)}
                        {target.retryOf ? ' · 🔁 Repetición' : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-extrabold text-lilac-700" aria-hidden="true">
                      Cambiar ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {filtered.length > limit && (
            <Button variant="secondary" block onClick={() => setLimit((l) => l + PAGE)}>
              Ver más ({filtered.length - limit})
            </Button>
          )}

          {blocked > 0 && (
            <p className="text-xs font-semibold text-ink-soft">
              ℹ️ {blocked} {blocked === 1 ? 'alimento no aparece' : 'alimentos no aparecen'} porque el cambio rompería las
              reglas del plan (un alérgeno nuevo va solo y separado 3 días, y cada alimento a su edad).
            </p>
          )}
        </section>
      )}

      <Button variant="ghost" block className="text-rose-700" onClick={remove}>
        ✕ Quitar del plan
      </Button>
    </div>
  )
}
