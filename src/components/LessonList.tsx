import type { Lesson, Product } from '../lib/supabase'

export default function LessonList({ lessons, products }: { lessons: Lesson[]; products: Record<string, Product> }) {
  const groups = lessons.reduce<Record<string, Lesson[]>>((acc, l) => {
    ;(acc[l.module] ||= []).push(l)
    return acc
  }, {})

  return (
    <>
      {Object.entries(groups).map(([module, items]) => {
        const product = items[0].product ? products[items[0].product] : undefined
        const locked = items.every((l) => !l.unlocked)
        return (
          <section key={module} className="mt">
            <div className="module-head">
              <h2 className="section-label">{module}</h2>
              {!items[0].product && <span className="badge free">Percuma</span>}
              {product && !locked && <span className="badge owned">Dimiliki</span>}
            </div>
            {product && locked && (
              <div className="card upsell">
                <div>
                  <b>{product.title}</b>
                  {product.description && <span className="muted block">{product.description}</span>}
                </div>
                {product.available && product.checkout_url ? (
                  <a className="btn btn-primary btn-sm" href={product.checkout_url}>
                    Buka {product.price_label ? `· ${product.price_label}` : ''}
                  </a>
                ) : (
                  <span className="badge">Akan datang</span>
                )}
              </div>
            )}
            <div className="list">
              {items.map((l) =>
                l.unlocked && l.url ? (
                  <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="card list-item">
                    <span className="list-icon">{l.kind === 'video' ? '▶' : '⬇'}</span>
                    <span>
                      <b>{l.title}</b>
                      {l.description && <span className="muted block">{l.description}</span>}
                    </span>
                  </a>
                ) : (
                  <div key={l.id} className="card list-item locked">
                    <span className="list-icon">🔒</span>
                    <span>
                      <b>{l.title}</b>
                      {l.description && <span className="muted block">{l.description}</span>}
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>
        )
      })}
    </>
  )
}
