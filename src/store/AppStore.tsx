import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { FOOD_BY_ID, FOODS } from '../data/foods'
import { firstIntroductions } from '../lib/allergenCheck'
import { getAge, type BabyAge } from '../lib/age'
import { toISODate } from '../lib/dates'
import { applyOp, applyOps } from '../lib/ops'
import { catchUpMoves, generatePlan, postponeMoves } from '../lib/plan'
import { computeFoodStats, type FoodStats } from '../lib/status'
import { newId } from '../lib/text'
import type { AllergenId, AppData, Profile, SyncOp, Trial } from '../types'
import { SyncError, syncWithServer } from './api'
import { loadLocal, saveLocal, type LocalState } from './storage'

export type TrialInput = Omit<Trial, 'id' | 'createdAt'>

type Action =
  /** Cambio hecho en este dispositivo: se aplica ya y se encola para el servidor. */
  | { type: 'local'; op: SyncOp }
  | { type: 'updateTrial'; opId: string; id: string; changes: TrialInput }
  /** El servidor confirmó las primeras `sent` operaciones y devolvió su estado. */
  | { type: 'synced'; sent: number; server: AppData; at: string }

function enqueue(state: LocalState, op: SyncOp): LocalState {
  return { ...state, data: applyOp(state.data, op), outbox: [...state.outbox, op] }
}

function reducer(state: LocalState, action: Action): LocalState {
  switch (action.type) {
    case 'local':
      return enqueue(state, action.op)
    case 'updateTrial': {
      const existing = state.data.trials.find((t) => t.id === action.id)
      if (!existing) return state
      return enqueue(state, { opId: action.opId, type: 'upsertTrial', trial: { ...existing, ...action.changes } })
    }
    case 'synced': {
      // Los cambios hechos mientras la petición estaba en vuelo se reaplican encima.
      const outbox = state.outbox.slice(action.sent)
      return { data: applyOps(action.server, outbox), outbox, lastSyncAt: action.at }
    }
  }
}

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error'

export interface SyncState {
  status: SyncStatus
  /** Cambios pendientes de enviar al servidor. */
  pending: number
  lastSyncAt: string | null
  error: string | null
}

interface AppStore {
  data: AppData
  /** Fecha de hoy (YYYY-MM-DD), se actualiza si la app sigue abierta al cambiar de día. */
  today: string
  age: BabyAge | null
  stats: Map<string, FoodStats>
  allergenIntro: Map<AllergenId, string>
  sync: SyncState
  syncNow: () => void
  setProfile: (profile: Profile | null) => void
  addTrial: (input: TrialInput) => void
  updateTrial: (id: string, changes: TrialInput) => void
  deleteTrial: (id: string) => void
  replaceAll: (data: AppData) => void
  markExported: () => void
  clearAll: () => void
  /** Crea (o rehace) el plan desde `startDate`. Conserva los alimentos del plan ya probados. Devuelve cuántos planifica. */
  createPlan: (perDay: 1 | 2, startDate: string) => number
  /** Aplaza un día los alimentos pendientes de `date` y de los días siguientes. */
  postponePlanDay: (date: string) => number
  /** Pasa a hoy los días atrasados (desplaza todo lo pendiente). */
  catchUpPlan: () => number
  removePlanItem: (id: string) => void
  clearPlan: () => void
}

function triedChecker(data: AppData): (foodId: string) => boolean {
  const tried = new Set(data.trials.map((t) => t.foodId))
  return (foodId) => tried.has(foodId)
}

const StoreContext = createContext<AppStore | null>(null)

