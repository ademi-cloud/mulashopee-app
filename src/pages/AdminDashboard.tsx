import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { formatRM, greeting, longDate, percentChange } from '../lib/format'
import { supabase, type SalesSummary } from '../lib/supabase'

type RecentOrder = { order_no: string; product: string; name: string | null; email: string | null; amount: number; paid_at: string }

function Change({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="change neutral">— {label}</span>
  const up = value >= 0
  return <span className={`change ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(value)}% {label}</span>
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [recent, setRecent] = useState<RecentOrder[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [s, r] = await Promise.all([
      supabase.rpc('sales_summary'),
      supabase
        .from('orders')
        .select('order_no,product,name,email,amount,paid_at')
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(10),
    ])
    if (s.error) setError(s.error.message)
    setSummary((s.data as SalesSummary) ?? null)
    setRecent((r.data as RecentOrder[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => void load(), [load])

  const name = profile?.full_name || profile?.email?.split('@')[0] || ''

  return (
    <>
      <h1 className="page-title">{greeting()}, {name}</h1>
      <p className="muted">{longDate()} · ringkasan jualan dan ahli Mula Shopee.</p>
      <button className="btn btn-outline mt-sm" onClick={() => void load()} disabled={loading}>
        ↻ {loading ? 'Memuatkan…' : 'Muat semula'}
      </button>
      {error && <p className="alert error mt">{error}</p>}

      <div className="grid-2 mt">
        <div className="card stat stat-dark">
          <span className="stat-label">Jualan hari ini</span>
          <strong className="stat-value">{formatRM(summary?.today_total ?? 0)}</strong>
          <span className="stat-sub">{summary?.today_count ?? 0} jualan</span>
          <Change value={summary ? percentChange(summary.today_total, summary.yesterday_total) : null} label="vs semalam" />
        </div>
        <div className="card stat">
          <span className="stat-label">Bulan ini</span>
          <strong className="stat-value">{formatRM(summary?.month_total ?? 0)}</strong>
          <span className="stat-sub">{summary?.month_count ?? 0} jualan</span>
          <Change value={summary ? percentChange(summary.month_total, summary.last_month_total) : null} label="vs bulan lepas" />
        </div>
        <div className="card stat">
          <span className="stat-label">Pengguna berdaftar</span>
          <strong className="stat-value">{summary?.users_total ?? 0}</strong>
          <span className="stat-sub">+{summary?.users_month ?? 0} bulan ini · {summary?.buyers_total ?? 0} pembeli</span>
        </div>
      </div>

      <section className="mt">
        <h2 className="section-label">Jualan terkini</h2>
        <div className="card table-card">
          {recent.length === 0 ? (
            <p className="muted">Belum ada jualan.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Pembeli</th><th>Produk</th><th>No. order</th><th>Masa</th><th className="num">Jumlah</th></tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.order_no}>
                    <td>{o.name || o.email || '—'}</td>
                    <td>{o.product}</td>
                    <td className="mono">{o.order_no}</td>
                    <td>{new Date(o.paid_at).toLocaleString('ms-MY', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="num">{formatRM(o.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  )
}
