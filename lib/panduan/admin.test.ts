import { afterEach, describe, expect, it, vi } from 'vitest'
import { requireAdmin } from './admin'

const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const req = (token?: string) => new Request('https://app/api/panduan/senarai', { headers: token ? { Authorization: `Bearer ${token}` } : {} })

afterEach(() => vi.unstubAllGlobals())

describe('requireAdmin', () => {
  it('returns a clear 500 when Supabase secrets are missing in this environment', async () => {
    const r = await requireAdmin(req('t'), { SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: undefined as unknown as string })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.response.status).toBe(500)
      expect(((await r.response.json()) as { ralat: string }).ralat).toContain('SUPABASE_SERVICE_ROLE_KEY')
    }
  })

  it('rejects missing token', async () => {
    const r = await requireAdmin(req(), env)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.response.status).toBe(403)
  })

  it('rejects invalid token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ msg: 'bad jwt' }, 401)))
    const r = await requireAdmin(req('t'), env)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.response.status).toBe(403)
  })

  it('rejects non-admin', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/auth/v1/user') ? json({ id: 'u1' }) : json([{ is_admin: false }]))))
    const r = await requireAdmin(req('t'), env)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.response.status).toBe(403)
  })

  it('accepts admin', async () => {
    const fetchMock = vi.fn(async (url: string) => (url.includes('/auth/v1/user') ? json({ id: 'u1' }) : json([{ is_admin: true }])))
    vi.stubGlobal('fetch', fetchMock)
    const r = await requireAdmin(req('t'), env)
    expect(r).toEqual({ ok: true, userId: 'u1' })
    expect(fetchMock.mock.calls[1][0]).toBe('https://sb.test/rest/v1/profiles?id=eq.u1&select=is_admin')
  })
})
