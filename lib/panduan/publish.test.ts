import { describe, expect, it, vi } from 'vitest'
import { isPublishable, pagesToUnpublish, publishPage, type LessonRow } from './publish'
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

type Copy = { src: string } | { gagal: true } | { nanti: true }
const deps = (copy: (url: string) => Promise<Copy> = async () => ({ src: 'https://sb/storage/v1/object/public/panduan/img/x' })) => {
  const rows: LessonRow[] = []
  return { rows, copyImage: vi.fn(copy), upsertLesson: vi.fn(async (r: LessonRow) => void rows.push(r)) }
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
    expect(r).toEqual({ ok: true, amaran: [], selesai: true })
    expect(d.copyImage).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(d.rows[0].body)).not.toContain('s3/')
    expect(JSON.stringify(d.rows[0].body)).toContain('panduan/img/x')
  })

  it('drops image and warns when upload fails', async () => {
    const d = deps(async () => ({ gagal: true }))
    const r = await publishPage(page(), [img('i1', 'https://s3/a.png'), para], d)
    expect(r).toEqual({ ok: true, amaran: ['Gambar gagal disalin dan dibuang dari panduan'], selesai: true })
    expect(d.rows[0].body).toEqual([{ t: 'p', spans: [{ text: 'Hai' }] }])
  })

  it('returns selesai false and skips upsert when an image must wait for the next request', async () => {
    let n = 0
    const d = deps(async () => (n++ === 0 ? { src: 'https://sb/img/1' } : { nanti: true }))
    const r = await publishPage(page(), [img('i1', 'https://s3/a.png'), img('i2', 'https://s3/b.png')], d)
    expect(r).toEqual({ ok: true, amaran: [], selesai: false })
    expect(d.upsertLesson).not.toHaveBeenCalled()
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

describe('isPublishable', () => {
  it('only Terbit pages with a title and a known product', () => {
    expect(isPublishable(page())).toBe(true)
    expect(isPublishable(page({ status: 'Draf' }))).toBe(false)
    expect(isPublishable(page({ productName: 'Toolkit' }))).toBe(false)
    expect(isPublishable(page({ productName: null }))).toBe(false)
    expect(isPublishable(page({ title: ' ' }))).toBe(false)
  })
})

describe('pagesToUnpublish', () => {
  it('tarik-balik unpublishes missing pages', () => {
    expect(pagesToUnpublish(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c'])
    expect(pagesToUnpublish([], ['b'])).toEqual([])
  })
})
