export type ServiceEnv = { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }

/**
 * Header untuk panggilan Supabase dengan service key.
 * Key baru (sb_secret_...) hanya dalam `apikey`; key lama (JWT) juga dalam `Authorization`.
 */
export function serviceHeaders(env: ServiceEnv): Record<string, string> {
  const key = env.SUPABASE_SERVICE_ROLE_KEY.trim()
  return key.startsWith('sb_') ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` }
}
