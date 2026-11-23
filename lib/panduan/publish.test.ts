import { describe, expect, it, vi } from 'vitest'
import { pagesToUnpublish, publishPage, type LessonRow } from './publish'
import type { NotionPage } from './notion'
import type { NotionBlock } from './types'

const page = (over: Partial<NotionPage> = {}): NotionPage => ({
  id: 'pg1',
  lastEdited: '2026-11-23T02:00:00.000Z',
  title: 'Setup Voucher',
  summary: 'Ringkas',
  module: '2. Marketing Tools',
  productName: 'Shopee AI Toolkit',
  order: 2,
  status: 'Terbit',
  ...over,
})
const img = (id: string, url: string): NotionBlock => ({ id, type: 'image', has_children: false, image: { type: 'file', file: { url }, caption: [] } })
const para: NotionBlock = { id: 'p', type: 'paragraph', has_children: false, paragraph: { rich_text: [{ plain_text: 'Hai', annotations: {} }] } }

const deps = (upload: (url: string) => Promise<string | null> = async () => 'https://sb/storage/v1/object/public/panduan/x.png') => {
  const rows: LessonRow[] = []
  return { rows, uploadImage: vi.fn(upload), upsertLesson: vi.fn(async (r: LessonRow) => void rows.push(r)) }
}

describe('publishPage', () => {
  it('terbit returns error for unknown product', async () => {
    const d = deps()
    const r = await publishPage(page({ productName: 'Toolkit' }), [para], d)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.ralat).toContain('Produk')
    expect(d.upsertLesson).not.toHaveBeenCalled()
  })

  it('skips Draf pages', async () => {
    const d = deps()
    const r = await publishPage(page({ status: 'Draf' }), [para], d)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.ralat).toContain('Draf')
    expect(d.upsertLesson).not.toHaveBeenCalled()
  })

  it('replaces notion image src with storage url, including nested images', async () => {
    const d = deps()
    const toggle: NotionBlock = { id: 't', type: 'toggle', has_children: true, toggle: { rich_text: [] }, children: [img('i2', 'https://s3/b.png')] }
    const r = await publishPage(page(), [img('i1', 'https://s3/a.png'), toggle], d)
    expect(r).toEqual({ ok: true, amaran: [] })
    expect(d.uploadImage).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(d.rows[0].body)).not.toContain('s3/')
    expect(JSON.stringify(d.rows[0].body)).toContain('panduan/x.png')
  })

  it('drops image and warns when upload fails', async () => {
    const d = deps(async () => null)
    const r = await publishPage(page(), [img('i1', 'https://s3/a.png'), para], d)
    expect(r).toEqual({ ok: true, amaran: ['Gambar gagal disalin dan dibuang dari panduan'] })
    expect(d.rows[0].body).toEqual([{ t: 'p', spans: [{ text: 'Hai' }] }])
  })

  it('upsert row has kind panduan, product slug, url null', async () => {
    const d = deps()
    await publishPage(page({ productName: 'Percuma' }), [para], d)
    expect(d.rows[0]).toEqual({
      notion_page_id: 'pg1',
      notion_edited_at: '2026-11-23T02:00:00.000Z',
      kind: 'panduan',
      module: '2. Marketing Tools',
      title: 'Setup Voucher',
      description: 'Ringkas',
      sort: 2,
      product: null,
      body: [{ t: 'p', spans: [{ text: 'Hai' }] }],
      published: true,
      url: null,
    })
  })

  it('rejects a page without a title', async () => {
    const d = deps()
    const r = await publishPage(page({ title: '  ' }), [para], d)
    expect(r.ok).toBe(false)
  })
})

describe('pagesToUnpublish', () => {
  it('tarik-balik unpublishes missing pages', () => {
    expect(pagesToUnpublish(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c'])
    expect(pagesToUnpublish([], ['b'])).toEqual([])
  })
})
