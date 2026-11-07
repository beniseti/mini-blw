import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { compress } from 'hono/compress'
import { secureHeaders } from 'hono/secure-headers'
import { isObject } from '../src/shared/validate.ts'
import type { Store } from './db.ts'

/** Máximo de operaciones por petición y tamaño máximo del cuerpo (una importación grande cabe de sobra). */
export const MAX_OPS = 5000
export const MAX_BODY_BYTES = 10 * 1024 * 1024

export interface AppOptions {
  /** Carpeta con la app compilada (dist). Si no existe, solo se sirve la API. */
  staticDir?: string
}

function cacheControlFor(path: string): string {
  if (/[\\/]assets[\\/]/.test(path)) return 'public, max-age=31536000, immutable'
  if (/(index\.html|sw\.js|manifest\.webmanifest|registerSW\.js)$/.test(path)) return 'no-cache'
  return 'public, max-age=86400'
}

export function createApp(store: Store, options: AppOptions = {}) {
  const app = new Hono()

  app.use(
    '*',
    secureHeaders({
      // HSTS lo debe poner el proxy HTTPS (si lo hay); aquí romperíamos el acceso por HTTP en la red local.
      strictTransportSecurity: false,
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    }),
  )
  app.use('*', compress())

  // ── API ──────────────────────────────────────────────────────
  app.get('/api/health', (c) => c.json({ ok: true }))

  app.get('/api/data', (c) => {
    c.header('Cache-Control', 'no-store')
    return c.json(store.snapshot())
  })

  app.post(
    '/api/sync',
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => c.json({ error: 'Petición demasiado grande' }, 413),
    }),
    async (c) => {
      let body: unknown
      try {
        body = await c.req.json()
      } catch {
        return c.json({ error: 'JSON no válido' }, 400)
      }
      if (!isObject(body) || !Array.isArray(body.ops)) return c.json({ error: 'Falta la lista "ops"' }, 400)
      if (body.ops.length > MAX_OPS) return c.json({ error: `Máximo ${MAX_OPS} operaciones por petición` }, 413)
      const result = store.applyOps(body.ops)
      c.header('Cache-Control', 'no-store')
      return c.json({ data: store.snapshot(), ...result })
    },
  )

  app.all('/api/*', (c) => c.json({ error: 'No encontrado' }, 404))

  // ── App compilada (PWA) ──────────────────────────────────────
  const dir = options.staticDir
  if (dir && existsSync(join(dir, 'index.html'))) {
    const setCache = (path: string, c: { header: (k: string, v: string) => void }) =>
      c.header('Cache-Control', cacheControlFor(path))
    app.use('*', serveStatic({ root: dir, onFound: setCache }))
    // La app usa rutas con #, pero cualquier otra ruta devuelve index.html.
    app.get('*', serveStatic({ path: join(dir, 'index.html'), onFound: setCache }))
  }

  app.onError((err, c) => {
    console.error('[error]', err)
    return c.json({ error: 'Error interno del servidor' }, 500)
  })

  return app
}
