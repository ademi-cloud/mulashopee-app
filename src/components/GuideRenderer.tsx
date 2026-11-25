import { Fragment, type ReactNode } from 'react'
import type { GuideBlock, ListItem, Span } from '../../lib/panduan/types'

const safeHref = (href: string) => (/^(https?:|mailto:)/i.test(href) ? href : null)

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) => {
        let node: ReactNode = s.text
        if (s.code) node = <code>{node}</code>
        if (s.bold) node = <strong>{node}</strong>
        if (s.italic) node = <em>{node}</em>
        if (s.strike) node = <s>{node}</s>
        if (s.underline) node = <u>{node}</u>
        const href = s.href ? safeHref(s.href) : null
        if (href) node = <a href={href} target="_blank" rel="noreferrer">{node}</a>
        return <Fragment key={i}>{node}</Fragment>
      })}
    </>
  )
}

function Items({ items }: { items: ListItem[] }) {
  return (
    <>
      {items.map((it, i) => (
        <li key={i}>
          <Spans spans={it.spans} />
          {it.children.length > 0 && <Blocks blocks={it.children} />}
        </li>
      ))}
    </>
  )
}

function Block({ b }: { b: GuideBlock }) {
  switch (b.t) {
    case 'h1':
      return <h1><Spans spans={b.spans} /></h1>
    case 'h2':
      return <h2><Spans spans={b.spans} /></h2>
    case 'h3':
      return <h3><Spans spans={b.spans} /></h3>
    case 'p':
      return <p><Spans spans={b.spans} /></p>
    case 'quote':
      return <blockquote><Spans spans={b.spans} /></blockquote>
    case 'ul':
      return <ul><Items items={b.items} /></ul>
    case 'ol':
      return <ol><Items items={b.items} /></ol>
    case 'todo':
      return (
        <label className="guide-todo">
          <input type="checkbox" checked={b.checked} readOnly disabled /> <Spans spans={b.spans} />
        </label>
      )
    case 'callout':
      return (
        <div className={`guide-callout guide-callout--${b.tone === 'orange' ? 'orange' : 'grey'}`}>
          {b.icon && <span className="guide-callout-icon">{b.icon}</span>}
          <div>
            <Spans spans={b.spans} />
            {b.children.length > 0 && <Blocks blocks={b.children} />}
          </div>
        </div>
      )
    case 'toggle':
      return (
        <details className="guide-toggle">
          <summary><Spans spans={b.spans} /></summary>
          <Blocks blocks={b.children} />
        </details>
      )
    case 'code':
      return <pre className="guide-code"><code>{b.text}</code></pre>
    case 'divider':
      return <hr />
    case 'image':
      return (
        <figure className="guide-figure">
          <img src={b.src} alt={b.caption.map((s) => s.text).join('')} loading="lazy" />
          {b.caption.length > 0 && <figcaption><Spans spans={b.caption} /></figcaption>}
        </figure>
      )
    case 'youtube':
      return (
        <div className="guide-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${b.videoId}`}
            title="Video YouTube"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    case 'bookmark': {
      const href = safeHref(b.href)
      return href ? <p><a className="guide-bookmark" href={href} target="_blank" rel="noreferrer">🔗 {href}</a></p> : null
    }
    case 'table':
      return (
        <div className="guide-table">
          <table>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) =>
                    b.header && r === 0 ? <th key={c}><Spans spans={cell} /></th> : <td key={c}><Spans spans={cell} /></td>,
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

function Blocks({ blocks }: { blocks: GuideBlock[] }) {
  return <>{blocks.map((b, i) => <Block key={i} b={b} />)}</>
}

/** Paparkan isi panduan. Tiada HTML mentah — semua teks dilepaskan oleh React. */
export default function GuideRenderer({ blocks }: { blocks: GuideBlock[] }) {
  return <div className="guide"><Blocks blocks={blocks} /></div>
}
