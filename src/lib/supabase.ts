import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

// Bila env belum diisi, guna URL palsu supaya landing page masih boleh dibuka.
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-key')

const env = import.meta.env as Record<string, string | undefined>

// Borang bayaran BCL (boleh ditukar melalui env di Cloudflare)
export const checkoutUrl = env.VITE_BCL_CHECKOUT_URL || 'https://mulashopee.bcl.my/form/shopee-ai-toolkit'
export const coachingUrl = env.VITE_BCL_COACHING_URL || 'https://mulashopee.bcl.my/form/personal-coaching-shopee-marketing'
export const serviceUrl = env.VITE_BCL_SERVICE_URL || 'https://mulashopee.bcl.my/form/service-tempah-temujanji'

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
  sort: number
  product: string | null
  unlocked: boolean
  url: string | null
}

export type Product = {
  slug: string
  title: string
  description: string | null
  price_label: string | null
  checkout_url: string | null
  available: boolean
  sort: number
}

export type SalesSummary = {
  today_total: number
  today_count: number
  yesterday_total: number
  month_total: number
  month_count: number
  last_month_total: number
  users_total: number
  users_month: number
  buyers_total: number
}
