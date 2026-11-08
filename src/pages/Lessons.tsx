import LessonList from '../components/LessonList'
import { useCatalog } from '../lib/catalog'
import type { Lesson } from '../lib/supabase'

export default function Lessons({ kind }: { kind: Lesson['kind'] }) {
  const { lessons, products, error } = useCatalog()
  const items = (lessons ?? []).filter((l) => l.kind === kind)

  return (
    <>
      <h1 className="page-title">{kind === 'video' ? 'Video' : 'Ebook & Template'}</h1>
      {error && <p className="alert error mt">{error}</p>}
      {lessons === null && <p className="muted">Memuatkan…</p>}
      {lessons && items.length === 0 && <p className="muted">Belum ada kandungan.</p>}
      <LessonList lessons={items} products={products} />
    </>
  )
}
