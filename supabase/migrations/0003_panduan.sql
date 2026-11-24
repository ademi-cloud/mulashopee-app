-- Mula Shopee — Panduan (ebook dalam app) diterbitkan dari Notion
-- Jalankan sekali dalam Supabase: SQL Editor → New query → tampal → Run.

-- ============================================================
-- 1. Lajur baru pada lessons
-- ============================================================
alter table public.lessons drop constraint if exists lessons_kind_check;
alter table public.lessons add constraint lessons_kind_check check (kind in ('video', 'ebook', 'panduan'));

alter table public.lessons alter column url drop not null;  -- panduan tiada link luar

alter table public.lessons add column if not exists notion_page_id   text;
alter table public.lessons add column if not exists notion_edited_at timestamptz;
alter table public.lessons add column if not exists body             jsonb;

create unique index if not exists lessons_notion_page_id_key on public.lessons (notion_page_id);

-- Ebook lama (link contoh) disembunyikan; digantikan oleh Panduan.
update public.lessons set published = false where kind = 'ebook';

-- ============================================================
-- 2. Isi panduan — hanya untuk yang layak
-- ============================================================
-- lesson_catalog() tidak memulangkan body. Isi diambil melalui fungsi ini,
-- yang semak akses sama seperti link pelajaran berbayar.
create or replace function public.guide_body(p_id bigint)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select l.body
  from public.lessons l
  where l.id = p_id
    and auth.uid() is not null
    and (
      public.is_admin()
      or (l.published and (l.product is null or public.has_product(l.product)))
    );
$$;

revoke execute on function public.guide_body(bigint) from public, anon;
grant execute on function public.guide_body(bigint) to authenticated;

-- Bacaan terus jadual lessons (termasuk body) sudah dihadkan oleh policy
-- "ahli baca pelajaran": berbayar hanya untuk pembeli, dan perlu log masuk.

-- ============================================================
-- 3. Storage untuk gambar panduan (baca awam, nama fail rawak)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('panduan', 'panduan', true)
on conflict (id) do nothing;
-- Tiada policy insert/update: hanya Cloudflare Functions (service key) memuat naik.

-- ============================================================
-- SEMAKAN SELEPAS RUN (pilihan — jalankan satu demi satu)
-- ============================================================
-- (a) Struktur:      select column_name from information_schema.columns
--                    where table_name = 'lessons' and column_name in ('notion_page_id','notion_edited_at','body');
--                    → 3 baris
-- (b) Bucket:        select id, public from storage.buckets where id = 'panduan';
--                    → panduan | true
-- (c) Tanpa log masuk, guide_body tidak boleh dipanggil:
--                    set role anon; select public.guide_body(1); reset role;
--                    → ralat "permission denied for function guide_body"
