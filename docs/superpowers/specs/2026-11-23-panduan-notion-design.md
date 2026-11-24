# Reka bentuk: Panduan (ebook dalam app) diterbitkan dari Notion

Tarikh: 23 Nov 2026 · Status: **menunggu approve pemilik**

## 1. Tujuan

Ebook Mula Shopee perlu direka semula. Daripada reka semula PDF, kandungan ditulis sebagai
**Panduan**: halaman bacaan dalam Ruang Ahli. Pemilik menulis dan mengemas kini di **Notion**,
kemudian klik **Terbitkan** di dashboard admin.

Kenapa:
- Founder membaca di telefon — halaman web lebih selesa daripada PDF.
- Feature Shopee kerap berubah — edit di Notion lebih cepat daripada Canva → export → upload.
- Wajah baru Mula Shopee (warna, Montserrat) dipakai secara automatik.
- Panduan berbayar tiada fail untuk dikongsi.

## 2. Matlamat, bukan-matlamat, anti-matlamat

**Matlamat**
- Pemilik tulis panduan dalam satu database Notion; tiada perlu sentuh kod atau Supabase.
- Butang **Terbitkan** di dashboard admin menyalin panduan berstatus *Terbit* ke app.
- Tab **Panduan** dalam Ruang Ahli (menggantikan tab "Ebook"): senarai ikut modul + halaman bacaan.
- Panduan percuma terbuka untuk semua yang daftar; panduan berbayar ikut sistem produk sedia ada.

**Bukan matlamat (kali ini)**
- Edit kandungan dalam app.
- Video dari Notion / pemain video dalam app (feature berasingan).
- Muat turun PDF, baca offline, komen, jejak kemajuan bacaan.

**Anti-matlamat (gagal walaupun "berfungsi")**
- Panduan berbayar boleh dibaca tanpa membeli (termasuk melalui API Supabase terus).
- Draf dalam Notion terlihat oleh ahli.
- Key Notion / service key berada dalam kod atau frontend.
- Halaman panduan lambat dibuka (> 1 saat selepas senarai dimuatkan).

## 3. Kekangan

- Cloudflare Pages Functions pelan percuma: **50 subrequest setiap request**. Satu "Terbitkan" untuk
  semua panduan sekali gus akan melebihi had → terbit **satu panduan setiap request** (lihat 5.3).
- API Notion: ~3 request/saat; senarai block berhalaman (100 block setiap halaman).
- URL gambar yang dimuat naik ke Notion **tamat tempoh selepas 1 jam** → gambar mesti disalin.
- Peraturan `CLAUDE.md`: rahsia hanya dalam Cloudflare Secret; RLS wajib; satu feature satu PR.

## 4. Pendekatan yang dipertimbang

| | Pendekatan | Kelebihan | Kekurangan |
|---|---|---|---|
| A | App baca Notion terus setiap kali dibuka | Berubah serta-merta | 2–5 s setiap halaman; gambar tamat tempoh; bergantung pada Notion |
| **B** | **Butang Terbitkan → salin ke Supabase** | Laju; gambar kekal; draf terkawal; perlindungan berbayar sama | Perlu klik selepas edit |
| C | Sync automatik ikut jadual | Tiada butang | Lambat muncul; draf separuh siap boleh tersiar |

**Dipilih: B** (pemilik, 23 Nov 2026).

## 5. Reka bentuk

### 5.1 Database Notion "Panduan Mula Shopee"

Dicipta di bawah halaman Notion **MulaShopee App**. Satu baris = satu panduan; isi panduan ditulis
dalam halaman baris tersebut.

| Ruangan | Jenis | Nilai |
|---|---|---|
| Tajuk | Title | Tajuk panduan |
| Ringkasan | Text | 1–2 ayat untuk senarai |
| Modul | Select | cth. "1. Mula Jual", "2. Marketing Tools" |
| Produk | Select | **Percuma**, **Shopee AI Toolkit**, **Shopee Ads Advanced**, **Affiliate Advanced** |
| Susunan | Number | Turutan dalam modul |
| Status | Select | **Draf**, **Terbit** |

Pemetaan Produk → `products.slug`: Percuma → `null`, Shopee AI Toolkit → `toolkit`,
Shopee Ads Advanced → `ads-advanced`, Affiliate Advanced → `affiliate-advanced`.
Nilai tidak dikenali → panduan tidak diterbitkan dan dilaporkan sebagai ralat (bukan dianggap percuma).

### 5.2 Database Supabase (migrasi `0003_panduan.sql`)

- `lessons.kind` dibenarkan `'panduan'` (selain `video`, `ebook`).
- `lessons.url` dijadikan *nullable* (panduan tiada link luar).
- Lajur baru pada `lessons`: `notion_page_id text unique`, `notion_edited_at timestamptz`,
  `body jsonb` (kandungan dalam format block ringkas, lihat 5.4).
- `lesson_catalog()` **tidak** memulangkan `body` (supaya senarai ringan).
- Fungsi baru `guide_body(lesson_id bigint) returns jsonb` (`security definer`): pulangkan `body`
  hanya jika `auth.uid()` ada **dan** (`product is null` atau `has_product(product)`); jika tidak, `null`.
