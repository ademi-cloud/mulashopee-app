// Cloudflare Pages Function: terima notifikasi bayaran dari BCL dan simpan
// ke jadual `orders` dalam Supabase.
//
// URL webhook (letak dalam setting borang BCL):
//   https://<domain>/api/bcl-webhook?secret=<BCL_WEBHOOK_SECRET>
//
// NOTA: format payload BCL belum disahkan dengan dokumentasi rasmi
// (docs.bcl.my/webhook-payment-form). Fungsi ini membaca beberapa nama
// medan yang biasa dan menyimpan payload penuh dalam `raw` supaya boleh
// disemak dan dibetulkan selepas ujian bayaran pertama.

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  BCL_WEBHOOK_SECRET: string
}

type Payload = Record<string, unknown>

/** Cari nilai pertama bagi mana-mana kunci, di mana-mana tahap dalam payload. */
function find(obj: unknown, keys: string[], depth = 0): unknown {
  if (!obj || typeof obj !== 'object' || depth > 5) return undefined
  const o = obj as Payload
  for (const k of keys) {
    const v = o[k]
    if (v !== undefined && v !== null && v !== '' && typeof v !== 'object') return v
  }
  for (const v of Object.values(o)) {
    const found = find(v, keys, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

function str(v: unknown): string | null {
  return v === undefined || v === null ? null : String(v).trim() || null
}

function normaliseStatus(v: unknown): 'paid' | 'failed' | 'pending' {
  // Webhook ini hanya dilanggan untuk event "payment-success", jadi anggap
  // berbayar kecuali payload jelas menyatakan gagal atau masih menunggu.
  const s = String(v ?? '').toLowerCase()
  if (/fail|cancel|expire|reject/.test(s)) return 'failed'
  if (/pending|new|unpaid/.test(s)) return 'pending'
  return 'paid'
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Key baru Supabase (sb_secret_...) hanya boleh dihantar dalam header `apikey`.
// Key lama (JWT eyJ...) perlu dalam `apikey` dan `Authorization`.
function supabaseHeaders(env: Env): Record<string, string> {
  const key = env.SUPABASE_SERVICE_ROLE_KEY.trim()
  return key.startsWith('sb_') ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` }
}

async function readBody(request: Request): Promise<Payload> {
  const type = request.headers.get('content-type') ?? ''
  if (type.includes('application/json')) return (await request.json()) as Payload
  const form = await request.formData()
  return Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]))
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const secret = new URL(request.url).searchParams.get('secret') ?? ''
  if (!env.BCL_WEBHOOK_SECRET || !timingSafeEqual(secret, env.BCL_WEBHOOK_SECRET)) {
    return new Response('unauthorised', { status: 401 })
  }

  let body: Payload
  try {
    body = await readBody(request)
  } catch {
    return new Response('bad payload', { status: 400 })
  }

  // Nama medan BCL (disahkan dari transaksi LINK-581790):
  // order_number, amount, payer_name, payer_email, payer_telephone_number, status (3 = Successful)
  const orderNo = str(find(body, ['order_number', 'order_no', 'orderNumber']))
  if (!orderNo) {
    console.error('BCL webhook tanpa order_number', JSON.stringify(body).slice(0, 2000))
    return new Response('missing order number', { status: 400 })
  }

  const status = normaliseStatus(find(body, ['payment_status', 'status_description', 'status', 'event']))
  const amount = Number(String(find(body, ['amount', 'total', 'grand_total']) ?? '0').replace(/[^0-9.]/g, '')) || 0

  const row = {
    order_no: orderNo,
    email: str(find(body, ['payer_email', 'email', 'customer_email']))?.toLowerCase() ?? null,
    name: str(find(body, ['payer_name', 'name', 'customer_name'])),
    phone: str(find(body, ['payer_telephone_number', 'phone', 'telephone', 'customer_phone'])),
    amount,
    status,
    paid_at: status === 'paid' ? new Date().toISOString() : null,
    raw: body,
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/orders?on_conflict=order_no`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(env),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  })

  if (!res.ok) {
    console.error('Supabase insert failed', res.status, await res.text())
    return new Response('storage error', { status: 500 })
  }
  return new Response('ok')
}

function jwtRole(token: string): string {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return (JSON.parse(atob(part)) as { role?: string }).role ?? 'tidak diketahui'
  } catch {
    return 'tidak sah'
  }
}

// Semakan kesihatan: buka di browser
//   https://<domain>/api/bcl-webhook?secret=<BCL_WEBHOOK_SECRET>
// untuk pastikan Secret dan sambungan Supabase betul. Tiada key didedahkan.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const secret = new URL(request.url).searchParams.get('secret') ?? ''
  if (!env.BCL_WEBHOOK_SECRET || !timingSafeEqual(secret, env.BCL_WEBHOOK_SECRET)) {
    return Response.json({ ok: false, masalah: 'BCL_WEBHOOK_SECRET tiada atau tidak sama dengan ?secret= dalam URL' }, { status: 401 })
  }
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''
  const result: Record<string, unknown> = {
    secret: 'betul',
    supabase_url: env.SUPABASE_URL || 'TIADA',
    jenis_key: !key ? 'TIADA' : key.startsWith('sb_secret_') ? 'secret (betul)' : key.startsWith('sb_publishable_') ? 'publishable (SALAH — perlu secret)' : key.startsWith('eyJ') ? (jwtRole(key) === 'service_role' ? 'JWT service_role (betul)' : `JWT ${jwtRole(key)} (SALAH — perlu service_role)`) : 'tidak dikenali',
  }
  if (env.SUPABASE_URL && key) {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/orders?select=order_no&limit=1`, { headers: supabaseHeaders(env) })
    result.sambungan_supabase = res.ok ? 'berjaya' : `gagal (${res.status}): ${(await res.text()).slice(0, 300)}`
  }
  result.ok = result.sambungan_supabase === 'berjaya' && String(result.jenis_key).includes('betul')
  return Response.json(result)
}
