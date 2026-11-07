import { ALLERGEN_BY_ID, ALLERGEN_WAIT_DAYS } from '../../data/allergens'
import type { AllergenWarning as Warning } from '../../lib/allergenCheck'
import { addDays, formatShort } from '../../lib/dates'

function list(ids: string[]): string {
  const names = ids.map((id) => ALLERGEN_BY_ID[id as keyof typeof ALLERGEN_BY_ID].name.toLowerCase())
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`
}

function distance(diff: number): string {
  const n = Math.abs(diff)
  if (n === 0) return 'el mismo día'
  return `${n} ${n === 1 ? 'día' : 'días'} ${diff > 0 ? 'antes' : 'después'}`
}

/** Aviso (no bloqueante) al introducir un alérgeno nuevo demasiado pronto. */
export function AllergenWarning({ warning, date }: { warning: Warning; date: string }) {
  const latest = warning.recent.reduce<string | null>((max, r) => (!max || r.date > max ? r.date : max), null)
  return (
    <div role="alert" className="rounded-2xl bg-amber-100 p-4 text-amber-700 ring-1 ring-amber-300">
      <p className="flex items-center gap-2 font-extrabold">
        <span aria-hidden="true" className="text-xl">
          ⚠️
        </span>
        Nuevo alérgeno: {list(warning.newAllergens)}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold">
        {warning.recent.map((r) => (
          <li key={r.allergen}>
            {ALLERGEN_BY_ID[r.allergen].emoji} {ALLERGEN_BY_ID[r.allergen].name} se introdujo por primera vez el{' '}
            {formatShort(r.date)} ({distance(r.diffDays)}).
          </li>
        ))}
        {warning.multipleNew && <li>Este alimento introduce varios alérgenos nuevos a la vez.</li>}
      </ul>
      <p className="mt-2 text-sm">
        Se recomienda dejar al menos {ALLERGEN_WAIT_DAYS} días entre alérgenos nuevos para poder identificar qué causa
        una posible reacción.
        {latest && latest <= date && <> Lo ideal sería esperar hasta el {formatShort(addDays(latest, ALLERGEN_WAIT_DAYS))}.</>}
      </p>
      <p className="mt-1 text-xs font-semibold opacity-80">Puedes guardar la prueba igualmente.</p>
    </div>
  )
}