function useToday(): string {
  const [today, setToday] = useState(toISODate)
  useEffect(() => {
    const check = () => setToday(toISODate())
    const id = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
  return today
}

const RETRY_DELAYS = [3_000, 10_000, 30_000, 60_000]
const REFRESH_EVERY = 60_000

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadLocal)
  const [phase, setPhase] = useState<'idle' | 'syncing' | 'offline' | 'error'>('syncing')
  const [syncError, setSyncError] = useState<string | null>(null)
  const today = useToday()

  const stateRef = useRef(state)
  const inFlight = useRef(false)
  const again = useRef(false)
  const retryTimer = useRef<number | undefined>(undefined)
  const retryIndex = useRef(0)

  useEffect(() => {
    stateRef.current = state
    saveLocal(state)
  }, [state])

  /** Envía la cola al servidor y trae su estado. Nunca hay dos peticiones a la vez. */
  const runSync = useCallback(async function run(): Promise<void> {
    if (inFlight.current) {
      again.current = true
      return
    }
    inFlight.current = true
    window.clearTimeout(retryTimer.current)
    const ops = stateRef.current.outbox
    setPhase('syncing')
    try {
      const res = await syncWithServer(ops)
      dispatch({ type: 'synced', sent: ops.length, server: res.data, at: new Date().toISOString() })
      retryIndex.current = 0
      setSyncError(null)
      setPhase('idle')
    } catch (e) {
      const offline = e instanceof SyncError ? e.offline : true
      setPhase(offline ? 'offline' : 'error')
      setSyncError(e instanceof Error ? e.message : String(e))
      const delay = RETRY_DELAYS[Math.min(retryIndex.current, RETRY_DELAYS.length - 1)]
      retryIndex.current += 1
      retryTimer.current = window.setTimeout(() => void run(), delay)
    } finally {
      inFlight.current = false
      if (again.current) {
        again.current = false
        void run()
      }
    }
  }, [])

  const syncNow = useCallback(() => {
    retryIndex.current = 0
    void runSync()
  }, [runSync])

  // Al arrancar, al recuperar la conexión, al volver a la app y cada minuto.
  useEffect(() => {
    // Sincronizar con un sistema externo (el servidor) es justo el uso previsto de un efecto.
    // oxlint-disable-next-line react/set-state-in-effect
    void runSync()
    const onOnline = () => syncNow()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void runSync()
    }
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void runSync()
    }, REFRESH_EVERY)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(retryTimer.current)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [runSync, syncNow])

  // Envía los cambios locales poco después de hacerlos (agrupa varios seguidos).
  const pending = state.outbox.length
  useEffect(() => {
    if (pending === 0) return
    const t = window.setTimeout(() => void runSync(), 300)
    return () => window.clearTimeout(t)
  }, [pending, runSync])

  const local = useCallback((op: SyncOp) => dispatch({ type: 'local', op }), [])
  const setProfile = useCallback(
    (profile: Profile | null) => local({ opId: newId(), type: 'setProfile', profile }),
    [local],
  )
  const addTrial = useCallback(
    (input: TrialInput) =>
      local({ opId: newId(), type: 'upsertTrial', trial: { ...input, id: newId(), createdAt: new Date().toISOString() } }),
    [local],
  )
  const updateTrial = useCallback(
    (id: string, changes: TrialInput) => dispatch({ type: 'updateTrial', opId: newId(), id, changes }),
    [],
  )
  const deleteTrial = useCallback((id: string) => local({ opId: newId(), type: 'deleteTrial', id }), [local])
  const replaceAll = useCallback(
    (next: AppData) =>
      local({ opId: newId(), type: 'replaceAll', profile: next.profile, trials: next.trials, plan: next.plan }),
    [local],
  )
  const markExported = useCallback(
    () => local({ opId: newId(), type: 'markExported', at: new Date().toISOString() }),
    [local],
  )
  const clearAll = useCallback(() => local({ opId: newId(), type: 'clearAll' }), [local])

  const createPlan = useCallback(
    (perDay: 1 | 2, startDate: string) => {
      const d = stateRef.current.data
      const isTried = triedChecker(d)
      const items = generatePlan({
        foods: FOODS,
        tried: new Set(d.trials.map((t) => t.foodId)),
        allergenIntro: firstIntroductions(d.trials, FOOD_BY_ID),
        birthDate: d.profile?.birthDate || null,
        perDay,
        startDate,
        newId,
      })
      // Lo ya probado se queda como historial del plan.
      const done = d.plan.items.filter((i) => isTried(i.foodId))
      local({ opId: newId(), type: 'replacePlan', plan: { perDay, items: [...done, ...items] } })
      return items.length
    },
    [local],
  )
  const movePlan = useCallback(
    (moves: { id: string; date: string }[]) => {
      if (moves.length > 0) local({ opId: newId(), type: 'movePlanItems', moves })
      return moves.length
    },
    [local],
  )
  const postponePlanDay = useCallback(
    (date: string) => {
      const d = stateRef.current.data
      return movePlan(postponeMoves(d.plan, triedChecker(d), date, 1))
    },
    [movePlan],
  )
  const catchUpPlan = useCallback(() => {
    const d = stateRef.current.data
    return movePlan(catchUpMoves(d.plan, triedChecker(d), toISODate()))
  }, [movePlan])
  const removePlanItem = useCallback((id: string) => local({ opId: newId(), type: 'deletePlanItem', id }), [local])
  const clearPlan = useCallback(
    () => local({ opId: newId(), type: 'replacePlan', plan: { perDay: stateRef.current.data.plan.perDay, items: [] } }),
    [local],
  )

  const data = state.data
  const stats = useMemo(() => computeFoodStats(data.trials), [data.trials])
  const allergenIntro = useMemo(() => firstIntroductions(data.trials, FOOD_BY_ID), [data.trials])
  const age = useMemo(
    () => (data.profile?.birthDate ? getAge(data.profile.birthDate, today) : null),
    [data.profile, today],
  )

  const sync = useMemo<SyncState>(() => {
    const status: SyncStatus =
      phase === 'syncing' ? 'syncing' : phase === 'offline' ? 'offline' : phase === 'error' ? 'error' : pending > 0 ? 'pending' : 'synced'
    return { status, pending, lastSyncAt: state.lastSyncAt, error: syncError }
  }, [phase, pending, state.lastSyncAt, syncError])

  const value = useMemo<AppStore>(
    () => ({
      data,
      today,
      age,
      stats,
      allergenIntro,
      sync,
      syncNow,
      setProfile,
      addTrial,
      updateTrial,
      deleteTrial,
      replaceAll,
      markExported,
      clearAll,
      createPlan,
      postponePlanDay,
      catchUpPlan,
      removePlanItem,
      clearPlan,
    }),
    [
      data,
      today,
      age,
      stats,
      allergenIntro,
      sync,
      syncNow,
      setProfile,
      addTrial,
      updateTrial,
      deleteTrial,
      replaceAll,
      markExported,
      clearAll,
      createPlan,
      postponePlanDay,
      catchUpPlan,
      removePlanItem,
      clearPlan,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useStore(): AppStore {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore debe usarse dentro de <AppStoreProvider>')
  return ctx
}
