import { serviceHeaders, type ServiceEnv } from './supabase'

const forbidden = () => Response.json({ ralat: 'admin sahaja' }, { status: 403 })

/** Pastikan pemanggil ialah admin Mula Shopee (token Supabase dalam header Authorization). */
export async function requireAdmin(
  request: Request,
  env: ServiceEnv,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, response: forbidden() }

  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: serviceHeaders(env).apikey, Authorization: `Bearer ${token}` },
  })
  if (!userRes.ok) return { ok: false, response: forbidden() }
  const user = (await userRes.json()) as { id?: string }
  if (!user.id) return { ok: false, response: forbidden() }

  const profRes = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=is_admin`, {
    headers: serviceHeaders(env),
  })
  const rows = profRes.ok ? ((await profRes.json()) as { is_admin?: boolean }[]) : []
  if (!rows[0]?.is_admin) return { ok: false, response: forbidden() }
  return { ok: true, userId: user.id }
}
