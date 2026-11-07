import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { emptyPlan, parseOp } from '../src/shared/validate.ts'
import type { AppData, MealPlan, Profile, SyncOp, Trial } from '../src/types.ts'

/**
 * Migraciones del esquema. Se aplican en orden y se guarda la versión en
 * `PRAGMA user_version`. Para cambiar el esquema, AÑADE una nueva entrada al final
 * (nunca modifiques las anteriores).
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE profile (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    name        TEXT NOT NULL,
    birth_date  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE trials (
    id          TEXT PRIMARY KEY,
    food_id     TEXT NOT NULL,
    date        TEXT NOT NULL,
    liked       TEXT NOT NULL CHECK (liked IN ('like', 'neutral', 'dislike')),
    reaction    TEXT NOT NULL CHECK (reaction IN ('none', 'mild', 'severe')),
    notes       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
  CREATE INDEX trials_date_idx ON trials (date);
  CREATE INDEX trials_food_idx ON trials (food_id);

  -- Pruebas borradas: evita que un móvil que estaba sin conexión las "resucite".
  CREATE TABLE deleted_trials (
    id          TEXT PRIMARY KEY,
    deleted_at  TEXT NOT NULL
  );

  -- Operaciones ya aplicadas: reenviar la misma operación no la repite.
  CREATE TABLE applied_ops (
    op_id       TEXT PRIMARY KEY,
    applied_at  TEXT NOT NULL
  );

  CREATE TABLE meta (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL
  );
  `,
  // v2: plan de comidas
  `
  CREATE TABLE plan_items (
    id          TEXT PRIMARY KEY,
    food_id     TEXT NOT NULL,
    date        TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX plan_items_date_idx ON plan_items (date);
  `,
  // v3: marcar una prueba como "volver a probar"
  `
  ALTER TABLE trials ADD COLUMN retry INTEGER NOT NULL DEFAULT 0;
  `,
]

/** Las operaciones aplicadas se recuerdan 30 días (de sobra para cualquier reintento). */
const APPLIED_OPS_TTL_MS = 30 * 24 * 60 * 60 * 1000

export interface ApplyResult {
  applied: number
  rejected: number
}

export interface Store {
  /** Estado completo (perfil + pruebas). */
  snapshot(): AppData
  /** Aplica operaciones en una única transacción. Las inválidas se descartan. */
  applyOps(ops: unknown[]): ApplyResult
  close(): void
}

export interface OpenResult {
  store: Store
  /** La base de datos no existía y se ha creado ahora. */
  created: boolean
  /** Se han insertado datos de ejemplo. */
  seeded: boolean
  schemaVersion: number
}

interface ProfileRow {
  name: string
  birth_date: string
}
interface PlanRow {
  id: string
  food_id: string
  date: string
}
interface TrialRow {
  id: string
  food_id: string
  date: string
  liked: Trial['liked']
  reaction: Trial['reaction']
  notes: string
  retry: number
  created_at: string
}

function migrate(db: DatabaseSync): number {
  const current = Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version)
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN')
    try {
      db.exec(MIGRATIONS[v])
      db.exec(`PRAGMA user_version = ${v + 1}`)
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }
  return MIGRATIONS.length
}

export interface OpenOptions {
  /** Datos con los que inicializar una base de datos nueva (p. ej. datos de ejemplo). */
  seed?: () => { profile: Profile | null; trials: Trial[] }
}

/**
 * Abre (o crea) la base de datos SQLite. Si el archivo no existía, crea el esquema
 * y, si se indica `seed`, la rellena con esos datos la primera vez.
 */
