-- Mula Shopee — model percuma + berbayar
-- Jalankan sekali dalam Supabase: SQL Editor → New query → tampal → Run.
--
-- Percuma : semua yang daftar akaun (lessons.product kosong)
-- Berbayar: setiap produk dibuka bila ada jualan 'paid' untuk email itu
--           (orders.product). Pembeli 'coaching' dapat semua produk.

-- ============================================================
-- 1. Produk
-- ============================================================
create table if not exists public.products (
  slug          text primary key,
  title         text not null,
  description   text,
  price_label   text,
  checkout_url  text,
  available     boolean not null default true,  -- false = "akan datang"
  sort          int not null default 0
);

insert into public.products (slug, title, description, price_label, checkout_url, available, sort) values
  ('toolkit',            'Shopee AI Toolkit',                  'Prompt, template dan tools AI untuk percepatkan kerja kedai Shopee.', 'RM17', 'https://mulashopee.bcl.my/form/shopee-ai-toolkit',             true,  1),
  ('ads-advanced',       'Rakaman Shopee Ads Advanced',        'Rakaman webinar Kuasai Shopee GMV Max + bonus.',                     'RM59', 'https://mulashopee.bcl.my/form/rakaman-kuasai-shopee-gmv-max', true,  2),
  ('affiliate-advanced', 'Rakaman Affiliate Marketing Advanced','Strategi Shopee Affiliate tahap lanjutan.',                         null,   null,                                                          false, 3),
  ('coaching',           'Personal Coaching',                  'Bimbingan terus bersama coach. Termasuk semua kandungan berbayar.',  'RM2,000', 'https://mulashopee.bcl.my/form/personal-coaching-shopee-marketing', true, 9)
on conflict (slug) do nothing;

alter table public.products enable row level security;
drop policy if exists "semua boleh lihat produk" on public.products;
create policy "semua boleh lihat produk" on public.products for select using (true);
drop policy if exists "admin urus produk" on public.products;
create policy "admin urus produk" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 2. Lajur produk pada jualan & pelajaran
-- ============================================================
alter table public.orders  add column if not exists product text not null default 'toolkit';
alter table public.lessons add column if not exists product text references public.products (slug);
-- lessons.product kosong (null) = percuma untuk semua yang daftar

-- ============================================================
-- 3. Semakan akses
-- ============================================================
create or replace function public.has_product(p text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.orders o
    where o.status = 'paid'
      and lower(o.email) = lower(auth.jwt() ->> 'email')
      and (o.product = p or o.product = 'coaching')
  );
$$;

-- Senarai pelajaran untuk Ruang Ahli: semua tajuk kelihatan (untuk tarik
-- upgrade), tetapi link hanya diberi jika pelajaran dibuka.
create or replace function public.lesson_catalog()
returns table (
  id bigint, kind text, module text, title text, description text,
  sort int, product text, unlocked boolean, url text
)
language sql stable security definer set search_path = public
as $$
  select l.id, l.kind, l.module, l.title, l.description, l.sort, l.product,
         ok.unlocked,
         case when ok.unlocked then l.url end
  from public.lessons l
  cross join lateral (
    select (l.product is null or public.has_product(l.product)) as unlocked
  ) ok
  where (l.published or public.is_admin())
    and auth.uid() is not null
  order by l.product nulls first, l.module, l.sort;
$$;

-- Bacaan terus jadual lessons ikut peraturan yang sama.
drop policy if exists "ahli baca pelajaran" on public.lessons;
create policy "ahli baca pelajaran" on public.lessons
  for select using (
    public.is_admin()
    or (published and auth.uid() is not null and (product is null or public.has_product(product)))
  );

-- ============================================================
-- 4. Dashboard: pengguna percuma vs pembeli
-- ============================================================
create or replace function public.sales_summary()
returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  tz constant text := 'Asia/Kuala_Lumpur';
  today_start      timestamptz := date_trunc('day',   now() at time zone tz) at time zone tz;
  yesterday_start  timestamptz := today_start - interval '1 day';
  month_start      timestamptz := date_trunc('month', now() at time zone tz) at time zone tz;
  last_month_start timestamptz := month_start - interval '1 month';
  last_month_same  timestamptz := last_month_start + (now() - month_start);
  result json;
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;

  select json_build_object(
    'today_total',      coalesce(sum(amount) filter (where paid_at >= today_start), 0),
    'today_count',      count(*)             filter (where paid_at >= today_start),
    'yesterday_total',  coalesce(sum(amount) filter (where paid_at >= yesterday_start and paid_at < today_start), 0),
    'month_total',      coalesce(sum(amount) filter (where paid_at >= month_start), 0),
    'month_count',      count(*)             filter (where paid_at >= month_start),
    'last_month_total', coalesce(sum(amount) filter (where paid_at >= last_month_start and paid_at < last_month_same), 0),
    'users_total',      (select count(*) from public.profiles where not is_admin),
    'users_month',      (select count(*) from public.profiles where not is_admin and created_at >= month_start),
    'buyers_total',     (select count(distinct lower(email)) from public.orders where status = 'paid')
  )
  into result
  from public.orders
  where status = 'paid' and paid_at >= last_month_start;

  return result;
end;
$$;

-- ============================================================
-- 5. Contoh kandungan: yang sedia ada jadi percuma, tambah contoh berbayar
-- ============================================================
update public.lessons set module = '1. Mula Jual (Percuma)' where module in ('1. Buka Kedai', '2. Produk') and product is null;
update public.lessons set module = '2. Marketing Tools (Percuma)' where module = '3. Trafik' and product is null;

insert into public.lessons (kind, module, title, description, url, sort, product)
select * from (values
  ('video', 'Shopee Ads Advanced',         'Kuasai Shopee GMV Max (rakaman penuh)', 'Rakaman webinar + bonus.',             'https://www.youtube.com/', 1, 'ads-advanced'),
  ('video', 'Affiliate Marketing Advanced', 'Strategi Shopee Affiliate lanjutan',    'Akan datang.',                          'https://www.youtube.com/', 1, 'affiliate-advanced'),
  ('ebook', 'Shopee AI Toolkit',            'Koleksi prompt AI untuk penjual Shopee', 'Tajuk, deskripsi, skrip Live & iklan.', 'https://example.com/toolkit.pdf', 1, 'toolkit')
) as v(kind, module, title, description, url, sort, product)
where not exists (select 1 from public.lessons where product is not null);
