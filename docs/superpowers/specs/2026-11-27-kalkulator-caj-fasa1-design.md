# Reka bentuk: Kalkulator Caj Shopee dalam app — Fasa 1

Tarikh: 27 Nov 2026 · Status: **menunggu approve pemilik**

## 1. Tujuan

Kalkulator Caj Shopee (artifact "Kalkulator Caj Shopee") dibawa masuk ke app Mula Shopee
sebagai **alat percuma** untuk menarik seller masuk ke app.

Keseluruhan projek (dipersetujui pemilik, 27 Nov 2026) dipecah kepada 3 fasa:

| Fasa | Isi | Tujuan |
|---|---|---|
| **1 (dokumen ini)** | Kalkulator dalam app + jenama Mula Shopee, kalkulator terbalik, banding SCP, cadangan pintar, kadar dari database + borang admin | Konten untuk orang jumpa (2, 3, 5) + mudah dikemas kini (6) |
| 2 | Simpan & banding produk (perlu daftar), kongsi ke WhatsApp | Funnel & marketing percuma (1, 4) |
| 3 | Kiraan penggunaan & pendaftaran di dashboard | Data (7) |

## 2. Matlamat, bukan-matlamat, anti-matlamat

**Matlamat**
- Halaman awam `/kalkulator` — boleh digunakan **tanpa log masuk**.
- Semua kiraan artifact dikekalkan: komisen (kluster/Marketplace/Mall/SCP), fi transaksi, fi sokongan
  platform, fi SCP (biasa/hari kempen, had seunit), pre-order, seller baru, barang dikecualikan,
  baucar seller, untung bersih, fi pesanan tidak berjaya, fi pengeluaran kerap, jadual ringkasan caj.
- **Kalkulator terbalik:** "Berapa saya patut jual?" — masukkan untung sasaran (RM atau % margin),
  dapat harga minimum.
- **Banding SCP:** keputusan sertai vs tidak sertai SCP sebelah-menyebelah, dengan beza untung.
- **Cadangan pintar:** selepas kira, 0–3 cadangan berdasarkan hasil, dengan pautan ke Panduan / produk.
- **Kadar dalam database**, dikemas kini oleh admin melalui **borang dalam dashboard**, dengan tarikh
  "Kadar disemak".
- Wajah Mula Shopee (oren `#E75224`, biru royal `#2C3688`, Montserrat). Bukan oren Shopee.

**Bukan matlamat (Fasa 1)**
- Simpan produk, akaun, kongsi WhatsApp/gambar (Fasa 2). Statistik penggunaan (Fasa 3).
- Kategori/sub-kategori terperinci (kekal kluster + kadar yang pengguna masukkan, seperti artifact).
- SEO lanjutan (server-side rendering).

**Anti-matlamat**
- Angka berbeza daripada artifact asal untuk input yang sama.
- Kalkulator rosak atau kosong jika database tidak dapat dibaca.
- Admin tersalah taip kadar (cth. 378 untuk 3.78) dan terus dipaparkan kepada orang awam.
- Nampak seperti alat rasmi Shopee.

## 3. Kekangan

- Kadar dalam artifact = versi terkini Seller Education Hub (disahkan pemilik). Sumber: artikel
  3503, 6799, 16038, 1094, 5161.
- Peraturan `CLAUDE.md`: RLS wajib; **satu-satunya bacaan awam ialah `products`**. Kalkulator awam perlu
  membaca kadar tanpa log masuk → **perlu kelulusan pemilik untuk menambah 2 jadual kadar sebagai
  bacaan awam** (lihat §8). Kadar caj Shopee ialah maklumat awam, bukan data peribadi.
- Satu feature = satu PR; ujian automatik wajib.

## 4. Pendekatan

| | Pendekatan | Kelebihan | Kekurangan |
|---|---|---|---|
| **A** | **Bina semula dalam React, kiraan dalam `lib/` dengan ujian** | Boleh sambung login, simpan, data, kadar DB; setiap angka diuji | Kerja paling banyak di Fasa 1 |
| B | Artifact dalam iframe | Paling cepat | Tiada sambungan ke app; bukan funnel |
| C | Salin HTML artifact ke `public/` | Cepat | Sukar diuji & dikembangkan |

**Dipilih: A** (pemilik, 27 Nov 2026). Kadar dikemas kini melalui **borang dashboard admin** (pemilik).

## 5. Reka bentuk

### 5.1 Database (migrasi `0004_kadar_caj.sql`)

**`fee_settings`** — satu baris (`id = 1`), lajur bertaip dengan had (`check`):

