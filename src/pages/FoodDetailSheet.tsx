import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORY_BY_ID } from '../data/categories'
import { FOOD_BY_ID } from '../data/foods'
import { formatAge, isSuitable, MIN_AGE_LABEL } from '../lib/age'
import { formatShort } from '../lib/dates'
import { compareTrialsDesc, visualStatus } from '../lib/status'
import { useStore, type TrialInput } from '../store/AppStore'
import { AllergenChips } from '../components/foods/AllergenChips'
import { StatusBadge } from '../components/foods/StatusBadge'
import { TrialForm } from '../components/trials/TrialForm'
import { TrialItem } from '../components/trials/TrialItem'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'

interface Props {
  foodId: string | null
  /** Id de una prueba a editar al abrir (desde el historial). */
  editTrialId?: string | null
  onClose: () => void
}

export function FoodDetailSheet({ foodId, editTrialId, onClose }: Props) {
  const food = foodId ? FOOD_BY_ID.get(foodId) : undefined
  return (
    <BottomSheet open={!!food} title={food?.name ?? 'Alimento'} onClose={onClose}>
      {food && <FoodDetail key={`${food.id}-${editTrialId ?? ''}`} foodId={food.id} editTrialId={editTrialId ?? null} />}
    </BottomSheet>
  )
}

function FoodDetail({ foodId, editTrialId }: { foodId: string; editTrialId: string | null }) {
  const food = FOOD_BY_ID.get(foodId)!
  const { data, stats, age, today, allergenIntro, addTrial, updateTrial, deleteTrial } = useStore()
  const toast = useToast()
  const category = CATEGORY_BY_ID[food.category]
  const foodTrials = useMemo(
    () => data.trials.filter((t) => t.foodId === food.id).sort(compareTrialsDesc),
    [data.trials, food.id],
  )
  // 'new' = formulario de nueva prueba; id = editando esa prueba; null = solo ficha
  const [editing, setEditing] = useState<string | null>(() =>
    editTrialId && foodTrials.some((t) => t.id === editTrialId) ? editTrialId : null,
  )
  const [toDelete, setToDelete] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editing) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [editing])

  const suitable = isSuitable(food.minAge, age?.months ?? null)
  const editingTrial = editing && editing !== 'new' ? foodTrials.find((t) => t.id === editing) : undefined
  const allergens = food.allergens ?? []

  const save = (input: TrialInput) => {
    if (editingTrial) {
      updateTrial(editingTrial.id, input)
      toast.show('✓ Cambios guardados')
    } else {
      addTrial(input)
      toast.show(`✓ Prueba de ${food.name.toLowerCase()} guardada`)
    }
    setEditing(null)
  }

  const confirmDelete = () => {
    if (toDelete) deleteTrial(toDelete)
    if (toDelete === editing) setEditing(null)
    setToDelete(null)
    toast.show('Prueba eliminada')
  }

  return (
    <div className="flex flex-col gap-4 pt-1">
      <div className="flex items-center gap-4 pr-12">
        <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl text-5xl ${category.styles.soft}`} aria-hidden="true">
          {food.emoji}
        </span>
        <div className="min-w-0">
          <h2 className="text-2xl leading-tight font-black text-ink">{food.name}</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${category.styles.chip}`}>{category.name}</span>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-ink-soft ring-1 ring-line">
              Desde {MIN_AGE_LABEL[food.minAge]}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={visualStatus(stats.get(food.id))} />
        {food.iron && (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-bold text-rose-700 ring-1 ring-rose-200">
            🩸 Rico en hierro
          </span>
        )}
      </div>

      {suitable === false && age && (
        <p className="rounded-2xl bg-butter-100 p-3 text-sm font-semibold text-butter-700">
          ⏳ Con {formatAge(age)} aún es pronto: se recomienda a partir de {MIN_AGE_LABEL[food.minAge].replace(' m', ' meses')}.
        </p>
      )}

      {allergens.length > 0 && (
        <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
          <p className="mb-2 text-sm font-bold text-ink-soft">Contiene alérgenos</p>
          <AllergenChips allergens={allergens} />
          <ul className="mt-2 space-y-0.5 text-sm font-semibold text-ink-soft">
            {allergens.map((a) => {
              const date = allergenIntro.get(a)
              return (
                <li key={a}>
                  {date ? (
                    <span className="text-mint-700">✓ Introducido el {formatShort(date, today)}</span>
                  ) : (
                    <span>○ Aún no introducido: ofrécelo en casa, por la mañana y sin otros alérgenos nuevos.</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <section className="rounded-2xl bg-white p-4 ring-1 ring-line" aria-labelledby="prep-title">
        <h3 id="prep-title" className="font-extrabold text-ink">
          🔪 Cómo prepararlo
        </h3>
        {food.prep9m ? (
          <dl className="mt-2 space-y-3">
            <div>
              <dt className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Al empezar</dt>
              <dd className="font-semibold text-ink">{food.prep}</dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Con pinza (≈ 9+ meses)</dt>
              <dd className="font-semibold text-ink">{food.prep9m}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 font-semibold text-ink">{food.prep}</p>
        )}
      </section>

      {food.note && (
        <p className="rounded-2xl bg-amber-100 p-3 text-sm font-semibold text-amber-700">⚠️ {food.note}</p>
      )}

      {editing ? (
        <div ref={formRef} className="scroll-mt-4 rounded-3xl bg-lilac-100 p-4">
          <h3 className="mb-4 text-lg font-extrabold text-lilac-700">{editingTrial ? '✏️ Editar prueba' : '➕ Nueva prueba'}</h3>
          <TrialForm
            food={food}
            trials={data.trials}
            today={today}
            initial={editingTrial}
            minDate={data.profile?.birthDate || undefined}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
          {editingTrial && (
            <Button variant="ghost" block className="mt-2 text-rose-700" onClick={() => setToDelete(editingTrial.id)}>
              🗑️ Eliminar esta prueba
            </Button>
          )}
        </div>
      ) : (
        <Button block onClick={() => setEditing('new')} icon="➕" className="min-h-14 text-lg">
          Añadir prueba
        </Button>
      )}

      <section aria-labelledby="trials-title">
        <h3 id="trials-title" className="mb-2 font-extrabold text-ink">
          Pruebas ({foodTrials.length})
        </h3>
        {foodTrials.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-ink-soft ring-1 ring-line">
            Todavía no lo ha probado. Puede necesitar muchas exposiciones (¡hasta 10–15!) para aceptar un sabor nuevo.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {foodTrials.map((t) => (
              <li key={t.id}>
                <TrialItem trial={t} today={today} onClick={() => setEditing(t.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar esta prueba?"
        confirmLabel="Sí, eliminar"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        Esta acción no se puede deshacer.
      </ConfirmDialog>
    </div>
  )
}
