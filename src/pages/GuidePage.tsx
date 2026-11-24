import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GuideRenderer from '../components/GuideRenderer'
import { useAuth } from '../lib/auth'
import { useCatalog } from '../lib/catalog'
import { supabase } from '../lib/supabase'
import type { GuideBlock } from '../../lib/panduan/types'

export default function GuidePage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { lessons, products } = useCatalog()
  const [body, setBody] = useState<GuideBlock[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const guides = (lessons ?? []).filter((l) => l.kind === 'panduan')
  const guide = guides.find((l) => String(l.id) === id)

  useEffect(() => {
    setBody(null)
    setError(null)
    if (!guide?.unlocked) return
    supabase.rpc('guide_body', { p_id: guide.id }).then(({ data, error }) => {
      if (error) setError(error.message)
      else setBody((data as GuideBlock[] | null) ?? [])
    })
  }, [guide?.id, guide?.unlocked])

  if (lessons === null) return <p className="muted">Memuatkan…</p>
  if (!guide) {
    return (
      <div className="card">
        <p>Panduan tidak dijumpai.</p>
        <Link className="btn btn-outline btn-sm" to="/ahli/panduan">← Semua panduan</Link>
      </div>
    )
  }

  const sameModule = guides.filter((l) => l.module === guide.module).sort((a, b) => a.sort - b.sort)
  const idx = sameModule.findIndex((l) => l.id === guide.id)
  const prev = sameModule[idx - 1]
  const next = sameModule[idx + 1]
  const product = guide.product ? products[guide.product] : undefined
  const owner = guide.product && guide.unlocked && profile?.email ? <p className="guide-owner">Untuk kegunaan {profile.email} sahaja</p> : null

  return (
    <article className="guide-page">
      <Link className="guide-back" to="/ahli/panduan">← Panduan</Link>
      <p className="section-label">{guide.module}</p>
      <h1 className="page-title">{guide.title}</h1>
      {guide.description && <p className="lead">{guide.description}</p>}
      {owner}

      {!guide.unlocked ? (
        <div className="card upsell mt">
          <div>
            <b>{product?.title ?? 'Kandungan berbayar'}</b>
            <span className="muted block">Panduan ini sebahagian daripada {product?.title ?? 'produk berbayar'}.</span>
          </div>
          {product?.available && product.checkout_url ? (
            <a className="btn btn-primary btn-sm" href={product.checkout_url}>Buka {product.price_label ? `· ${product.price_label}` : ''}</a>
          ) : (
            <span className="badge">Akan datang</span>
          )}
        </div>
      ) : error ? (
        <p className="alert error mt">{error}</p>
      ) : body === null ? (
        <p className="muted mt">Memuatkan…</p>
      ) : (
        <div className="mt">
          <GuideRenderer blocks={body} />
          {owner}
        </div>
      )}

      <nav className="guide-nav">
        {prev ? <Link className="btn btn-outline" to={`/ahli/panduan/${prev.id}`}>← {prev.title}</Link> : <span />}
        {next ? <Link className="btn btn-outline" to={`/ahli/panduan/${next.id}`}>{next.title} →</Link> : <span />}
      </nav>
    </article>
  )
}
