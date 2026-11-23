import type { GuideBlock, ListItem, NotionBlock, Span } from './types'

type RichText = {
  plain_text?: string
  href?: string | null
  annotations?: { bold?: boolean; italic?: boolean; strikethrough?: boolean; underline?: boolean; code?: boolean }
}

/** Nama pilihan "Produk" di Notion → products.slug (null = percuma). */
const PRODUCTS: Record<string, string | null> = {
  Percuma: null,
  'Shopee AI Toolkit': 'toolkit',
  'Shopee Ads Advanced': 'ads-advanced',
  'Affiliate Advanced': 'affiliate-advanced',
}

export function productSlug(name: string | null | undefined): { ok: true; slug: string | null } | { ok: false } {
  if (name == null || !(name in PRODUCTS)) return { ok: false }
  return { ok: true, slug: PRODUCTS[name] }
}

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

export function toSpans(richText: unknown[]): Span[] {
  return (richText as RichText[]).map((r) => {
    const a = r.annotations ?? {}
    const span: Span = { text: r.plain_text ?? '' }
    if (a.bold) span.bold = true
    if (a.italic) span.italic = true
    if (a.strikethrough) span.strike = true
    if (a.underline) span.underline = true
    if (a.code) span.code = true
    if (r.href) span.href = r.href
    return span
  })
}

const data = (b: NotionBlock) => (b[b.type] ?? {}) as Record<string, unknown>
const spansOf = (b: NotionBlock) => toSpans((data(b).rich_text as unknown[]) ?? [])
const fileUrl = (d: Record<string, unknown>) =>
  ((d[d.type as string] as { url?: string } | undefined)?.url ?? '') as string

export function convertBlocks(blocks: NotionBlock[]): { blocks: GuideBlock[]; warnings: string[] } {
  const out: GuideBlock[] = []
  const warnings: string[] = []

  const inner = (b: NotionBlock) => {
    const r = convertBlocks(b.children ?? [])
    warnings.push(...r.warnings)
    return r.blocks
  }

  for (const b of blocks) {
    const d = data(b)
    switch (b.type) {
      case 'paragraph':
        out.push({ t: 'p', spans: spansOf(b) })
        break
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        out.push({ t: `h${b.type.slice(-1)}` as 'h1' | 'h2' | 'h3', spans: spansOf(b) })
        break
      case 'quote':
        out.push({ t: 'quote', spans: spansOf(b) })
        break
      case 'bulleted_list_item':
      case 'numbered_list_item': {
        const t = b.type === 'bulleted_list_item' ? 'ul' : 'ol'
        const item: ListItem = { spans: spansOf(b), children: inner(b) }
        const last = out[out.length - 1]
        if (last && last.t === t) last.items.push(item)
        else out.push({ t, items: [item] })
        break
      }
      case 'to_do':
        out.push({ t: 'todo', checked: !!d.checked, spans: spansOf(b) })
        break
      case 'callout': {
        const icon = d.icon as { type?: string; emoji?: string } | null | undefined
        out.push({ t: 'callout', icon: icon?.type === 'emoji' ? (icon.emoji ?? null) : null, spans: spansOf(b), children: inner(b) })
        break
      }
      case 'toggle':
        out.push({ t: 'toggle', spans: spansOf(b), children: inner(b) })
        break
      case 'code':
        out.push({ t: 'code', language: String(d.language ?? ''), text: spansOf(b).map((s) => s.text).join('') })
        break
      case 'divider':
        out.push({ t: 'divider' })
        break
      case 'image':
        out.push({
          t: 'image',
          src: fileUrl(d),
          caption: toSpans((d.caption as unknown[]) ?? []),
          notionFile: d.type === 'file',
        })
        break
      case 'video': {
        const id = youtubeId(fileUrl(d))
        if (id) out.push({ t: 'youtube', videoId: id })
        else warnings.push('video: hanya video YouTube disokong, block dilangkau')
        break
      }
      case 'bookmark':
        out.push({ t: 'bookmark', href: String(d.url ?? '') })
        break
      case 'table':
        out.push({
          t: 'table',
          header: !!d.has_column_header,
          rows: (b.children ?? []).map((row) => ((data(row).cells as unknown[][]) ?? []).map((cell) => toSpans(cell))),
        })
        break
      default:
        warnings.push(`${b.type}: jenis block tidak disokong, dilangkau`)
    }
  }
  return { blocks: out, warnings }
}
