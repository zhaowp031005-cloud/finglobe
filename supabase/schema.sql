create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  title text not null,
  summary text not null,
  latest_updates text not null,
  category text not null,
  lat double precision not null,
  lng double precision not null,
  impact jsonb not null,
  sources jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists events_fingerprint_uidx on public.events (fingerprint);
create index if not exists events_occurred_at_idx on public.events (occurred_at desc);
create index if not exists events_category_idx on public.events (category);
