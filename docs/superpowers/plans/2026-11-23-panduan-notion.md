# Panduan dari Notion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pemilik menulis panduan dalam database Notion, klik "Terbitkan dari Notion" di dashboard, dan ahli membaca panduan dalam tab Panduan Ruang Ahli (percuma/berbayar ikut sistem produk sedia ada).

**Architecture:** Penukar tulen (`lib/panduan/`) menukar block Notion kepada JSON ringkas; Cloudflare Functions (`functions/api/panduan/*`, admin sahaja) menarik dari Notion, menyalin gambar ke Supabase Storage dan `upsert` ke `lessons`; frontend memaparkan JSON itu dengan komponen React. Isi berbayar hanya keluar melalui RPC `guide_body` yang menyemak akses.

**Tech Stack:** Vite + React 19 + TypeScript, Supabase (Postgres, Auth, Storage), Cloudflare Pages Functions, Notion API (`Notion-Version: 2022-06-28`), Vitest (baru).

**Spec:** `docs/superpowers/specs/2026-11-23-panduan-notion-design.md`

## Global Constraints

- Rahsia hanya dalam Cloudflare Secret: `NOTION_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`. `NOTION_PANDUAN_DB_ID` = pemboleh ubah biasa. Tiada nilai rahsia dalam kod/commit.
- Satu request Function ≤ 50 subrequest (pelan percuma). `terbit` memproses **satu** halaman sahaja.
- Pemetaan Produk (tepat): `Percuma`→`null`, `Shopee AI Toolkit`→`toolkit`, `Shopee Ads Advanced`→`ads-advanced`, `Affiliate Advanced`→`affiliate-advanced`. Lain/kosong → ralat, tidak diterbitkan.
- Status Notion tepat: `Draf`, `Terbit`. Hanya `Terbit` diterbitkan.
- Bucket Storage `panduan`, baca awam, nama fail `<uuid>.<ext>`.
- Teks UI dalam Bahasa Melayu, guna "anda". Warna/font ikut `src/styles.css` sedia ada.
- Migrasi baru = `supabase/migrations/0003_panduan.sql`; RLS kekal pada semua jadual.

## Review Focus

1. Panduan > 100 block atau block bersarang (senarai dalam senarai, toggle) → semua isi muncul (pagination + rekursi). → Task 2 test `fetches all pages of children recursively`.
2. Produk kosong / tersalah eja di Notion → panduan **tidak** diterbitkan dan dilaporkan ✗, bukan jadi percuma. → Task 1 test `rejects unknown product`, Task 3 test `terbit returns error for unknown product`.
3. Ahli tanpa pembelian memanggil `guide_body` terus melalui API Supabase → `null`. → Task 4 langkah semakan SQL.
4. Teks Notion mengandungi `<script>` / HTML → dipapar sebagai teks biasa. → Task 5 test `renders html-like text as text`.
5. Panduan ditukar balik ke `Draf` atau dipadam di Notion → hilang dari app selepas Terbitkan. → Task 3 test `tarik-balik unpublishes missing pages`.

---

### Task 1: Vitest + penukar block Notion (tulen)

