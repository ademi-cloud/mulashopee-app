import { serviceHeaders, type ServiceEnv } from './supabase'

const fail = (status: number, ralat: string) => ({ ok: false as const, response: Response.json({ ralat }, { status }) })

/** Pastikan pemanggil ialah admin Mula Shopee (token Supabase dalam header Authorization). */
export async function requireAdmin(
  request: Request,
  env: ServiceEnv,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return fail(500, 'SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum ditetapkan untuk environment ini di Cloudflare (semak Production dan Preview)')
  }
  if (env.SUPABASE_SERVICE_ROLE_KEY.trim().startsWith('sb_publishable_')) {
    return fail(500, 'SUPABASE_SERVICE_ROLE_KEY di Cloudflare ialah key publishable — perlu key secret (sb_secret_...) dari Supabase → Project Settings → API Keys')
  }
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return fail(403, 'admin sahaja — tiada sesi log masuk')

  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: serviceHeaders(env).apikey, Authorization: `Bearer ${token}` },
  })
  if (!userRes.ok) return fail(403, `Sesi log masuk tidak diterima oleh Supabase (${userRes.status}) — log keluar dan log masuk semula`)
  const user = (await userRes.json()) as { id?: string }
  if (!user.id) return fail(403, 'Sesi log masuk tidak sah — log keluar dan log masuk semula')

  const profRes = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=is_admin`, {
    headers: serviceHeaders(env),
  })
  if (!profRes.ok) return fail(500, `Semakan admin gagal (Supabase ${profRes.status}) — semak SUPABASE_SERVICE_ROLE_KEY di Cloudflare`)
  const rows = (await profRes.json()) as { is_admin?: boolean }[]
  if (!rows.length) return fail(500, 'Profil tidak dijumpai — kemungkinan SUPABASE_SERVICE_ROLE_KEY bukan key secret, atau SUPABASE_URL projek lain')
  if (!rows[0].is_admin) return fail(403, 'admin sahaja — akaun ini bukan admin')
  return { ok: true, userId: user.id }
}
