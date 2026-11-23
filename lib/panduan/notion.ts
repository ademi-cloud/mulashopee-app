import type { NotionBlock } from './types'

const API = 'https://api.notion.com/v1'

export type NotionPage = {
  id: string
  lastEdited: string
  title: string
  summary: string
  module: string
  productName: string | null
  order: number
  status: string | null
}

async function notion<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(`Notion ${res.status}: ${body.message ?? 'ralat tidak diketahui'}`)
  }
  return (await res.json()) as T
}

type Prop = { type: string; [k: string]: unknown }
const plain = (arr: unknown) => ((arr as { plain_text?: string }[]) ?? []).map((t) => t.plain_text ?? '').join('')

function toPage(raw: { id: string; last_edited_time: string; properties: Record<string, Prop> }): NotionPage {
  const p = raw.properties
  const select = (name: string) => ((p[name]?.select as { name?: string } | null) ?? null)?.name ?? null
  return {
    id: raw.id,
    lastEdited: raw.last_edited_time,
    title: plain(p.Tajuk?.title),
    summary: plain(p.Ringkasan?.rich_text),
    module: select('Modul') ?? '',
    productName: select('Produk'),
    order: (p.Susunan?.number as number | null) ?? 0,
    status: select('Status'),
  }
}

/** Semua baris database Panduan (semua status). */
export async function queryPanduan(token: string, dbId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = []
  let cursor: string | undefined
  do {
    const res = await notion<{ results: never[]; has_more: boolean; next_cursor: string | null }>(token, `/databases/${dbId}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    })
    pages.push(...res.results.map(toPage))
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)
  return pages
}

export async function getPage(token: string, pageId: string): Promise<NotionPage> {
  return toPage(await notion(token, `/pages/${pageId}`))
}

// Anak block ini tidak dipaparkan (lihat convert.ts), jadi jangan bazirkan request.
const NO_DESCEND = new Set(['child_page', 'child_database', 'column_list', 'column', 'synced_block'])

/** Semua block dalam halaman/block, termasuk anak (rekursif, ikut pagination). */
export async function fetchBlocks(token: string, blockId: string, stats: { requests: number } = { requests: 0 }): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = []
  let cursor: string | undefined
  do {
    const q = `page_size=100${cursor ? `&start_cursor=${encodeURIComponent(cursor)}` : ''}`
    stats.requests++
    const res = await notion<{ results: NotionBlock[]; has_more: boolean; next_cursor: string | null }>(token, `/blocks/${blockId}/children?${q}`)
    blocks.push(...res.results)
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)
  for (const b of blocks) {
    if (b.has_children && !NO_DESCEND.has(b.type)) b.children = await fetchBlocks(token, b.id, stats)
  }
  return blocks
}
