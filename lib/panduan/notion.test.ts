import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchBlocks, queryPanduan } from './notion'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const para = (id: string, has_children = false) => ({ id, type: 'paragraph', has_children, paragraph: { rich_text: [] } })

afterEach(() => vi.unstubAllGlobals())

describe('fetchBlocks', () => {
  it('fetches all pages of children recursively', async () => {
    const first = Array.from({ length: 99 }, (_, i) => para(`a${i}`))
    first.push(para('parent', true))
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/blocks/root/children') && !url.includes('start_cursor')) return json({ results: first, has_more: true, next_cursor: 'c2' })
      if (url.includes('/blocks/root/children') && url.includes('start_cursor=c2')) return json({ results: [para('last')], has_more: false, next_cursor: null })
      if (url.includes('/blocks/parent/children')) return json({ results: [para('child')], has_more: false, next_cursor: null })
      throw new Error('unexpected ' + url)
    })
    vi.stubGlobal('fetch', fetchMock)

    const blocks = await fetchBlocks('tok', 'root')
    expect(blocks).toHaveLength(101)
    expect(blocks.find((b) => b.id === 'parent')?.children?.map((c) => c.id)).toEqual(['child'])
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['Notion-Version']).toBe('2022-06-28')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('does not descend into child pages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ results: [{ id: 'p', type: 'child_page', has_children: true, child_page: {} }], has_more: false })))
    const blocks = await fetchBlocks('tok', 'root')
    expect(blocks[0].children).toBeUndefined()
  })
})

describe('queryPanduan', () => {
  it('maps properties', async () => {
    const page = (id: string, produk: string | null, cursorNext: boolean) => ({
      id,
      last_edited_time: '2026-11-23T01:00:00.000Z',
      properties: {
        Tajuk: { type: 'title', title: [{ plain_text: 'Setup ' }, { plain_text: 'Voucher' }] },
        Ringkasan: { type: 'rich_text', rich_text: [{ plain_text: 'Ringkas' }] },
        Modul: { type: 'select', select: { name: '2. Marketing Tools' } },
        Produk: { type: 'select', select: produk ? { name: produk } : null },
        Susunan: { type: 'number', number: 3 },
        Status: { type: 'select', select: { name: 'Terbit' } },
      },
      cursorNext,
    })
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body ?? '{}'))
      if (!body.start_cursor) return json({ results: [page('p1', 'Percuma', true)], has_more: true, next_cursor: 'n' })
      return json({ results: [page('p2', null, false)], has_more: false, next_cursor: null })
    })
    vi.stubGlobal('fetch', fetchMock)

    const pages = await queryPanduan('tok', 'db1')
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/databases/db1/query')
    expect(pages).toEqual([
      { id: 'p1', lastEdited: '2026-11-23T01:00:00.000Z', title: 'Setup Voucher', summary: 'Ringkas', module: '2. Marketing Tools', productName: 'Percuma', order: 3, status: 'Terbit' },
      { id: 'p2', lastEdited: '2026-11-23T01:00:00.000Z', title: 'Setup Voucher', summary: 'Ringkas', module: '2. Marketing Tools', productName: null, order: 3, status: 'Terbit' },
    ])
  })

  it('throws a readable error when Notion refuses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'Could not find database' }, 404)))
    await expect(queryPanduan('tok', 'db1')).rejects.toThrow(/Notion 404/)
  })
})
