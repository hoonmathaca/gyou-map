-- =====================================================================
--  교우의 집 지도 — Supabase 스키마 (여러 번 실행해도 안전)
--  tables : places(가게) · reviews(리뷰) · reports(신고)
--  storage: stickers 버킷 (교우의 집 스티커 사진, 공개 읽기)
--  rpc    : report_place() — 신고 기록 + 3건 누적 시 자동 숨김
-- =====================================================================
create extension if not exists "pgcrypto";

-- ── 가게 ─────────────────────────────────────────────────────────────
create table if not exists public.places (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text not null check (char_length(btrim(name)) between 1 and 40),
  baptismal_name  text check (baptismal_name is null or char_length(btrim(baptismal_name)) between 1 and 20),
  category        text not null,
  address         text not null check (char_length(address) between 1 and 200),
  address_detail  text check (address_detail is null or char_length(address_detail) <= 60),
  lat             double precision not null check (lat between -90 and 90),
  lng             double precision not null check (lng between -180 and 180),
  intro           text check (intro is null or char_length(intro) <= 120),
  sticker_url     text not null,
  registrant_type text not null default 'owner' check (registrant_type in ('owner', 'visitor')),
  report_count    integer not null default 0,
  manual_hidden   boolean not null default false,
  auto_hidden     boolean not null default false,
  hidden          boolean not null default false
);
create index if not exists places_created_idx on public.places (created_at desc);
create index if not exists places_category_idx on public.places (category);
create index if not exists places_hidden_idx on public.places (hidden);

-- ── 리뷰 ─────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  place_id       uuid not null references public.places (id) on delete cascade,
  nickname       text not null check (char_length(btrim(nickname)) between 1 and 24),
  baptismal_name text check (baptismal_name is null or char_length(btrim(baptismal_name)) <= 20),
  rating         smallint not null check (rating between 1 and 5),
  content        text not null check (char_length(btrim(content)) between 1 and 500),
  hidden         boolean not null default false
);
create index if not exists reviews_place_idx on public.reviews (place_id, created_at desc);

-- ── 신고 ─────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  place_id     uuid not null references public.places (id) on delete cascade,
  reason       text not null check (char_length(btrim(reason)) between 1 and 40),
  detail       text check (detail is null or char_length(detail) <= 200),
  reporter_key text not null,
  unique (place_id, reporter_key)
);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.places  enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;

drop policy if exists places_public_read on public.places;
create policy places_public_read on public.places
  for select to anon, authenticated using (hidden = false);

drop policy if exists places_public_insert on public.places;
create policy places_public_insert on public.places
  for insert to anon, authenticated
  with check (hidden = false and manual_hidden = false and auto_hidden = false
              and report_count = 0 and registrant_type in ('owner', 'visitor'));

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (hidden = false and exists (select 1 from public.places p where p.id = place_id and p.hidden = false));

drop policy if exists reviews_public_insert on public.reviews;
create policy reviews_public_insert on public.reviews
  for insert to anon, authenticated
  with check (hidden = false and rating between 1 and 5
              and exists (select 1 from public.places p where p.id = place_id and p.hidden = false));

-- 신고는 아래 RPC 로만 들어온다
revoke all on public.reports from anon, authenticated;
grant select, insert on public.places to anon, authenticated;
grant select, insert on public.reviews to anon, authenticated;
revoke update, delete on public.places from anon, authenticated;
revoke update, delete on public.reviews from anon, authenticated;

-- ── 신고 접수 + 3건 누적 시 자동 숨김 ───────────────────────────────
create or replace function public.report_place(
  p_place_id uuid, p_reason text, p_detail text default null, p_key text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rows integer := 0; v_count integer := 0; v_manual boolean := false;
begin
  if p_place_id is null then raise exception 'place_not_found' using errcode = 'P0002'; end if;
  if p_key is null or length(btrim(p_key)) < 8 then raise exception 'reporter_key_required' using errcode = '22023'; end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then raise exception 'reason_required' using errcode = '22023'; end if;

  select manual_hidden into v_manual from public.places where id = p_place_id;
  if not found then raise exception 'place_not_found' using errcode = 'P0002'; end if;

  insert into public.reports (place_id, reason, detail, reporter_key)
  values (p_place_id, left(btrim(p_reason), 40),
          nullif(left(btrim(coalesce(p_detail, '')), 200), ''), left(btrim(p_key), 64))
  on conflict (place_id, reporter_key) do nothing;
  get diagnostics v_rows = row_count;

  select count(*) into v_count from public.reports where place_id = p_place_id;

  update public.places
     set report_count = v_count,
         auto_hidden  = v_count >= 3,
         hidden       = coalesce(v_manual, false) or v_count >= 3
   where id = p_place_id;

  return jsonb_build_object('count', v_count, 'hidden', coalesce(v_manual, false) or v_count >= 3,
                            'already', v_rows = 0);
end $$;
grant execute on function public.report_place(uuid, text, text, text) to anon, authenticated;

-- ── 스티커 사진 저장소 ───────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stickers', 'stickers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists stickers_public_upload on storage.objects;
create policy stickers_public_upload on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'stickers');

drop policy if exists stickers_public_read on storage.objects;
create policy stickers_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'stickers');
