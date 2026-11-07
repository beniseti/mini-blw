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
import { FOOD_BY_ID } from '../data/foods'
import { firstIntroductions } from '../lib/allergenCheck'
import { getAge, type BabyAge } from '../lib/age'
import { toISODate } from '../lib/dates'
import { computeFoodStats, type FoodStats } from '../lib/status'
import { newId } from '../lib/text'
import type { AllergenId, AppData, Profile, Trial } from '../types'
import { emptyData, loadData, saveData } from './storage'

export type TrialInput = Omit<Trial, 'id' | 'createdAt'>

type Action =
  | { type: 'setProfile'; profile: Profile | null }
  | { type: 'addTrial'; trial: Trial }
  | { type: 'updateTrial'; id: string; changes: TrialInput }
  | { type: 'deleteTrial'; id: string }
  | { type: 'replaceAll'; data: AppData }
  | { type: 'markExported'; at: string }
  | { type: 'clearAll' }

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'setProfile':
      return { ...state, profile: action.profile }
    case 'addTrial':
      return { ...state, trials: [...state.trials, action.trial] }
    case 'updateTrial':
      return {
        ...state,
        trials: state.trials.map((t) => (t.id === action.id ? { ...t, ...action.changes } : t)),
      }
    case 'deleteTrial':
      return { ...state, trials: state.trials.filter((t) => t.id !== action.id) }
    case 'replaceAll':
      return action.data
    case 'markExported':
      return { ...state, lastExportAt: action.at }
    case 'clearAll':
      return emptyData()
  }
}

interface AppStore {
  data: AppData
  /** Fecha de hoy (YYYY-MM-DD), se actualiza si la app sigue abierta al cambiar de día. */
  today: string
  age: BabyAge | null
  stats: Map<string, FoodStats>
  allergenIntro: Map<AllergenId, string>
  storageOk: boolean
  setProfile: (profile: Profile | null) => void
  addTrial: (input: TrialInput) => Trial
  updateTrial: (id: string, changes: TrialInput) => void
  deleteTrial: (id: string) => void
  replaceAll: (data: AppData) => void
  markExported: () => void
  clearAll: () => void
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

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, loadData)
  const [storageOk, setStorageOk] = useState(true)
  const today = useToday()
  const persistRequested = useRef(false)

  useEffect(() => {
    // Sincroniza con un sistema externo (localStorage) y refleja si se pudo guardar.
    // oxlint-disable-next-line react/set-state-in-effect
    setStorageOk(saveData(data))
    // Pide al navegador que no borre los datos automáticamente (sobre todo en iOS).
    if (data.trials.length > 0 && !persistRequested.current) {
      persistRequested.current = true
      navigator.storage?.persist?.().catch(() => undefined)
    }
  }, [data])

  const setProfile = useCallback((profile: Profile | null) => dispatch({ type: 'setProfile', profile }), [])
  const addTrial = useCallback((input: TrialInput) => {
    const trial: Trial = { ...input, id: newId(), createdAt: new Date().toISOString() }
    dispatch({ type: 'addTrial', trial })
    return trial
  }, [])
  const updateTrial = useCallback(
    (id: string, changes: TrialInput) => dispatch({ type: 'updateTrial', id, changes }),
    [],
  )
  const deleteTrial = useCallback((id: string) => dispatch({ type: 'deleteTrial', id }), [])
  const replaceAll = useCallback((next: AppData) => dispatch({ type: 'replaceAll', data: next }), [])
  const markExported = useCallback(() => dispatch({ type: 'markExported', at: new Date().toISOString() }), [])
  const clearAll = useCallback(() => dispatch({ type: 'clearAll' }), [])

  const stats = useMemo(() => computeFoodStats(data.trials), [data.trials])
  const allergenIntro = useMemo(() => firstIntroductions(data.trials, FOOD_BY_ID), [data.trials])
  const age = useMemo(
    () => (data.profile?.birthDate ? getAge(data.profile.birthDate, today) : null),
    [data.profile, today],
  )

  const value = useMemo<AppStore>(
    () => ({
      data,
      today,
      age,
      stats,
      allergenIntro,
      storageOk,
      setProfile,
      addTrial,
      updateTrial,
      deleteTrial,
      replaceAll,
      markExported,
      clearAll,
    }),
    [data, today, age, stats, allergenIntro, storageOk, setProfile, addTrial, updateTrial, deleteTrial, replaceAll, markExported, clearAll],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useStore(): AppStore {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore debe usarse dentro de <AppStoreProvider>')
  return ctx
}
