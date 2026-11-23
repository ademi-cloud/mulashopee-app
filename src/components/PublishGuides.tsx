import { useState } from 'react'
import { notionPanduanUrl, supabase } from '../lib/supabase'

type Row = { pageId: string; tajuk: string; state: 'menunggu' | 'berjalan' | 'ok' | 'sama' | 'amaran' | 'ralat'; note?: string }
type ListItem = { pageId: string; tajuk: string; status: string | null; perluKemasKini: boolean }

const ICON: Record<Row['state'], string> = { menunggu: '…', berjalan: '⏳', ok: '✓', sama: '↷', amaran: '⚠', ralat: '✗' }

async function call<T>(path: string, method: 'GET' | 'POST' = 'GET'): Promise<{ ok: boolean; data: T }> {
  const { data } = await supabase.auth.getSession()
  const res = await fetch(path, { method, headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } })
  const body = (await res.json().catch(() => ({ ralat: `Ralat ${res.status}` }))) as T
  return { ok: res.ok, data: body }
}

export default function PublishGuides() {
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const update = (pageId: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.pageId === pageId ? { ...r, ...patch } : r)))

  async function publish() {
    setBusy(true)
    setError(null)
    setSummary(null)
    try {
      const list = await call<{ panduan?: ListItem[]; ralat?: string }>('/api/panduan/senarai')
      if (!list.ok || !list.data.panduan) throw new Error(list.data.ralat ?? 'Gagal baca senarai dari Notion')
      const terbit = list.data.panduan.filter((p) => p.status === 'Terbit')
      setRows(terbit.map((p) => ({ pageId: p.pageId, tajuk: p.tajuk, state: p.perluKemasKini ? 'menunggu' : 'sama' })))

      let done = 0
      let failed = 0
      for (const p of terbit.filter((x) => x.perluKemasKini)) {
        update(p.pageId, { state: 'berjalan' })
        // Panduan dengan banyak gambar baru diterbitkan dalam beberapa pusingan.
        let r = await call<{ ok?: boolean; amaran?: string[]; ralat?: string; selesai?: boolean }>(`/api/panduan/terbit?page=${encodeURIComponent(p.pageId)}`, 'POST')
        for (let round = 1; r.ok && r.data.ok && r.data.selesai === false && round < 30; round++) {
          update(p.pageId, { state: 'berjalan', note: `Menyalin gambar… (pusingan ${round + 1})` })
          r = await call(`/api/panduan/terbit?page=${encodeURIComponent(p.pageId)}`, 'POST')
        }
        if (r.ok && r.data.ok && r.data.selesai === false) {
          failed++
          update(p.pageId, { state: 'ralat', note: 'Terlalu banyak gambar — cuba Terbitkan sekali lagi' })
        } else if (r.ok && r.data.ok) {
          done++
          const warn = r.data.amaran ?? []
          update(p.pageId, warn.length ? { state: 'amaran', note: warn.join(' · ') } : { state: 'ok', note: undefined })
        } else {
          failed++
          update(p.pageId, { state: 'ralat', note: r.data.ralat ?? 'Ralat tidak diketahui' })
        }
      }

      const pull = await call<{ ditarik?: number; ralat?: string }>('/api/panduan/tarik-balik', 'POST')
      const pulled = pull.ok ? (pull.data.ditarik ?? 0) : 0
      setSummary(`${done} diterbitkan · ${terbit.length - terbit.filter((x) => x.perluKemasKini).length} tiada perubahan · ${failed} ralat · ${pulled} ditarik balik`)
      if (failed) setError(`${failed} panduan gagal — semak sebab di bawah, betulkan di Notion, kemudian klik Terbitkan semula.`)
      if (!pull.ok) setError(pull.data.ralat ?? 'Gagal tarik balik panduan lama')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt">
      <h2 className="section-label">Panduan</h2>
      <div className="card publish">
        <div className="row">
          <button className="btn btn-primary" onClick={() => void publish()} disabled={busy}>
            {busy ? 'Sedang menerbitkan…' : 'Terbitkan dari Notion'}
          </button>
          <a className="btn btn-outline" href={notionPanduanUrl} target="_blank" rel="noreferrer">Buka database Notion</a>
        </div>
        <p className="muted mt-sm">Hanya panduan berstatus <b>Terbit</b> di Notion akan muncul kepada ahli.</p>
        {error && <p className="alert error">{error}</p>}
        {rows.length > 0 && (
          <ul className="publish-list">
            {rows.map((r) => (
              <li key={r.pageId} className={`publish-${r.state}`}>
                <span className="publish-icon">{ICON[r.state]}</span>
                <span>
                  {r.tajuk}
                  {r.note && <span className="muted block">{r.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {summary && <p className="alert ok">{summary}</p>}
      </div>
    </section>
  )
}
