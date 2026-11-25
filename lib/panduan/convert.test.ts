import { describe, expect, it } from 'vitest'
import { convertBlocks, productSlug, youtubeId } from './convert'
import type { NotionBlock } from './types'

const rt = (content: string, extra: Record<string, unknown> = {}, href: string | null = null) => ({
  type: 'text',
  plain_text: content,
  href,
  annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default', ...extra },
})

let n = 0
const block = (type: string, data: Record<string, unknown>, children?: NotionBlock[]): NotionBlock => ({
  id: `b${n++}`,
  type,
  has_children: !!children?.length,
  children,
  [type]: data,
})

describe('convertBlocks', () => {
  it('paragraph with bold and link', () => {
    const { blocks } = convertBlocks([
      block('paragraph', { rich_text: [rt('Hai '), rt('kedai', { bold: true }, 'https://x.com')] }),
    ])
    expect(blocks).toEqual([{ t: 'p', spans: [{ text: 'Hai ' }, { text: 'kedai', bold: true, href: 'https://x.com' }] }])
  })

  it('groups consecutive bulleted items into one ul with nested children', () => {
    const { blocks } = convertBlocks([
      block('bulleted_list_item', { rich_text: [rt('Satu')] }, [block('bulleted_list_item', { rich_text: [rt('Satu-a')] })]),
      block('bulleted_list_item', { rich_text: [rt('Dua')] }),
      block('paragraph', { rich_text: [rt('Selepas')] }),
    ])
    expect(blocks).toEqual([
      {
        t: 'ul',
        items: [
          { spans: [{ text: 'Satu' }], children: [{ t: 'ul', items: [{ spans: [{ text: 'Satu-a' }], children: [] }] }] },
          { spans: [{ text: 'Dua' }], children: [] },
        ],
      },
      { t: 'p', spans: [{ text: 'Selepas' }] },
    ])
  })

  it('numbered_list_item becomes ol', () => {
    const { blocks } = convertBlocks([
      block('numbered_list_item', { rich_text: [rt('A')] }),
      block('numbered_list_item', { rich_text: [rt('B')] }),
    ])
    expect(blocks).toEqual([{ t: 'ol', items: [{ spans: [{ text: 'A' }], children: [] }, { spans: [{ text: 'B' }], children: [] }] }])
  })

  it('image file keeps notionFile true; external false', () => {
    const { blocks } = convertBlocks([
      block('image', { type: 'file', file: { url: 'https://s3.notion/a.png?sig=1' }, caption: [rt('Kapsyen')] }),
      block('image', { type: 'external', external: { url: 'https://cdn.x/b.jpg' }, caption: [] }),
    ])
    expect(blocks).toEqual([
      { t: 'image', src: 'https://s3.notion/a.png?sig=1', caption: [{ text: 'Kapsyen' }], notionFile: true },
      { t: 'image', src: 'https://cdn.x/b.jpg', caption: [], notionFile: false },
    ])
  })

  it('youtube video becomes youtube block; other video skipped with warning', () => {
    const { blocks, warnings } = convertBlocks([
      block('video', { type: 'external', external: { url: 'https://www.youtube.com/watch?v=abc123' } }),
      block('video', { type: 'external', external: { url: 'https://vimeo.com/1' } }),
    ])
    expect(blocks).toEqual([{ t: 'youtube', videoId: 'abc123' }])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('video')
  })

  it('unsupported block (child_database, column_list) skipped with warning containing its type', () => {
    const { blocks, warnings } = convertBlocks([block('child_database', {}), block('column_list', {})])
    expect(blocks).toEqual([])
    expect(warnings.some((w) => w.includes('child_database'))).toBe(true)
    expect(warnings.some((w) => w.includes('column_list'))).toBe(true)
  })

  it('table rows map to Span[][][] with header flag', () => {
    const { blocks } = convertBlocks([
      block('table', { has_column_header: true }, [
        block('table_row', { cells: [[rt('Fi')], [rt('Kadar')]] }),
        block('table_row', { cells: [[rt('Komisen')], [rt('5%')]] }),
      ]),
    ])
    expect(blocks).toEqual([
      { t: 'table', header: true, rows: [[[{ text: 'Fi' }], [{ text: 'Kadar' }]], [[{ text: 'Komisen' }], [{ text: '5%' }]]] },
    ])
  })

  it('heading, quote, callout, toggle, todo, code, divider and bookmark', () => {
    const { blocks, warnings } = convertBlocks([
      block('heading_2', { rich_text: [rt('Tajuk')] }),
      block('quote', { rich_text: [rt('Petikan')] }),
      block('callout', { rich_text: [rt('Tip')], icon: { type: 'emoji', emoji: '💡' }, color: 'orange_background' }, [block('paragraph', { rich_text: [rt('Dalam')] })]),
      block('toggle', { rich_text: [rt('Buka')] }, [block('paragraph', { rich_text: [rt('Isi')] })]),
      block('to_do', { rich_text: [rt('Buat')], checked: true }),
      block('code', { rich_text: [rt('x = 1')], language: 'javascript' }),
      block('divider', {}),
      block('bookmark', { url: 'https://shopee.com.my' }),
    ])
    expect(warnings).toEqual([])
    expect(blocks).toEqual([
      { t: 'h2', spans: [{ text: 'Tajuk' }] },
      { t: 'quote', spans: [{ text: 'Petikan' }] },
      { t: 'callout', icon: '💡', tone: 'orange', spans: [{ text: 'Tip' }], children: [{ t: 'p', spans: [{ text: 'Dalam' }] }] },
      { t: 'toggle', spans: [{ text: 'Buka' }], children: [{ t: 'p', spans: [{ text: 'Isi' }] }] },
      { t: 'todo', checked: true, spans: [{ text: 'Buat' }] },
      { t: 'code', language: 'javascript', text: 'x = 1' },
      { t: 'divider' },
      { t: 'bookmark', href: 'https://shopee.com.my' },
    ])
  })
})

