import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import GuideRenderer from './GuideRenderer'
import type { GuideBlock } from '../../lib/panduan/types'

const html = (blocks: GuideBlock[]) => renderToStaticMarkup(<GuideRenderer blocks={blocks} />)

describe('GuideRenderer', () => {
  it('renders headings, lists and bold text', () => {
    const out = html([
      { t: 'h2', spans: [{ text: 'Tajuk' }] },
      { t: 'ul', items: [{ spans: [{ text: 'Satu', bold: true }], children: [{ t: 'ol', items: [{ spans: [{ text: 'a' }], children: [] }] }] }] },
    ])
    expect(out).toContain('<h2>Tajuk</h2>')
    expect(out).toContain('<ul><li><strong>Satu</strong><ol><li>a</li></ol></li></ul>')
  })

  it('renders html-like text as text', () => {
    const out = html([{ t: 'p', spans: [{ text: '<script>alert(1)</script>' }] }])
    expect(out).toContain('&lt;script&gt;')
    expect(out).not.toContain('<script>')
  })

  it('youtube block renders iframe src https://www.youtube-nocookie.com/embed/<id>', () => {
    expect(html([{ t: 'youtube', videoId: 'abc123' }])).toContain('src="https://www.youtube-nocookie.com/embed/abc123"')
  })

  it('link spans open in new tab with rel noreferrer', () => {
    const out = html([{ t: 'p', spans: [{ text: 'Shopee', href: 'https://shopee.com.my' }] }])
    expect(out).toContain('href="https://shopee.com.my"')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noreferrer"')
  })

  it('ignores javascript: links', () => {
    const out = html([{ t: 'p', spans: [{ text: 'x', href: 'javascript:alert(1)' }] }])
    expect(out).not.toContain('javascript:')
  })

  it('renders table, callout, toggle, todo, image and code', () => {
    const out = html([
      { t: 'table', header: true, rows: [[[{ text: 'Fi' }], [{ text: 'Kadar' }]], [[{ text: 'A' }], [{ text: '5%' }]]] },
      { t: 'callout', icon: '💡', spans: [{ text: 'Tip' }], children: [] },
      { t: 'toggle', spans: [{ text: 'Buka' }], children: [{ t: 'p', spans: [{ text: 'Isi' }] }] },
      { t: 'todo', checked: true, spans: [{ text: 'Siap' }] },
      { t: 'image', src: 'https://sb/x.png', caption: [{ text: 'Kap' }], notionFile: false },
      { t: 'code', language: 'js', text: 'a<b' },
    ])
    expect(out).toContain('<th>Fi</th>')
    expect(out).toContain('<td>5%</td>')
    expect(out).toContain('💡')
    expect(out).toContain('<details')
    expect(out).toContain('<summary>Buka</summary>')
    expect(out).toContain('checked=""')
    expect(out).toContain('src="https://sb/x.png"')
    expect(out).toContain('<figcaption>Kap</figcaption>')
    expect(out).toContain('a&lt;b')
  })
})