export function openStore(file: string, options: OpenOptions = {}): OpenResult {
  const inMemory = file === ':memory:'
  const created = inMemory || !existsSync(file)
  if (!inMemory) mkdirSync(dirname(file), { recursive: true })

  const db = new DatabaseSync(file)
  db.exec('PRAGMA busy_timeout = 5000')
  db.exec('PRAGMA foreign_keys = ON')
  const schemaVersion = migrate(db)

  const q = {
    getProfile: db.prepare('SELECT name, birth_date FROM profile WHERE id = 1'),
    upsertProfile: db.prepare(`
      INSERT INTO profile (id, name, birth_date, updated_at) VALUES (1, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET name = excluded.name, birth_date = excluded.birth_date, updated_at = excluded.updated_at`),
    insertProfileIfMissing: db.prepare('INSERT OR IGNORE INTO profile (id, name, birth_date, updated_at) VALUES (1, ?, ?, ?)'),
    deleteProfile: db.prepare('DELETE FROM profile'),
    listTrials: db.prepare(
      'SELECT id, food_id, date, liked, reaction, notes, retry, created_at FROM trials ORDER BY date, created_at',
    ),
    isDeleted: db.prepare('SELECT 1 AS x FROM deleted_trials WHERE id = ?'),
    upsertTrial: db.prepare(`
      INSERT INTO trials (id, food_id, date, liked, reaction, notes, retry, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        food_id = excluded.food_id, date = excluded.date, liked = excluded.liked,
        reaction = excluded.reaction, notes = excluded.notes, retry = excluded.retry,
        updated_at = excluded.updated_at`),
    deleteTrial: db.prepare('DELETE FROM trials WHERE id = ?'),
    tombstone: db.prepare('INSERT OR IGNORE INTO deleted_trials (id, deleted_at) VALUES (?, ?)'),
    tombstoneAll: db.prepare('INSERT OR IGNORE INTO deleted_trials (id, deleted_at) SELECT id, ? FROM trials'),
    untombstone: db.prepare('DELETE FROM deleted_trials WHERE id = ?'),
    deleteAllTrials: db.prepare('DELETE FROM trials'),
    opSeen: db.prepare('SELECT 1 AS x FROM applied_ops WHERE op_id = ?'),
    recordOp: db.prepare('INSERT INTO applied_ops (op_id, applied_at) VALUES (?, ?)'),
    pruneOps: db.prepare('DELETE FROM applied_ops WHERE applied_at < ?'),
    getMeta: db.prepare('SELECT value FROM meta WHERE key = ?'),
    setMeta: db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value'),
    deleteMeta: db.prepare('DELETE FROM meta WHERE key = ?'),
    listPlan: db.prepare('SELECT id, food_id, date FROM plan_items ORDER BY date, rowid'),
    insertPlanItem: db.prepare('INSERT OR REPLACE INTO plan_items (id, food_id, date, created_at) VALUES (?, ?, ?, ?)'),
    movePlanItem: db.prepare('UPDATE plan_items SET date = ? WHERE id = ?'),
    deletePlanItem: db.prepare('DELETE FROM plan_items WHERE id = ?'),
    deleteAllPlan: db.prepare('DELETE FROM plan_items'),
  }

  const writePlan = (plan: MealPlan, now: string) => {
    q.deleteAllPlan.run()
    for (const item of plan.items) q.insertPlanItem.run(item.id, item.foodId, item.date, now)
    q.setMeta.run('plan_per_day', String(plan.perDay))
  }

  const writeTrial = (t: Trial, now: string) =>
    q.upsertTrial.run(t.id, t.foodId, t.date, t.liked, t.reaction, t.notes, t.retry ? 1 : 0, t.createdAt, now)

  function apply(op: SyncOp, now: string): void {
    switch (op.type) {
      case 'upsertTrial':
        // Si otro dispositivo la borró, el borrado gana.
        if (!q.isDeleted.get(op.trial.id)) writeTrial(op.trial, now)
        return
      case 'deleteTrial':
        q.deleteTrial.run(op.id)
        q.tombstone.run(op.id, now)
        return
      case 'setProfile':
        if (op.profile) q.upsertProfile.run(op.profile.name, op.profile.birthDate, now)
        else q.deleteProfile.run()
        return
      case 'mergeProfile':
        q.insertProfileIfMissing.run(op.profile.name, op.profile.birthDate, now)
        return
      case 'replaceAll':
        q.tombstoneAll.run(now)
        q.deleteAllTrials.run()
        for (const t of op.trials) {
          q.untombstone.run(t.id)
          writeTrial(t, now)
        }
        if (op.profile) q.upsertProfile.run(op.profile.name, op.profile.birthDate, now)
        else q.deleteProfile.run()
        if (op.plan) writePlan(op.plan, now)
        return
      case 'clearAll':
        q.tombstoneAll.run(now)
        q.deleteAllTrials.run()
        q.deleteProfile.run()
        q.deleteAllPlan.run()
        q.deleteMeta.run('last_export_at')
        q.deleteMeta.run('plan_per_day')
        return
      case 'markExported':
        q.setMeta.run('last_export_at', op.at)
        return
      case 'replacePlan':
        writePlan(op.plan, now)
        return
      case 'movePlanItems':
        for (const m of op.moves) q.movePlanItem.run(m.date, m.id)
        return
      case 'deletePlanItem':
        q.deletePlanItem.run(op.id)
        return
    }
  }

  const store: Store = {
    snapshot() {
      const p = q.getProfile.get() as ProfileRow | undefined
      const trials = (q.listTrials.all() as unknown as TrialRow[]).map(
        (r): Trial => ({
          id: r.id,
          foodId: r.food_id,
          date: r.date,
          liked: r.liked,
          reaction: r.reaction,
          notes: r.notes,
          retry: r.retry === 1,
          createdAt: r.created_at,
        }),
      )
      const exported = q.getMeta.get('last_export_at') as { value: string } | undefined
      const perDay = q.getMeta.get('plan_per_day') as { value: string } | undefined
      const items = (q.listPlan.all() as unknown as PlanRow[]).map((r) => ({ id: r.id, foodId: r.food_id, date: r.date }))
      return {
        version: 1,
        profile: p ? { name: p.name, birthDate: p.birth_date } : null,
        trials,
        lastExportAt: exported?.value ?? null,
        plan: { perDay: perDay?.value === '1' ? 1 : emptyPlan().perDay, items },
      }
    },

    applyOps(rawOps) {
      const now = new Date().toISOString()
      let applied = 0
      let rejected = 0
      db.exec('BEGIN IMMEDIATE')
      try {
        for (const raw of rawOps) {
          const op = parseOp(raw)
          if (!op) {
            rejected++
            continue
          }
          if (q.opSeen.get(op.opId)) continue // ya aplicada en un envío anterior
          apply(op, now)
          q.recordOp.run(op.opId, now)
          applied++
        }
        q.pruneOps.run(new Date(Date.now() - APPLIED_OPS_TTL_MS).toISOString())
        db.exec('COMMIT')
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
      return { applied, rejected }
    },

    close() {
      db.close()
    },
  }

  let seeded = false
  if (created && options.seed) {
    const { profile, trials } = options.seed()
    store.applyOps([{ opId: 'seed-demo', type: 'replaceAll', profile, trials }])
    seeded = true
  }

  return { store, created, seeded, schemaVersion }
}
