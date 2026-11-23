import type { LessonRow } from './publish'
import { serviceHeaders, type ServiceEnv } from './supabase'

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' }

/** Muat turun gambar Notion dan simpan dalam bucket `panduan` dengan nama rawak. */
export async function uploadImage(env: ServiceEnv, url: string): Promise<string | null> {
  try {
    const src = await fetch(url)
    if (!src.ok) return null
    const type = (src.headers.get('Content-Type') ?? '').split(';')[0].trim()
    const ext = EXT[type]
    if (!ext) return null
    const name = `${crypto.randomUUID()}.${ext}`
    const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/panduan/${name}`, {
      method: 'POST',
      headers: { ...serviceHeaders(env), 'Content-Type': type },
      body: await src.arrayBuffer(),
    })
    return res.ok ? `${env.SUPABASE_URL}/storage/v1/object/public/panduan/${name}` : null
  } catch {
    return null
  }
}

export async function upsertLesson(env: ServiceEnv, row: LessonRow): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/lessons?on_conflict=notion_page_id`, {
    method: 'POST',
    headers: { ...serviceHeaders(env), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`Gagal simpan panduan (${res.status}): ${(await res.text()).slice(0, 200)}`)
}

export type AppGuide = { notion_page_id: string; notion_edited_at: string | null; published: boolean }

export async function listAppGuides(env: ServiceEnv): Promise<AppGuide[]> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/lessons?kind=eq.panduan&select=notion_page_id,notion_edited_at,published`, {
    headers: serviceHeaders(env),
  })
  if (!res.ok) throw new Error(`Gagal baca panduan app (${res.status})`)
  return (await res.json()) as AppGuide[]
}

export async function unpublish(env: ServiceEnv, pageIds: string[]): Promise<void> {
  if (!pageIds.length) return
  const list = pageIds.map((id) => `"${id}"`).join(',')
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/lessons?notion_page_id=in.(${encodeURIComponent(list)})`, {
    method: 'PATCH',
    headers: { ...serviceHeaders(env), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ published: false }),
  })
  if (!res.ok) throw new Error(`Gagal tarik balik (${res.status})`)
}
