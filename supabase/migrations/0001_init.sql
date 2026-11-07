-- Mula Shopee — skema awal
-- Jalankan sekali dalam Supabase: SQL Editor → New query → tampal → Run.

-- ============================================================
-- 1. Profil ahli (satu baris untuk setiap akaun login)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  is_member   boolean not null default false,  -- dah bayar kursus
  is_admin    boolean not null default false,  -- boleh buka dashboard
  created_at  timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (lower(email));

-- ============================================================
-- 2. Jualan (diisi oleh webhook BCL)
-- ============================================================
create table if not exists public.orders (
  id          bigint generated always as identity primary key,
  order_no    text not null unique,
  email       text,
  name        text,
  phone       text,
  amount      numeric(12, 2) not null default 0,
  status      text not null default 'pending',  -- pending | paid | failed
  paid_at     timestamptz,
  raw         jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists orders_paid_at_idx on public.orders (paid_at) where status = 'paid';
create index if not exists orders_email_idx on public.orders (lower(email));

-- ============================================================
-- 3. Kandungan kursus (video & ebook)
-- ============================================================
create table if not exists public.lessons (
  id           bigint generated always as identity primary key,
  kind         text not null check (kind in ('video', 'ebook')),
  module       text not null default 'Asas',
  title        text not null,
  description  text,
  url          text not null,             -- link YouTube unlisted / Vimeo / PDF
  sort         int not null default 0,
  published    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 4. Fungsi bantu
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_member or is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Bila orang daftar akaun: cipta profil. Kalau email dia dah ada jualan
-- berbayar (beli dulu, daftar kemudian), terus jadikan ahli.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_member)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    exists (select 1 from public.orders o
            where lower(o.email) = lower(new.email) and o.status = 'paid')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bila jualan bertukar 'paid': jadikan pemilik email itu ahli
-- (daftar dulu, beli kemudian).
create or replace function public.handle_paid_order()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'paid' and new.email is not null then
    update public.profiles set is_member = true
    where lower(email) = lower(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists on_order_paid on public.orders;
create trigger on_order_paid
  after insert or update of status on public.orders
  for each row execute function public.handle_paid_order();

-- Ringkasan jualan untuk dashboard (waktu Malaysia).
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
  -- bulan lepas dibandingkan pada tempoh yang sama (hari 1 hingga hari ini)
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
    'members_total',    (select count(*) from public.profiles where is_member),
    'members_month',    (select count(*) from public.profiles where is_member and created_at >= month_start)
  )
  into result
  from public.orders
  where status = 'paid' and paid_at >= last_month_start;

  return result;
end;
$$;

-- ============================================================
-- 5. Keselamatan (Row Level Security)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.orders   enable row level security;
alter table public.lessons  enable row level security;

drop policy if exists "profil sendiri atau admin" on public.profiles;
create policy "profil sendiri atau admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "admin urus profil" on public.profiles;
create policy "admin urus profil" on public.profiles
  for update using (public.is_admin());

drop policy if exists "admin baca jualan" on public.orders;
create policy "admin baca jualan" on public.orders
  for select using (public.is_admin());
-- Tiada policy insert/update untuk orders: hanya webhook (service role) boleh tulis.

drop policy if exists "ahli baca pelajaran" on public.lessons;
create policy "ahli baca pelajaran" on public.lessons
  for select using ((published and public.is_member()) or public.is_admin());

drop policy if exists "admin urus pelajaran" on public.lessons;
create policy "admin urus pelajaran" on public.lessons
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 6. Contoh kandungan (boleh padam / ubah dalam Table Editor)
-- ============================================================
insert into public.lessons (kind, module, title, description, url, sort)
select * from (values
  ('video', '1. Buka Kedai',   'Daftar akaun Shopee Seller',         'Langkah demi langkah daftar dan sahkan kedai.', 'https://www.youtube.com/', 1),
  ('video', '1. Buka Kedai',   'Setting kedai yang wajib',            'Profil kedai, shipping, bank dan polisi.',       'https://www.youtube.com/', 2),
  ('video', '2. Produk',       'Upload produk pertama',               'Gambar, variasi, harga dan stok.',               'https://www.youtube.com/', 3),
  ('video', '2. Produk',       'Tajuk & SEO Shopee',                  'Cara tulis tajuk yang mudah dijumpai.',          'https://www.youtube.com/', 4),
  ('video', '3. Trafik',       'Asas Shopee Ads',                     'Bajet kecil, keyword dan baca report.',          'https://www.youtube.com/', 5),
  ('video', '3. Trafik',       'Shopee Live & Video',                 'Skrip ringkas dan rutin live.',                  'https://www.youtube.com/', 6),
  ('ebook', 'Template',        'Senarai semak buka kedai',            'PDF checklist dari kosong hingga jualan pertama.', 'https://example.com/checklist.pdf', 1),
  ('ebook', 'Template',        'Kalkulator untung & fi Shopee',       'Kira margin selepas komisen dan fi.',            'https://example.com/kalkulator.pdf', 2)
) as v(kind, module, title, description, url, sort)
where not exists (select 1 from public.lessons);
