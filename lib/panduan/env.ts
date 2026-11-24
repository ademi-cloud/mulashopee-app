export type PanduanEnv = {
  NOTION_TOKEN: string
  NOTION_PANDUAN_DB_ID: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export const missingConfig = (env: PanduanEnv) =>
  !env.NOTION_TOKEN || !env.NOTION_PANDUAN_DB_ID
    ? Response.json({ ralat: 'NOTION_TOKEN atau NOTION_PANDUAN_DB_ID belum ditetapkan di Cloudflare' }, { status: 500 })
    : null
