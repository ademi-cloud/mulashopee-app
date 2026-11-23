import type { CopyResult, LessonRow } from './publish'
import { serviceHeaders, type ServiceEnv } from './supabase'

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' }

const publicUrl = (env: ServiceEnv, path: string) => `${env.SUPABASE_URL}/storage/v1/object/public/panduan/${path}`

/** Nama tetap bagi fail Notion: sama untuk semua URL bertandatangan fail yang sama. */
export async function imageKey(url: string): Promise<string> {
  const u = new URL(url)
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(u.origin + u.pathname))
  return [...new Uint8Array(hash)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Gambar yang sudah ada dalam bucket `panduan` (folder img/). Kos: 1 request. */
export async function listExistingImages(env: ServiceEnv): Promise<Set<string>> {
  const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/list/panduan`, {
    method: 'POST',
    headers: { ...serviceHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: 'img', limit: 10000 }),
  })
  if (!res.ok) throw new Error(`Gagal baca senarai gambar (${res.status})`)
  return new Set(((await res.json()) as { name: string }[]).map((o) => `img/${o.name}`))
}

/**
 * Penyalin gambar dengan had request (pelan percuma Cloudflare: 50 setiap request).
 * Gambar sedia ada digunakan semula tanpa request; gambar baru kos 2 request.
 */
export function makeImageCopier(env: ServiceEnv, existing: Set<string>, budget: { left: number }) {
  return async (url: string): Promise<CopyResult> => {
    const path = `img/${await imageKey(url)}`
    if (existing.has(path)) return { src: publicUrl(env, path) }
    if (budget.left < 2) return { nanti: true }
    budget.left -= 2
    try {
      const src = await fetch(url)
      if (!src.ok) return { gagal: true }
      const type = (src.headers.get('Content-Type') ?? '').split(';')[0].trim()
      if (!EXT[type]) return { gagal: true }
      const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/panduan/${path}`, {
        method: 'POST',
        headers: { ...serviceHeaders(env), 'Content-Type': type, 'x-upsert': 'true' },
        body: await src.arrayBuffer(),
      })
      if (!res.ok) return { gagal: true }
      existing.add(path)
      return { src: publicUrl(env, path) }
    } catch {
      return { gagal: true }
    }
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
