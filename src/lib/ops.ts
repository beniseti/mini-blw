import { emptyPlan } from '../shared/validate'
import type { AppData, SyncOp } from '../types'

/**
 * Aplica una operación a los datos locales. Es la misma semántica que aplica el
 * servidor en SQLite, para que la app muestre el cambio al instante (incluso sin
 * conexión) mientras la operación espera en la cola.
 */
export function applyOp(data: AppData, op: SyncOp): AppData {
  switch (op.type) {
    case 'upsertTrial': {
      const exists = data.trials.some((t) => t.id === op.trial.id)
      return {
        ...data,
        trials: exists
          ? data.trials.map((t) => (t.id === op.trial.id ? { ...op.trial, createdAt: t.createdAt } : t))
          : [...data.trials, op.trial],
      }
    }
    case 'deleteTrial':
      return { ...data, trials: data.trials.filter((t) => t.id !== op.id) }
    case 'setProfile':
      return { ...data, profile: op.profile }
    case 'mergeProfile':
      return data.profile ? data : { ...data, profile: op.profile }
    case 'replaceAll':
      return { ...data, profile: op.profile, trials: op.trials, plan: op.plan ?? data.plan }
    case 'clearAll':
      return { version: 1, profile: null, trials: [], lastExportAt: null, plan: emptyPlan() }
    case 'markExported':
      return { ...data, lastExportAt: op.at }
    case 'replacePlan':
      return { ...data, plan: op.plan }
    case 'addPlanItems': {
      const ids = new Set(op.items.map((i) => i.id))
      return { ...data, plan: { ...data.plan, items: [...data.plan.items.filter((i) => !ids.has(i.id)), ...op.items] } }
    }
    case 'movePlanItems': {
      const moves = new Map(op.moves.map((m) => [m.id, m.date]))
      return {
        ...data,
        plan: { ...data.plan, items: data.plan.items.map((i) => (moves.has(i.id) ? { ...i, date: moves.get(i.id)! } : i)) },
      }
    }
    case 'deletePlanItem':
      return { ...data, plan: { ...data.plan, items: data.plan.items.filter((i) => i.id !== op.id) } }
  }
}

export function applyOps(data: AppData, ops: SyncOp[]): AppData {
  return ops.reduce(applyOp, data)
}
