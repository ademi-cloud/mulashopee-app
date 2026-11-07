import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

// Bila env belum diisi, guna URL palsu supaya landing page masih boleh dibuka.
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-key')

export const checkoutUrl = (import.meta.env.VITE_BCL_CHECKOUT_URL as string | undefined) || '#harga'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  is_member: boolean
  is_admin: boolean
}

export type Lesson = {
  id: number
  kind: 'video' | 'ebook'
  module: string
  title: string
  description: string | null
  url: string
  sort: number
}

export type SalesSummary = {
  today_total: number
  today_count: number
  yesterday_total: number
  month_total: number
  month_count: number
  last_month_total: number
  members_total: number
  members_month: number
}
