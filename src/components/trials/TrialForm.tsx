import { useMemo, useState, type FormEvent } from 'react'
import { FOOD_BY_ID } from '../../data/foods'
import { checkNewAllergen } from '../../lib/allergenCheck'
import { isValidISODate } from '../../lib/dates'
import { LIKED_OPTIONS, REACTION_OPTIONS } from '../../lib/labels'
import type { TrialInput } from '../../store/AppStore'
import type { Food, Liked, Reaction, Trial } from '../../types'
import { Button } from '../ui/Button'
import { SegmentedControl } from '../ui/SegmentedControl'
import { AllergenWarning } from './AllergenWarning'

interface Props {
  food: Food
  trials: Trial[]
  today: string
  /** Prueba existente si se está editando. */
  initial?: Trial
  minDate?: string
  onSave: (input: TrialInput) => void
  onCancel: () => void
}

const LIKED_ACTIVE: Record<Liked, string> = {
  like: 'bg-mint-200 text-mint-800 ring-2 ring-mint-300',
  neutral: 'bg-butter-200 text-butter-700 ring-2 ring-butter-300',
  dislike: 'bg-peach-200 text-peach-700 ring-2 ring-peach-300',
}
const REACTION_ACTIVE: Record<Reaction, string> = {
  none: 'bg-mint-200 text-mint-800 ring-2 ring-mint-300',
  mild: 'bg-amber-200 text-amber-700 ring-2 ring-amber-300',
  severe: 'bg-rose-200 text-rose-700 ring-2 ring-rose-300',
}

export function TrialForm({ food, trials, today, initial, minDate, onSave, onCancel }: Props) {
  const [date, setDate] = useState(initial?.date ?? today)
  const [liked, setLiked] = useState<Liked>(initial?.liked ?? 'like')
  const [reaction, setReaction] = useState<Reaction>(initial?.reaction ?? 'none')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [retry, setRetry] = useState(initial?.retry ?? false)
  // Si no lo has tocado, se activa solo al elegir «No le gustó».
  const [retryTouched, setRetryTouched] = useState(!!initial)

  const dateValid = isValidISODate(date) && date <= today
  const warning = useMemo(
    () => (dateValid ? checkNewAllergen(food, date, trials, FOOD_BY_ID, initial?.id) : null),
    [dateValid, food, date, trials, initial?.id],
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!dateValid) return
    onSave({ foodId: food.id, date, liked, reaction, notes: notes.trim(), retry })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" aria-label={initial ? 'Editar prueba' : 'Nueva prueba'}>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-ink-soft">Fecha</span>
        <input
          type="date"
          required
          value={date}
          max={today}
          min={minDate}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 rounded-2xl bg-white px-4 font-semibold text-ink ring-1 ring-line focus:ring-2 focus:ring-lilac-300 focus:outline-none"
        />
        {!dateValid && date && <span className="text-sm font-bold text-rose-700">La fecha no puede ser futura.</span>}
      </label>

      {warning && <AllergenWarning warning={warning} date={date} />}

      <SegmentedControl
        name="liked"
        legend="¿Le gustó?"
        options={LIKED_OPTIONS}
        value={liked}
        onChange={(v) => {
          setLiked(v)
          if (!retryTouched) setRetry(v === 'dislike')
        }}
        activeClass={(v) => LIKED_ACTIVE[v]}
      />

      <SegmentedControl
        name="reaction"
        legend="¿Hubo reacción?"
        options={REACTION_OPTIONS}
        value={reaction}
        onChange={setReaction}
        activeClass={(v) => REACTION_ACTIVE[v]}
      />

      {reaction === 'mild' && (
        <p className="rounded-2xl bg-amber-100 p-3 text-sm font-semibold text-amber-700">
          Anota los síntomas (rojeces, granitos alrededor de la boca, vómito aislado…) y coméntalo con tu pediatra antes
          de volver a ofrecerlo.
        </p>
      )}
      {reaction === 'severe' && (
        <p className="rounded-2xl bg-rose-100 p-3 text-sm font-bold text-rose-700" role="alert">
          🚨 Si hay dificultad para respirar, hinchazón de labios, lengua o cara, vómitos repetidos o decaimiento,
          llama al 112 de inmediato. No vuelvas a ofrecer este alimento sin hablar con tu pediatra.
        </p>
      )}

      <label
        className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-lilac-300 ${
          retry ? 'bg-sky-100 ring-sky-300' : 'bg-white ring-line'
        }`}
      >
        <input
          type="checkbox"
          checked={retry}
          onChange={(e) => {
            setRetry(e.target.checked)
            setRetryTouched(true)
          }}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${retry ? 'bg-sky-300' : 'bg-line'}`}
        >
          <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${retry ? 'translate-x-5' : ''}`} />
        </span>
        <span>
          <span className="block font-extrabold text-ink">🔁 Volver a probar</span>
          <span className="block text-sm font-semibold text-ink-soft">
            Cuenta como probado, pero queda pendiente de ofrecérselo otra vez (no le gustó, apenas comió…).
          </span>
          {retry && reaction === 'severe' && (
            <span className="mt-1 block text-sm font-bold text-rose-700">
              Tras una reacción preocupante, vuelve a ofrecerlo solo si te lo indica tu pediatra.
            </span>
          )}
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-ink-soft">Notas (opcional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Cómo lo preparaste, cuánto comió, síntomas…"
          className="rounded-2xl bg-white px-4 py-3 font-semibold text-ink ring-1 ring-line placeholder:text-ink-soft/70 focus:ring-2 focus:ring-lilac-300 focus:outline-none"
        />
      </label>

      <div className="flex flex-col gap-2">
        <Button type="submit" block disabled={!dateValid} icon="💾">
          {initial ? 'Guardar cambios' : 'Guardar prueba'}
        </Button>
        <Button variant="secondary" block onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
