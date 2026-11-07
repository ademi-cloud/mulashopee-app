import { useEffect, useState } from 'react'
import Paywall from '../components/Paywall'
import { useAuth } from '../lib/auth'
import { supabase, type Lesson } from '../lib/supabase'

export default function Lessons({ kind }: { kind: Lesson['kind'] }) {
  const { profile } = useAuth()
  const hasAccess = Boolean(profile?.is_member || profile?.is_admin)
  const [lessons, setLessons] = useState<Lesson[] | null>(null)

  useEffect(() => {
    if (!hasAccess) return
    setLessons(null)
    supabase
      .from('lessons')
      .select('*')
      .eq('kind', kind)
      .order('module')
      .order('sort')
      .then(({ data }) => setLessons((data as Lesson[]) ?? []))
  }, [kind, hasAccess])

  const title = kind === 'video' ? 'Video' : 'Ebook & Template'
  if (!hasAccess) return (<><h1 className="page-title">{title}</h1><div className="mt"><Paywall /></div></>)

  const groups = (lessons ?? []).reduce<Record<string, Lesson[]>>((acc, l) => {
    ;(acc[l.module] ||= []).push(l)
    return acc
  }, {})

  return (
    <>
      <h1 className="page-title">{title}</h1>
      {lessons === null && <p className="muted">Memuatkan…</p>}
      {lessons?.length === 0 && <p className="muted">Belum ada kandungan.</p>}
      {Object.entries(groups).map(([module, items]) => (
        <section key={module} className="mt">
          <h2 className="section-label">{module}</h2>
          <div className="list">
            {items.map((l) => (
              <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="card list-item">
                <span className="list-icon">{kind === 'video' ? '▶' : '⬇'}</span>
                <span>
                  <b>{l.title}</b>
                  {l.description && <span className="muted block">{l.description}</span>}
                </span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