- Policy `lessons` sedia ada sudah menghalang bacaan terus baris berbayar; kekal.
- Bucket Storage `panduan` untuk gambar (lihat 5.5).
- Contoh ebook lama (`kind = 'ebook'`) ditandakan `published = false`.

### 5.3 Terbitkan (Cloudflare Functions)

Semua endpoint di bawah mengesahkan pemanggil ialah **admin**: baca token Supabase dari header
`Authorization`, panggil `auth/v1/user`, kemudian semak `profiles.is_admin` dengan service key.
Bukan admin → 403.

1. `GET /api/panduan/senarai` — query database Notion; pulangkan senarai
   `{ pageId, tajuk, status, lastEdited, perluKemasKini }` (bandingkan dengan `notion_edited_at`).
2. `POST /api/panduan/terbit?page=<id>` — untuk **satu** panduan:
   ambil properties + semua block (rekursif, berhalaman) → tukar ke format block ringkas →
   salin gambar ke Storage → `upsert` ke `lessons` ikut `notion_page_id`.
   Pulangkan `{ ok, amaran: [block tidak disokong…] }`.
3. `POST /api/panduan/tarik-balik` — panduan dalam app yang tiada lagi berstatus *Terbit* di Notion
   ditetapkan `published = false` (tidak dipadam).

Dashboard memanggil (1), kemudian (2) satu demi satu untuk yang `perluKemasKini`, kemudian (3),
sambil menunjukkan kemajuan. Panduan yang tidak berubah dilangkau.

Rahsia baru (Cloudflare Secret): `NOTION_TOKEN`. Pemboleh ubah biasa: `NOTION_PANDUAN_DB_ID`.

### 5.4 Format kandungan

Block Notion ditukar kepada senarai JSON ringkas, dipaparkan oleh komponen React (bukan HTML mentah,
jadi tiada risiko suntikan kod):

| Notion | Disokong |
|---|---|
| heading_1/2/3, paragraph, bulleted/numbered list (bersarang), to_do, quote, callout, divider, toggle, code, table, image, video (YouTube → embed), bookmark | Ya |
| Teks: bold, italic, strikethrough, underline, code, link | Ya |
| Warna teks Notion | Diabaikan (ikut warna jenama) |
| Lain-lain (database dalam halaman, embed lain, column) | Dilangkau + amaran semasa Terbitkan |

### 5.5 Gambar

Gambar fail Notion dimuat turun dan dimuat naik ke bucket `panduan` dengan nama rawak
(`<uuid>.<ext>`), bucket **baca awam**. Gambar luaran (URL biasa) dikekalkan.
*Keputusan Claude:* gambar awam dengan nama tidak boleh diteka cukup selamat kerana teks panduan
berbayar tetap berkunci; signed URL untuk setiap gambar akan memperlahankan halaman.

### 5.6 Paparan ahli

- Tab Ruang Ahli: **Utama · Video · Panduan** (tab "Ebook" diganti; `/ahli/ebook` → `/ahli/panduan`).
- `/ahli/panduan`: senarai ikut modul; label *Percuma* / *Dimiliki*; panduan berbayar berkunci dengan
  kad "Buka · RMxx" (komponen `LessonList` sedia ada).
- `/ahli/panduan/:id`: tajuk, ringkasan, isi; lebar bacaan selesa (~70 aksara); butang
  **Sebelum / Seterusnya** dalam modul yang sama. Berkunci → kad beli, tanpa isi.
- *Keputusan Claude:* panduan berbayar menunjukkan baris kecil di bawah tajuk dan di hujung:
  "Untuk kegunaan <email ahli> sahaja" (penghalang perkongsian screenshot).

### 5.7 Dashboard admin

Kad **Panduan**: butang **Terbitkan dari Notion**, senarai kemajuan (✓ diterbitkan / ↷ tiada perubahan /
⚠ amaran / ✗ ralat), dan pautan ke database Notion.

## 6. Ujian

- Unit test (Vitest) untuk penukar block Notion → format ringkas, termasuk senarai bersarang,
  teks berformat, block tidak disokong, dan pemetaan Produk.
- Build: `npm run build`, `npx tsc -p functions`.
- Ujian pada URL preview Cloudflare dengan Notion sebenar: 1 panduan percuma, 1 berbayar, 1 draf.
  Semak: draf tidak muncul; akaun tanpa pembelian tidak dapat isi berbayar (UI **dan** panggilan
  terus `guide_body`); akaun admin boleh baca semua; gambar kekal selepas 1 jam.
- Bukan admin memanggil `/api/panduan/*` → 403.

## 7. Bahagian pemilik

1. Notion → Settings → Connections → **Develop or manage integrations** → cipta integration
   "Mula Shopee App" (baca sahaja) → salin token terus ke Cloudflare Secret `NOTION_TOKEN`.
2. Kongsi database "Panduan Mula Shopee" dengan integration itu (⋯ → Connections).
3. Jalankan `0003_panduan.sql` di Supabase SQL Editor.
4. Uji pada link preview, kemudian merge PR.

## 8. Diserahkan kepada pembina

Gaya tipografi halaman bacaan, susunan kod dalam `functions/`, nama komponen, teks butang kecil.