**Files:**
- Create: `lib/panduan/types.ts`, `lib/panduan/convert.ts`, `lib/panduan/convert.test.ts`, `vitest.config.ts`
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`), `tsconfig.json` & `functions/tsconfig.json` (`include` tambah `"../lib"` / `"lib"`)

**Interfaces:**
- Produces (`types.ts`):
  - `type Span = { text: string; bold?: true; italic?: true; strike?: true; underline?: true; code?: true; href?: string }`
  - `type GuideBlock =`
    `{ t: 'h1'|'h2'|'h3'|'p'|'quote'; spans: Span[] }` ·
    `{ t: 'ul'|'ol'; items: { spans: Span[]; children: GuideBlock[] }[] }` ·
    `{ t: 'todo'; checked: boolean; spans: Span[] }` ·
    `{ t: 'callout'; icon: string | null; spans: Span[]; children: GuideBlock[] }` ·
    `{ t: 'toggle'; spans: Span[]; children: GuideBlock[] }` ·
    `{ t: 'code'; language: string; text: string }` ·
    `{ t: 'divider' }` ·
    `{ t: 'image'; src: string; caption: Span[]; notionFile: boolean }` ·
    `{ t: 'youtube'; videoId: string }` ·
    `{ t: 'bookmark'; href: string }` ·
    `{ t: 'table'; header: boolean; rows: Span[][][] }`
  - `type NotionBlock = { id: string; type: string; has_children: boolean; children?: NotionBlock[]; [k: string]: unknown }`
- Produces (`convert.ts`):
  - `convertBlocks(blocks: NotionBlock[]): { blocks: GuideBlock[]; warnings: string[] }`
  - `toSpans(richText: unknown[]): Span[]`
  - `productSlug(name: string | null | undefined): { ok: true; slug: string | null } | { ok: false }`
  - `youtubeId(url: string): string | null`

- [ ] **Step 1:** `npm i -D vitest`; tambah script `test`; `vitest.config.ts` dengan `test.include: ['lib/**/*.test.ts', 'src/**/*.test.tsx', 'functions/**/*.test.ts']`.
- [ ] **Step 2: Tulis test gagal** dalam `convert.test.ts`:
  - `paragraph with bold and link` → `[{ t:'p', spans:[{text:'Hai '},{text:'kedai',bold:true,href:'https://x.com'}] }]`
  - `groups consecutive bulleted items into one ul with nested children`
  - `numbered_list_item becomes ol`
  - `image file keeps notionFile true; external false` (src = URL asal; Task 3 menggantikannya)
  - `video youtube.com/watch?v=abc123 and youtu.be/abc123 → youtube videoId 'abc123'`; video bukan YouTube → dilangkau + amaran
  - `unsupported block (child_database, column_list) skipped with warning containing its type`
  - `table rows map to Span[][][] with header flag`
  - `productSlug('Percuma') → {ok:true, slug:null}`, `productSlug('Shopee AI Toolkit') → toolkit`, `rejects unknown product`: `productSlug('Toolkit')` dan `productSlug(null)` → `{ok:false}`
- [ ] **Step 3:** `npm test` → FAIL (modul tiada).
- [ ] **Step 4:** Laksana `convert.ts`. Senarai berturut-turut (`bulleted_list_item`/`numbered_list_item`) dikumpul dalam satu `ul`/`ol`; `children` diambil dari `block.children` (sudah dimuatkan oleh Task 2). Warna Notion diabaikan.
- [ ] **Step 5:** `npm test` → PASS; `npm run build` → lulus.
- [ ] **Step 6: Commit** `feat(panduan): penukar block Notion + vitest`

### Task 2: Klien Notion + semakan admin

**Files:**
- Create: `lib/panduan/notion.ts`, `lib/panduan/admin.ts`, `lib/panduan/notion.test.ts`, `lib/panduan/admin.test.ts`

**Interfaces:**
- Consumes: `NotionBlock` (Task 1)
- Produces:
  - `type NotionPage = { id: string; lastEdited: string; title: string; summary: string; module: string; productName: string | null; order: number; status: string | null }`
  - `queryPanduan(token: string, dbId: string): Promise<NotionPage[]>` — POST `/v1/databases/{dbId}/query`, ikut `next_cursor`. Ruangan dibaca ikut nama tepat: `Tajuk`, `Ringkasan`, `Modul`, `Produk`, `Susunan`, `Status`.
  - `getPage(token: string, pageId: string): Promise<NotionPage>`
  - `fetchBlocks(token: string, blockId: string): Promise<NotionBlock[]>` — GET `/v1/blocks/{id}/children?page_size=100`, ikut `next_cursor`, dan untuk `has_children` (kecuali `child_page`, `child_database`) isi `children` secara rekursif.
  - `requireAdmin(request: Request, env: { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }): Promise<{ ok: true; userId: string } | { ok: false; response: Response }>` — token dari `Authorization: Bearer`, `GET {SUPABASE_URL}/auth/v1/user`, kemudian `GET /rest/v1/profiles?id=eq.<id>&select=is_admin`. Tiada token / bukan admin → 403 JSON `{ ralat: 'admin sahaja' }`. Header Supabase guna logik sama seperti `supabaseHeaders` dalam `functions/api/bcl-webhook.ts` (pindahkan ke `lib/panduan/supabase.ts` sebagai `serviceHeaders(env)` dan guna di kedua-dua tempat).

- [ ] **Step 1: Test gagal** (mock `globalThis.fetch` dengan `vi.fn`):
  - `fetches all pages of children recursively` — halaman 1 (`has_more:true`) + halaman 2; satu block `has_children` → `children` terisi; jumlah block = 101.
  - `queryPanduan maps properties` — termasuk `Produk` kosong → `productName: null`.
  - `requireAdmin rejects missing token` (403), `rejects non-admin` (403), `accepts admin` (`ok:true`).
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Laksana. Header Notion: `Authorization: Bearer <token>`, `Notion-Version: 2022-06-28`.
- [ ] **Step 4:** `npm test` → PASS; `npx tsc -p functions` → lulus; webhook masih lulus build.
- [ ] **Step 5: Commit** `feat(panduan): klien Notion dan semakan admin`

### Task 3: Endpoint terbit (senarai, terbit, tarik-balik)

**Files:**
- Create: `functions/api/panduan/senarai.ts`, `functions/api/panduan/terbit.ts`, `functions/api/panduan/tarik-balik.ts`, `lib/panduan/publish.ts`, `lib/panduan/publish.test.ts`

**Interfaces:**
- Consumes: Task 1 (`convertBlocks`, `productSlug`), Task 2 (`queryPanduan`, `getPage`, `fetchBlocks`, `requireAdmin`, `serviceHeaders`)
- Env: `NOTION_TOKEN`, `NOTION_PANDUAN_DB_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Produces (HTTP, semua perlu admin):
  - `GET /api/panduan/senarai` → `{ panduan: { pageId, tajuk, status, lastEdited, perluKemasKini: boolean }[] }` (`perluKemasKini` = status `Terbit` dan `lastEdited` ≠ `lessons.notion_edited_at`).
  - `POST /api/panduan/terbit?page=<id>` → `{ ok: true, amaran: string[] }` atau `{ ok: false, ralat: string }` (status 422 untuk Produk/Status tidak sah).
  - `POST /api/panduan/tarik-balik` → `{ ditarik: number }` — `published=false` bagi `lessons` `kind='panduan'` yang `notion_page_id` tiada dalam senarai `Terbit`.
