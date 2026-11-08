import { useEffect, useState } from 'react'
import { supabase, type Lesson, type Product } from './supabase'

/** Pelajaran (dengan status buka/kunci) dan senarai produk berbayar. */
export function useCatalog() {
  const [lessons, setLessons] = useState<Lesson[] | null>(null)
  const [products, setProducts] = useState<Record<string, Product>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([supabase.rpc('lesson_catalog'), supabase.from('products').select('*').order('sort')]).then(
      ([l, p]) => {
        if (l.error) setError(l.error.message)
        setLessons((l.data as Lesson[]) ?? [])
        setProducts(Object.fromEntries(((p.data as Product[]) ?? []).map((x) => [x.slug, x])))
      },
    )
  }, [])

  return { lessons, products, error }
}
