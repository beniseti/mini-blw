import { addDays, toISODate } from '../src/lib/dates.ts'
import type { Liked, Profile, Reaction, Trial } from '../src/types.ts'

/**
 * Datos de ejemplo para probar la app. Las fechas se calculan respecto al día de hoy
 * para que el bebé tenga ~7 meses y las pruebas parezcan recientes.
 */
const DEMO_TRIALS: [daysAgo: number, foodId: string, liked: Liked, reaction: Reaction, notes: string][] = [
  [38, 'brocoli', 'like', 'none', 'Lo chupó mucho, primera comida BLW'],
  [37, 'platano', 'like', 'none', ''],
  [35, 'calabaza', 'neutral', 'none', 'Asada en gajos'],
  [33, 'aguacate', 'dislike', 'none', 'Muchas arcadas, es normal al principio'],
  [30, 'merluza', 'like', 'none', 'Primera vez pescado, sin espinas'],
  [27, 'boniato', 'like', 'none', ''],
  [24, 'pan', 'like', 'none', 'Tiras tostadas con aceite'],
  [21, 'pera', 'like', 'none', ''],
  [18, 'fresas', 'like', 'mild', 'Rojeces alrededor de la boca; desaparecieron en 1 hora'],
  [15, 'yogur', 'like', 'none', 'Con cuchara precargada'],
  [12, 'lentejas', 'neutral', 'none', 'En hamburguesitas'],
  [9, 'calabacin', 'like', 'none', ''],
  [8, 'platano', 'like', 'none', 'Rebozado en avena para que no resbale'],
  [6, 'zanahoria', 'neutral', 'none', 'Bastones al vapor'],
  [4, 'pollo', 'like', 'none', 'Muslo desmigado'],
  [2, 'brocoli', 'like', 'none', ''],
  [1, 'huevo', 'like', 'none', 'Tortilla francesa en tiras'],
]

function monthsAgo(today: string, months: number, extraDays: number): string {
  const [y, m, d] = today.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1 - months, Math.min(d, 28)))
  return addDays(date.toISOString().slice(0, 10), -extraDays)
}

export function buildDemoData(today: string = toISODate()): { profile: Profile; trials: Trial[] } {
  return {
    profile: { name: 'Lucía (demo)', birthDate: monthsAgo(today, 7, 5) },
    trials: DEMO_TRIALS.map(([daysAgo, foodId, liked, reaction, notes], i) => {
      const date = addDays(today, -daysAgo)
      return {
        id: `demo-${String(i + 1).padStart(2, '0')}`,
        foodId,
        date,
        liked,
        reaction,
        notes,
        createdAt: `${date}T${String(10 + (i % 8)).padStart(2, '0')}:00:00.000Z`,
      }
    }),
  }
}