- `publishPage(page: NotionPage, blocks: NotionBlock[], deps: { uploadImage(url: string): Promise<string | null>; upsertLesson(row: LessonRow): Promise<void> }): Promise<{ ok: true; amaran: string[] } | { ok: false; ralat: string }>` — logik tulen untuk diuji.
  - `LessonRow = { notion_page_id, notion_edited_at, kind: 'panduan', module, title, description, sort, product, body, published: true, url: null }`
  - Gambar `notionFile:true` → `uploadImage` (muat turun, `POST /storage/v1/object/panduan/<uuid>.<ext>`), ganti `src`. Gagal → buang block + amaran `Gambar gagal disalin`.

- [ ] **Step 1: Test gagal** untuk `publishPage`:
  - `terbit returns error for unknown product` → `{ ok:false }`, `upsertLesson` tidak dipanggil.
  - `skips Draf pages` → `{ ok:false, ralat }` mengandungi `Draf`.
  - `replaces notion image src with storage url`; `drops image and warns when upload fails`.
  - `upsert row has kind panduan, product slug, url null`.
  - `tarik-balik unpublishes missing pages` — fungsi tulen `pagesToUnpublish(published: string[], terbit: string[]): string[]`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Laksana `publish.ts` dan tiga endpoint (endpoint nipis: `requireAdmin` → panggil lib → `Response.json`).
- [ ] **Step 4:** `npm test` → PASS; `npx tsc -p functions` → lulus.
- [ ] **Step 5: Commit** `feat(panduan): endpoint terbit dari Notion`

### Task 4: Migrasi `0003_panduan.sql`

**Files:**
- Create: `supabase/migrations/0003_panduan.sql`

**Interfaces:**
- Produces: lajur `lessons.notion_page_id text unique`, `notion_edited_at timestamptz`, `body jsonb`; `url` nullable; `kind` check termasuk `'panduan'`; fungsi `public.guide_body(p_id bigint) returns jsonb`; bucket `panduan` (awam); `update lessons set published=false where kind='ebook'`.
- `guide_body`: `security definer`, `stable`; pulang `body` hanya jika `auth.uid() is not null and published and (product is null or has_product(product))`, atau `is_admin()`; selainnya `null`. `revoke execute ... from anon` dan `grant execute ... to authenticated`.
- `lesson_catalog()` **tidak diubah** (tidak memulangkan `body`).

- [ ] **Step 1:** Tulis SQL (idempotent: `if not exists`, `drop constraint if exists`, `on conflict do nothing` untuk bucket `storage.buckets(id, name, public)`).
- [ ] **Step 2: Semakan** — tulis di hujung fail sebagai komen blok "SEMAKAN SELEPAS RUN" tiga query yang pemilik boleh jalankan: (a) `select guide_body(<id berbayar>)` sebagai pengguna biasa → `null`; (b) senarai policy `lessons`; (c) bucket `panduan` wujud dan `public = true`.
- [ ] **Step 3: Commit** `feat(panduan): migrasi 0003`

### Task 5: Paparan ahli — tab Panduan & halaman bacaan

**Files:**
- Create: `src/components/GuideRenderer.tsx`, `src/components/GuideRenderer.test.tsx`, `src/pages/GuidePage.tsx`
- Modify: `src/App.tsx` (route `/ahli/panduan` → `<Lessons kind="panduan" />`, `/ahli/panduan/:id` → `<GuidePage />`, `/ahli/ebook` → `<Navigate to="/ahli/panduan" replace />`), `src/components/MemberLayout.tsx` (tab "Ebook" → "Panduan"), `src/lib/supabase.ts` (`Lesson['kind']` tambah `'panduan'`, `url: string | null`), `src/components/LessonList.tsx` (item `panduan` yang dibuka → `<Link to={'/ahli/panduan/' + id}>`), `src/pages/MemberHome.tsx` (kad Ebook → Panduan), `src/styles.css` (gaya `.guide`)

