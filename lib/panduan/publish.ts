import { convertBlocks, productSlug } from './convert'
import type { NotionPage } from './notion'
import type { GuideBlock, NotionBlock } from './types'

export type LessonRow = {
  notion_page_id: string
  notion_edited_at: string
  kind: 'panduan'
  module: string
  title: string
  description: string
  sort: number
  product: string | null
  body: GuideBlock[]
  published: true
  url: null
}

export type CopyResult = { src: string } | { gagal: true } | { nanti: true }

export type PublishDeps = {
  /** Salin gambar Notion ke Storage: URL kekal, gagal, atau "nanti" bila had request habis. */
  copyImage(url: string): Promise<CopyResult>
  upsertLesson(row: LessonRow): Promise<void>
}

/** selesai=false: masih ada gambar untuk disalin — panggil terbit sekali lagi. */
export type PublishResult = { ok: true; amaran: string[]; selesai: boolean } | { ok: false; ralat: string }

/** Ganti src gambar Notion dengan URL Storage (rekursif); buang gambar yang gagal. */
type CopyState = { amaran: string[]; tertunda: boolean }

async function copyImages(blocks: GuideBlock[], deps: PublishDeps, st: CopyState): Promise<GuideBlock[]> {
  const out: GuideBlock[] = []
  for (const b of blocks) {
    if (b.t === 'image' && b.notionFile) {
      const r = await deps.copyImage(b.src)
      if ('nanti' in r) {
        st.tertunda = true
        continue
      }
      if ('gagal' in r) {
        st.amaran.push('Gambar gagal disalin dan dibuang dari panduan')
        continue
      }
      out.push({ ...b, src: r.src, notionFile: false })
    } else if (b.t === 'ul' || b.t === 'ol') {
      const items = []
      for (const it of b.items) items.push({ ...it, children: await copyImages(it.children, deps, st) })
      out.push({ ...b, items })
    } else if (b.t === 'callout' || b.t === 'toggle') {
      out.push({ ...b, children: await copyImages(b.children, deps, st) })
    } else {
      out.push(b)
    }
  }
  return out
}

export async function publishPage(page: NotionPage, blocks: NotionBlock[], deps: PublishDeps): Promise<PublishResult> {
  if (page.status !== 'Terbit') return { ok: false, ralat: `Status "${page.status ?? 'kosong'}" — hanya Terbit diterbitkan (Draf dilangkau)` }
  if (!page.title.trim()) return { ok: false, ralat: 'Tajuk kosong' }
  const product = productSlug(page.productName)
  if (!product.ok) return { ok: false, ralat: `Produk "${page.productName ?? 'kosong'}" tidak dikenali` }

  const { blocks: converted, warnings } = convertBlocks(blocks)
  const st: CopyState = { amaran: [...warnings], tertunda: false }
  const body = await copyImages(converted, deps, st)
  if (st.tertunda) return { ok: true, amaran: st.amaran, selesai: false }

  await deps.upsertLesson({
    notion_page_id: page.id,
    notion_edited_at: page.lastEdited,
    kind: 'panduan',
    module: page.module,
    title: page.title.trim(),
    description: page.summary,
    sort: page.order,
    product: product.slug,
    body,
    published: true,
    url: null,
  })
  return { ok: true, amaran: st.amaran, selesai: true }
}

/** Boleh diterbitkan: status Terbit, ada tajuk, dan Produk dikenali. */
export function isPublishable(page: NotionPage): boolean {
  return page.status === 'Terbit' && !!page.title.trim() && productSlug(page.productName).ok
}

/** Panduan yang masih diterbitkan dalam app tetapi tidak lagi layak diterbitkan di Notion. */
export function pagesToUnpublish(publishedInApp: string[], terbitInNotion: string[]): string[] {
  const keep = new Set(terbitInNotion)
  return publishedInApp.filter((id) => !keep.has(id))
}
