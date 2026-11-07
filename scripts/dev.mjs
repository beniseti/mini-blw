// Arranca a la vez el servidor API (SQLite) y Vite en modo desarrollo.
//   - API:  http://localhost:8787  (se reinicia sola al cambiar server/)
//   - App:  http://localhost:5173  (Vite redirige /api al servidor)
// La base de datos de desarrollo se crea en ./data/bocaditos.db con datos de ejemplo.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const apiPort = process.env.API_PORT || '8787'

const children = [
  spawn(process.execPath, ['--watch', '--disable-warning=ExperimentalWarning', 'server/index.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: apiPort,
      DATA_DIR: process.env.DATA_DIR || 'data',
      STATIC_DIR: '',
      SEED_DEMO_DATA: process.env.SEED_DEMO_DATA ?? 'true',
    },
  }),
  spawn(process.execPath, [viteBin, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, API_PORT: apiPort },
  }),
]

let exiting = false
for (const child of children) {
  child.on('exit', (code) => {
    if (exiting) return
    exiting = true
    for (const other of children) if (other !== child && other.exitCode === null) other.kill()
    process.exit(code ?? 0)
  })
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    exiting = true
    for (const child of children) if (child.exitCode === null) child.kill(signal)
  })
}
