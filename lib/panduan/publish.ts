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

export type PublishDeps = {
  /** Salin gambar Notion ke Storage; pulang URL kekal, atau null jika gagal. */
  uploadImage(url: string): Promise<string | null>
  upsertLesson(row: LessonRow): Promise<void>
}

export type PublishResult = { ok: true; amaran: string[] } | { ok: false; ralat: string }

/** Ganti src gambar Notion dengan URL Storage (rekursif); buang gambar yang gagal. */
async function copyImages(blocks: GuideBlock[], deps: PublishDeps, amaran: string[]): Promise<GuideBlock[]> {
  const out: GuideBlock[] = []
  for (const b of blocks) {
    if (b.t === 'image' && b.notionFile) {
      const src = await deps.uploadImage(b.src)
      if (!src) {
        amaran.push('Gambar gagal disalin dan dibuang dari panduan')
        continue
      }
      out.push({ ...b, src, notionFile: false })
    } else if (b.t === 'ul' || b.t === 'ol') {
      const items = []
      for (const it of b.items) items.push({ ...it, children: await copyImages(it.children, deps, amaran) })
      out.push({ ...b, items })
    } else if (b.t === 'callout' || b.t === 'toggle') {
      out.push({ ...b, children: await copyImages(b.children, deps, amaran) })
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
  const amaran = [...warnings]
  const body = await copyImages(converted, deps, amaran)

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
  return { ok: true, amaran }
}

/** Panduan yang masih diterbitkan dalam app tetapi bukan lagi "Terbit" di Notion. */
export function pagesToUnpublish(publishedInApp: string[], terbitInNotion: string[]): string[] {
  const keep = new Set(terbitInNotion)
  return publishedInApp.filter((id) => !keep.has(id))
}