describe('nested content', () => {
  it('keeps children of paragraphs, quotes and to_dos after the block', () => {
    const { blocks, warnings } = convertBlocks([
      block('paragraph', { rich_text: [rt('Induk')] }, [block('paragraph', { rich_text: [rt('Anak')] })]),
      block('to_do', { rich_text: [rt('Buat')], checked: false }, [block('paragraph', { rich_text: [rt('Nota')] })]),
    ])
    expect(warnings).toEqual([])
    expect(blocks).toEqual([
      { t: 'p', spans: [{ text: 'Induk' }] },
      { t: 'p', spans: [{ text: 'Anak' }] },
      { t: 'todo', checked: false, spans: [{ text: 'Buat' }] },
      { t: 'p', spans: [{ text: 'Nota' }] },
    ])
  })

  it('toggleable heading becomes a toggle keeping its content', () => {
    const { blocks } = convertBlocks([
      block('heading_2', { rich_text: [rt('Soalan')], is_toggleable: true }, [block('paragraph', { rich_text: [rt('Jawapan')] })]),
    ])
    expect(blocks).toEqual([{ t: 'toggle', spans: [{ text: 'Soalan' }], children: [{ t: 'p', spans: [{ text: 'Jawapan' }] }] }])
  })
})

describe('callout tone', () => {
  it('orange and yellow backgrounds are orange; green, gray and default are blue', () => {
    const tone = (color?: string) => {
      const { blocks } = convertBlocks([block('callout', { rich_text: [rt('x')], icon: null, ...(color ? { color } : {}) })])
      return (blocks[0] as { tone: string }).tone
    }
    expect(tone('orange_background')).toBe('orange')
    expect(tone('yellow_background')).toBe('orange')
    expect(tone('green_background')).toBe('blue')
    expect(tone('gray_background')).toBe('blue')
    expect(tone(undefined)).toBe('blue')
  })
})

describe('youtubeId', () => {
  it('reads watch, short and embed urls', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=abc123')).toBe('abc123')
    expect(youtubeId('https://youtu.be/abc123')).toBe('abc123')
    expect(youtubeId('https://www.youtube.com/embed/abc123')).toBe('abc123')
    expect(youtubeId('https://vimeo.com/1')).toBeNull()
  })
})

describe('productSlug', () => {
  it('maps known product names', () => {
    expect(productSlug('Percuma')).toEqual({ ok: true, slug: null })
    expect(productSlug('Shopee AI Toolkit')).toEqual({ ok: true, slug: 'toolkit' })
    expect(productSlug('Shopee Ads Advanced')).toEqual({ ok: true, slug: 'ads-advanced' })
    expect(productSlug('Affiliate Advanced')).toEqual({ ok: true, slug: 'affiliate-advanced' })
  })

  it('rejects unknown product', () => {
    expect(productSlug('Toolkit')).toEqual({ ok: false })
    expect(productSlug(null)).toEqual({ ok: false })
    expect(productSlug(undefined)).toEqual({ ok: false })
  })
})
