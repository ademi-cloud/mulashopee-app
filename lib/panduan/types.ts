/** Teks berformat dalam panduan. */
export type Span = {
  text: string
  bold?: true
  italic?: true
  strike?: true
  underline?: true
  code?: true
  href?: string
}

export type ListItem = { spans: Span[]; children: GuideBlock[] }

/** Format kandungan panduan yang disimpan dalam lessons.body dan dipaparkan oleh app. */
export type GuideBlock =
  | { t: 'h1' | 'h2' | 'h3' | 'p' | 'quote'; spans: Span[] }
  | { t: 'ul' | 'ol'; items: ListItem[] }
  | { t: 'todo'; checked: boolean; spans: Span[] }
  | { t: 'callout'; icon: string | null; spans: Span[]; children: GuideBlock[] }
  | { t: 'toggle'; spans: Span[]; children: GuideBlock[] }
  | { t: 'code'; language: string; text: string }
  | { t: 'divider' }
  | { t: 'image'; src: string; caption: Span[]; notionFile: boolean }
  | { t: 'youtube'; videoId: string }
  | { t: 'bookmark'; href: string }
  | { t: 'table'; header: boolean; rows: Span[][][] }

/** Block mentah dari API Notion (children diisi oleh fetchBlocks). */
export type NotionBlock = {
  id: string
  type: string
  has_children: boolean
  children?: NotionBlock[]
  [k: string]: unknown
}
