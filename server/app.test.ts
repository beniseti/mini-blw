import { describe, expect, it } from 'vitest'
import { createApp, MAX_OPS } from './app.ts'
import { openStore } from './db.ts'

function setup() {
  const { store } = openStore(':memory:')
  return createApp(store) // sin staticDir: solo API
}

// oxlint-disable-next-line typescript/no-explicit-any
const json = async (res: Response): Promise<any> => res.json()

const post = (body: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
})

describe('API', () => {
  it('GET /api/health', async () => {
    const res = await setup().request('/api/health')
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true })
  })

  it('POST /api/sync aplica operaciones y devuelve el estado completo', async () => {
    const app = setup()
    const res = await app.request(
      '/api/sync',
      post({
        ops: [
          {
            opId: '1',
            type: 'upsertTrial',
            trial: { id: 't1', foodId: 'huevo', date: '2026-11-06', liked: 'like', reaction: 'none', notes: '' },
          },
          { opId: '2', type: 'setProfile', profile: { name: 'Lucía', birthDate: '2026-04-01' } },
        ],
      }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await json(res)
    expect(body.applied).toBe(2)
    expect(body.data.trials).toHaveLength(1)
    expect(body.data.profile.name).toBe('Lucía')

    const data = await json(await app.request('/api/data'))
    expect(data.trials[0].foodId).toBe('huevo')
  })

  it('con ops vacío solo descarga datos', async () => {
    const res = await setup().request('/api/sync', post({ ops: [] }))
    expect((await json(res)).data.trials).toEqual([])
  })

  it('errores de petición', async () => {
    const app = setup()
    expect((await app.request('/api/sync', post('no es json'))).status).toBe(400)
    expect((await app.request('/api/sync', post({ nada: 1 }))).status).toBe(400)
    const many = Array.from({ length: MAX_OPS + 1 }, (_, i) => ({ opId: String(i), type: 'clearAll' }))
    expect((await app.request('/api/sync', post({ ops: many }))).status).toBe(413)
    expect((await app.request('/api/no-existe')).status).toBe(404)
  })

  it('cabeceras de seguridad', async () => {
    const res = await setup().request('/api/health')
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'")
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('strict-transport-security')).toBeNull()
  })
})
