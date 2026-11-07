import { resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { openStore } from './db.ts'
import { buildDemoData } from './demo.ts'

/**
 * Servidor de Bocaditos BLW: sirve la app y guarda los datos en SQLite.
 *
 * Variables de entorno:
 *   PORT            Puerto HTTP (por defecto 8080)
 *   DATA_DIR        Carpeta de la base de datos (por defecto ./data)
 *   DB_FILE         Nombre del archivo SQLite (por defecto bocaditos.db)
 *   STATIC_DIR      Carpeta de la app compilada (por defecto ./dist; vacío = solo API)
 *   SEED_DEMO_DATA  "true" para rellenar con datos de ejemplo al CREAR la base de datos
 *                   (equivale a pasar el argumento --seed-demo)
 */
const env = process.env
const port = Number(env.PORT) || 8080
const dataDir = resolve(env.DATA_DIR || './data')
const dbFile = resolve(dataDir, env.DB_FILE || 'bocaditos.db')
const staticDir = env.STATIC_DIR === '' ? undefined : resolve(env.STATIC_DIR || './dist')
const seedDemo = /^(1|true|yes|s[ií])$/i.test(env.SEED_DEMO_DATA ?? '') || process.argv.includes('--seed-demo')

function open() {
  try {
    return openStore(dbFile, { seed: seedDemo ? () => buildDemoData() : undefined })
  } catch (e) {
    console.error(`\n❌ No se puede abrir ni crear la base de datos ${dbFile}`)
    console.error(`   ${e instanceof Error ? e.message : String(e)}`)
    console.error(`   Comprueba que la carpeta ${dataDir} existe y que se puede escribir en ella.`)
    console.error('   Con Docker y DATA_PATH=./data, ejecuta en la carpeta del proyecto:')
    console.error('     sudo chown -R 1000:1000 data\n')
    process.exit(1)
  }
}
const { store, created, seeded, schemaVersion } = open()

if (created) {
  console.log(`🆕 Base de datos creada en ${dbFile} (esquema v${schemaVersion})`)
  console.log(seeded ? '🧪 Rellenada con datos de ejemplo (SEED_DEMO_DATA=true)' : '   Vacía, lista para usar')
} else {
  console.log(`🗄️  Usando la base de datos ${dbFile} (esquema v${schemaVersion})`)
}

const app = createApp(store, { staticDir })
const server = serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  const version = env.npm_package_version ? ` v${env.npm_package_version}` : ''
  console.log(`🥑 Bocaditos BLW${version} escuchando en http://localhost:${info.port}`)
  if (!staticDir) console.log('   (solo API: la app la sirve Vite en modo desarrollo)')
})

let closing = false
function shutdown(signal: string) {
  if (closing) return
  closing = true
  console.log(`\n${signal} recibido: cerrando…`)
  const exit = () => {
    try {
      store.close()
    } catch {
      // ya cerrada
    }
    process.exit(0)
  }
  server.close(exit)
  // Si alguna conexión se queda abierta, salimos igualmente.
  setTimeout(exit, 3000).unref()
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