**Interfaces:**
- Consumes: `GuideBlock`, `Span` (Task 1); RPC `guide_body` (Task 4); `useCatalog` sedia ada
- Produces: `GuideRenderer({ blocks }: { blocks: GuideBlock[] }): JSX.Element`

- [ ] **Step 1: Test gagal** (`react-dom/server` `renderToStaticMarkup`, tiada pakej baru):
  - `renders headings, lists and bold text`
  - `renders html-like text as text` — span `'<script>alert(1)</script>'` → output mengandungi `&lt;script&gt;`, tiada `<script>`.
  - `youtube block renders iframe src https://www.youtube-nocookie.com/embed/<id>`
  - `link spans open in new tab with rel noreferrer`
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Laksana `GuideRenderer` (tiada `dangerouslySetInnerHTML`), `GuidePage`: muat `useCatalog`, cari panduan ikut `id`; berkunci → kad beli (`products[slug]`); dibuka → `supabase.rpc('guide_body', { p_id })` → render. Berbayar → baris `Untuk kegunaan {email} sahaja` di bawah tajuk dan di hujung. Butang Sebelum/Seterusnya = panduan bersebelahan dalam modul sama (susunan `sort`).
- [ ] **Step 4:** `npm test` → PASS; `npm run build` → lulus.
- [ ] **Step 5:** Playwright pada `vite preview` dengan `page.route` memalsukan `**/rest/v1/rpc/lesson_catalog` dan `**/rest/v1/rpc/guide_body` serta sesi log masuk palsu dalam `localStorage`: screenshot halaman senarai & bacaan (telefon 390px) → tunjuk kepada pemilik.
- [ ] **Step 6: Commit** `feat(panduan): tab Panduan dan halaman bacaan`

### Task 6: Kad Panduan di dashboard admin

**Files:**
- Create: `src/components/PublishGuides.tsx`
- Modify: `src/pages/AdminDashboard.tsx` (letak kad di bawah statistik)

**Interfaces:**
- Consumes: endpoint Task 3; token dari `supabase.auth.getSession()`
- Produces: `PublishGuides(): JSX.Element` — butang **Terbitkan dari Notion**; panggil `senarai`, kemudian `terbit` satu demi satu untuk `perluKemasKini`, kemudian `tarik-balik`; senarai baris dengan ikon ✓ diterbitkan / ↷ tiada perubahan / ⚠ amaran (tunjuk teks) / ✗ ralat; butang dimatikan semasa berjalan; pautan "Buka database Notion".

- [ ] **Step 1:** Laksana.
- [ ] **Step 2:** `npm run build` → lulus; Playwright dengan `page.route` memalsukan tiga endpoint (satu ✓, satu ↷, satu ✗) → screenshot.
- [ ] **Step 3: Commit** `feat(panduan): butang Terbitkan di dashboard`

### Task 7: Database Notion, setup pemilik, ujian preview, PR

**Files:**
- Modify: `README.md` (bahagian "Panduan dari Notion": langkah integration + env), `CLAUDE.md` (fakta projek: Panduan, `NOTION_TOKEN`, `NOTION_PANDUAN_DB_ID`)

- [ ] **Step 1:** Cipta database Notion **Panduan Mula Shopee** di bawah halaman *MulaShopee App* (Notion MCP) dengan ruangan & pilihan tepat seperti Global Constraints, serta 3 contoh: 1 Percuma `Terbit`, 1 `Shopee AI Toolkit` `Terbit`, 1 Percuma `Draf`. Catat ID database.
- [ ] **Step 2:** Push branch; buka PR. Beri pemilik langkah: cipta integration (baca sahaja) → token terus ke Cloudflare Secret `NOTION_TOKEN` (Production **dan** Preview); tambah `NOTION_PANDUAN_DB_ID`; kongsi database dengan integration; jalankan `0003_panduan.sql`.
- [ ] **Step 3: Ujian pada link preview** (pemilik + Claude, ikut spec §6): Terbitkan → 2 ✓, draf tidak muncul; akaun tanpa pembelian: panduan percuma boleh dibaca, panduan Toolkit berkunci, `guide_body` → `null`; admin baca semua; tukar satu panduan ke `Draf` → Terbitkan → hilang; buka semula selepas 1 jam → gambar masih ada; panggil `/api/panduan/senarai` tanpa log masuk → 403.
- [ ] **Step 4:** `verification-before-completion`: `npm test`, `npm run build`, `npx tsc -p functions` semua lulus; tunjuk bukti. Pemilik merge.
