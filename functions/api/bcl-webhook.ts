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

function pick(obj: Payload, paths: string[]): unknown {
  for (const path of paths) {
    let cur: unknown = obj
    for (const key of path.split('.')) {
      if (cur && typeof cur === 'object' && key in (cur as Payload)) {
        cur = (cur as Payload)[key]
      } else {
        cur = undefined
        break
      }
    }
    if (cur !== undefined && cur !== null && cur !== '') return cur
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

  const orderNo = str(pick(body, [
    'order_number', 'order_no', 'orderNumber', 'data.order_number', 'transaction.order_number', 'id',
  ]))
  if (!orderNo) return new Response('missing order number', { status: 400 })

  const status = normaliseStatus(pick(body, [
    'status', 'payment_status', 'data.status', 'transaction.status', 'event',
  ]))
  const amountRaw = pick(body, ['amount', 'total', 'data.amount', 'transaction.amount', 'grand_total'])
  const amount = Number(String(amountRaw ?? '0').replace(/[^0-9.]/g, '')) || 0

  const row = {
    order_no: orderNo,
    email: str(pick(body, ['email', 'customer.email', 'payer.email', 'data.email', 'customer_email']))?.toLowerCase() ?? null,
    name: str(pick(body, ['name', 'customer.name', 'payer.name', 'data.name', 'customer_name'])),
    phone: str(pick(body, ['phone', 'customer.phone', 'payer.phone', 'data.phone', 'customer_phone'])),
    amount,
    status,
    paid_at: status === 'paid'
      ? str(pick(body, ['paid_at', 'data.paid_at', 'transaction.paid_at'])) ?? new Date().toISOString()
      : null,
    raw: body,
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/orders?on_conflict=order_no`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
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