| Lajur | Nilai awal | Had |
|---|---|---|
| `transaction_pct` | 3.78 | 0–20 |
| `platform_fee_rm` | 0.54 | 0–10 |
| `commission_sst_pct` | 8 | 0–20 |
| `scp_pct` / `scp_campaign_pct` | 5.94 / 8.10 | 0–30 |
| `scp_cap_rm` | 108 | 0–1000 |
| `preorder_pct` | 2.16 | 0–20 |
| `uof_sst_pct` | 6 | 0–20 |
| `withdraw_fee_rm` / `withdraw_free_per_week` | 0.12 / 3 | 0–10 / 0–20 |
| `new_seller_days` / `new_seller_orders` | 120 / 200 | 0–1000 / 0–10000 |
| `reviewed_on` | 2026-11-26 | tarikh |

**`commission_rates`** — `(seller_type 'mp'|'mall', cluster, scp boolean, min_pct, max_pct)`,
16 baris dari artifact, `check (0 <= min_pct <= max_pct <= 40)`, unik pada `(seller_type, cluster, scp)`.

RLS: `select` untuk semua (termasuk tanpa log masuk); `insert/update/delete` hanya `is_admin()`.

### 5.2 Kiraan (`lib/kalkulator/`, tulen, diuji)

- `calculate(input, settings, rates) → Result` — logik sama seperti artifact (termasuk bundar ke atas
  fi transaksi, had SCP seunit, seller baru hanya Marketplace).
- `priceFor(target, input, settings, rates) → number | null` — harga seunit minimum untuk capai untung
  RM atau % margin; carian binari (kerana bundaran & had SCP), ketepatan RM0.01; `null` jika mustahil.
- `compareScp(input, …) → { tanpa, dengan, beza }`.
- `failedOrderFee(...)`, `withdrawFee(...)`.
- `suggest(result, input) → Suggestion[]` — peraturan (keputusan Claude, boleh diubah):

| Keadaan | Cadangan |
|---|---|
| Untung < 0 | "Pesanan ini rugi RMx" → cuba **Cari harga jual** + Panduan *Sediakan Tawaran yang Jelas* |
| Margin < 15% | Semak harga, kos & baucar → **Cari harga jual** |
| Caj > 20% harga jualan | Lihat **Banding SCP** / semak komisen sub-kategori |
| Baucar > 10% harga | Baucar mengurangkan asas komisen tetapi tetap kos → kira semula margin |
| Seller baru dihidupkan | Ingatan: komisen bermula selepas 120 hari / 200 pesanan — kira juga tanpa pengecualian |

- **Ujian oracle:** fungsi kiraan artifact dijalankan dalam ujian sebagai rujukan; hasil `calculate`
  mesti sama tepat (RM0.00) untuk set input contoh (lalai artifact, Mall, SCP + kempen, pre-order,
  seller baru, dikecualikan, kuantiti 3, baucar 0).

### 5.3 Paparan awam `/kalkulator`

- Header Mula Shopee (logo, "Log masuk" / "Ruang Ahli"). Tidak perlu log masuk.
- Tiga tab: **Kira untung** (seperti artifact: input + resit melekat) · **Cari harga jual** ·
  **Banding SCP**.
- Bahagian fi pesanan gagal & pengeluaran kerap, jadual ringkasan caj (dari DB), "Kadar disemak: <tarikh>",
  pautan sumber Shopee, penafian "Anggaran sahaja; bukan alat rasmi Shopee".
- Input disimpan dalam pelayar (seperti artifact) supaya kekal bila kembali.
- Jika DB gagal dibaca → guna kadar lalai terbina (sama dengan nilai awal migrasi) + nota kecil.
- Pautan masuk: landing page (header + kad "Alat percuma"), Ruang Ahli (tab **Kalkulator**).
- `document.title` = "Kalkulator Caj Shopee — Mula Shopee".

### 5.4 Borang admin (dashboard)

Kad **Kadar Caj Shopee**: medan untuk semua `fee_settings` + jadual 16 kadar komisen + tarikh disemak.
Semakan sebelum simpan (had sama seperti §5.1, min ≤ max). Simpan melalui Supabase (RLS admin).
Mesej berjaya/ralat.

## 6. Ujian

- Vitest: ujian oracle (§5.2), `priceFor` (hasilnya bila dimasukkan semula mencapai sasaran; mustahil →
  null), `compareScp`, `suggest` (setiap peraturan), validasi borang.
- Migrasi diuji pada PostgreSQL tempatan: awam boleh `select`, bukan admin tidak boleh `update`, had
  `check` menolak 378%.
- Playwright: `/kalkulator` tanpa log masuk (3 tab, telefon 390px), borang admin (data palsu).
- Preview Cloudflare: pemilik semak angka sama dengan artifact; ubah satu kadar di dashboard → kalkulator berubah.

## 7. Diserahkan kepada pembina

Susun atur tepat, nama komponen, teks kecil, warna bar "ke mana RM pergi" (dalam palet Mula Shopee).

## 8. Perlu keputusan pemilik

- **Kecualian peraturan bacaan awam:** benarkan `fee_settings` dan `commission_rates` dibaca awam
  (tanpa log masuk). `CLAUDE.md` akan dikemas kini untuk menyenaraikan kecualian ini.
