import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useCatalog } from '../lib/catalog'
import { greeting, longDate } from '../lib/format'

// Harga asal untuk dipotong (harga promosi semasa ada dalam products.price_label)
const WAS_PRICE: Record<string, string> = { toolkit: 'RM97' }

export default function MemberHome() {
  const { profile } = useAuth()
  const { lessons, products } = useCatalog()
  const name = profile?.full_name || profile?.email?.split('@')[0] || ''

  const free = (lessons ?? []).filter((l) => !l.product).length
  const owned = new Set((lessons ?? []).filter((l) => l.product && l.unlocked).map((l) => l.product!))
  const upgrades = Object.values(products).filter((p) => p.slug !== 'coaching')

  return (
    <>
      <h1 className="page-title">{greeting()}, {name}</h1>
      <p className="muted">{longDate()} · selamat datang ke Ruang Ahli Mula Shopee.</p>

      <div className="grid-2 mt">
        <Link to="/ahli/video" className="card card-link">
          <span className="badge free">Percuma</span>
          <h3 className="mt-sm">Mula jual di Shopee</h3>
          <p className="muted">{free} video & ebook asas, termasuk cara guna marketing tools Shopee.</p>
        </Link>
        <Link to="/ahli/ebook" className="card card-link">
          <h3>Ebook & Template</h3>
          <p className="muted">Senarai semak, template dan kalkulator untung.</p>
        </Link>
      </div>

      <section className="mt">
        <h2 className="section-label">Upgrade skill</h2>
        <div className="grid-3">
          {upgrades.map((p) => {
            const has = owned.has(p.slug)
            return (
              <div key={p.slug} className="card offer">
                <h3>{p.title}</h3>
                {p.description && <p className="muted">{p.description}</p>}
                {has ? (
                  <Link className="btn btn-outline" to="/ahli/video">✓ Dimiliki — buka</Link>
                ) : p.available && p.checkout_url ? (
                  <>
                    {p.price_label && (
                      <strong className="price">
                        {p.price_label} {WAS_PRICE[p.slug] && <s className="price-sub">{WAS_PRICE[p.slug]}</s>}
                      </strong>
                    )}
                    <a className="btn btn-primary" href={p.checkout_url}>Dapatkan</a>
                  </>
                ) : (
                  <span className="badge badge-inline">Akan datang</span>
                )}
              </div>
            )
          })}
        </div>
        <p className="muted mt-sm">Guna email yang sama dengan akaun ini semasa membayar, dan akses akan dibuka secara automatik.</p>
      </section>
    </>
  )
}
