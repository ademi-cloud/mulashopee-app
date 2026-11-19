# Mula Shopee App — peraturan kerja

Platform belajar Shopee untuk founder & pemilik bisnes: kandungan percuma + produk berbayar
(AI Toolkit, rakaman advanced, coaching). Pemilik: Ademi Trading / Mula Shopee.
Berbual dengan pemilik dalam **Bahasa Melayu**, ringkas dan jelas — pemilik bukan programmer.

## Peraturan 1 — Rancang dulu, pemilik approve, baru bina

Guna skill Superpowers untuk setiap kerja baru (feature, perubahan database, login, reka bentuk):

1. `brainstorming` — faham apa yang pemilik mahu; tanya soalan dulu.
2. `writing-plans` — tulis pelan: senarai feature, perubahan database (jadual, lajur, policy),
   kesan pada login/akses, dan langkah ujian bagi setiap feature.
3. **Tunjuk pelan kepada pemilik dan tunggu approve.** Jangan tulis kod sebelum pemilik kata setuju.
4. Selepas approve, laksana ikut pelan (`executing-plans`), satu feature pada satu masa.

Pembetulan kecil yang jelas (typo, warna, teks) boleh terus dibuat, tetapi beritahu pemilik.

## Peraturan 2 — Siap satu feature, uji, baru seterusnya (guna GitHub)

- Satu feature = satu branch = satu Pull Request.
- Sebelum kata "siap", guna `verification-before-completion`:
  - `npm run build` lulus (termasuk `tsc`), dan `npx tsc -p functions` untuk webhook.
  - Uji dalam browser (Playwright) atau pada URL preview Cloudflare untuk branch itu.
  - Tunjuk bukti (output / screenshot) kepada pemilik.
- Commit dengan mesej jelas, push, buka PR. Pemilik semak preview → merge ke `main`.
- Jangan mula feature seterusnya selagi feature semasa belum diuji dan diterima.
- Bug: guna `systematic-debugging` — cari punca dulu, jangan teka.

## Peraturan 3 — Rahsia & database

**API key / secret:**
- Simpan dalam `.env.local` (tempatan) atau Cloudflare → Settings → Variables and Secrets (jenis **Secret**).
- **Jangan** tulis nilai key dalam kod, commit, README, Notion atau chat. `.env*` dan `.dev.vars` ada dalam `.gitignore`.
- Hanya `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (publishable) boleh berada di frontend —
  ia memang direka untuk awam dan dilindungi oleh RLS.
- `SUPABASE_SERVICE_ROLE_KEY` (sb_secret_) dan `BCL_WEBHOOK_SECRET` **hanya** dalam Cloudflare Functions (`functions/`).
- Sebelum commit, semak: `git diff --cached | grep -E "sb_secret_|eyJhbGci|secret="` mesti kosong.

**Database (Supabase):**
- Setiap jadual baru **wajib** `enable row level security` + policy yang ketat dalam fail migrasi yang sama.
- Default: tiada akses. Buka hanya apa yang perlu (pengguna baca data sendiri; admin melalui `is_admin()`).
- Satu-satunya bacaan awam yang dibenarkan: `products` (katalog harga). Jadual lain tidak boleh `using (true)`.
- Tulis ke `orders` hanya melalui webhook (service role). Tiada policy insert/update untuk pengguna.
- Fungsi `security definer` mesti semak `auth.uid()` / `is_admin()` sendiri.
- Perubahan database = fail baru `supabase/migrations/NNNN_nama.sql`; pemilik jalankan di SQL Editor.

## Fakta projek

- Stack: Vite + React + TypeScript · Supabase (Auth + Postgres, Singapore) · Cloudflare Pages + Functions · BCL (bayaran).
- Live: https://mulashopee-app.pages.dev
- Webhook BCL: `/api/bcl-webhook?secret=<BCL_WEBHOOK_SECRET>&product=<toolkit|ads-advanced|affiliate-advanced|coaching>`.
  Tool API BCL **tidak** menyimpan URL webhook — pemilik tambah secara manual di BCL → Webhook Settings.
- Produk & akses: `lessons.product` kosong = percuma; berbayar dibuka oleh jualan `paid` dengan email sama; `coaching` buka semua.
- Jenama: Brandbook 2022 — oren `#E75224`, biru royal `#2C3688`, kelabu `#2B2B2B`, font Montserrat.
- Rekod keputusan & senarai semak: Notion → Work Command Centre → Projects → **MulaShopee App**.
