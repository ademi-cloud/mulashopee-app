# Mula Shopee

Platform kursus untuk belajar jual di Shopee: landing page, Ruang Ahli (video & ebook) dan dashboard jualan admin.

**Stack:** Vite + React + TypeScript · Supabase (login & database) · Cloudflare Pages (hosting + webhook) · BCL (bayaran)

## Struktur

| Laluan | Fungsi |
|---|---|
| `/` | Landing page + butang beli (BCL) |
| `/login` | Log masuk / daftar / reset password |
| `/ahli` | Ruang Ahli — dikunci sehingga ahli dah bayar |
| `/ahli/video`, `/ahli/ebook` | Senarai pelajaran (jadual `lessons`) |
| `/admin` | Dashboard jualan — admin sahaja |
| `functions/api/bcl-webhook.ts` | Terima notifikasi bayaran BCL → jadual `orders` |
| `supabase/migrations/0001_init.sql` | Jadual, keselamatan (RLS) dan fungsi `sales_summary` |

## Aliran ahli

1. Pembeli bayar di borang BCL.
2. BCL hantar webhook → baris `orders` berstatus `paid`.
3. Pembeli daftar akaun di `/login` dengan **email yang sama** → terus jadi ahli (`profiles.is_member = true`).
   Urutan terbalik (daftar dulu, bayar kemudian) juga berfungsi.

## Setup

### 1. Supabase
1. Projek: `mulashopee-app` (Southeast Asia — Singapore).
2. **SQL Editor → New query** → tampal isi `supabase/migrations/0001_init.sql` → **Run**.
3. **Authentication → URL Configuration**: Site URL = domain Cloudflare (contoh `https://mulashopee-app.pages.dev`).
4. Daftar akaun sendiri di `/login`, kemudian jadikan admin:
   ```sql
   update public.profiles set is_admin = true where email = 'emel-awak@contoh.com';
   ```

### 2. Cloudflare Pages
**Workers & Pages → Create → Pages → Connect to Git** → pilih repo ini.

- Build command: `npm run build`
- Output directory: `dist`

Environment variables (Settings → Variables and Secrets):

| Nama | Nilai | Jenis |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL Supabase | Plaintext |
| `VITE_SUPABASE_ANON_KEY` | anon / publishable key | Plaintext |
| `VITE_BCL_CHECKOUT_URL` | Link borang bayaran BCL | Plaintext |
| `SUPABASE_URL` | Project URL Supabase | Plaintext |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key | **Secret** |
| `BCL_WEBHOOK_SECRET` | Rentetan rawak panjang (reka sendiri) | **Secret** |

### 3. BCL
Dalam setting borang bayaran, letak URL webhook:

```
https://<domain>/api/bcl-webhook?secret=<BCL_WEBHOOK_SECRET>
```

> Format payload BCL belum disahkan. Selepas bayaran ujian pertama, semak lajur `raw` dalam jadual `orders`
> dan pastikan `order_no`, `email`, `amount` dan `status` diisi dengan betul.

### 4. Kandungan
Tambah atau ubah video/ebook dalam **Supabase → Table Editor → lessons**
(`kind` = `video` atau `ebook`, `url` = link YouTube unlisted / Vimeo / PDF).

## Pembangunan tempatan

```bash
cp .env.example .env.local   # isi nilai Supabase
npm install
npm run dev
```
