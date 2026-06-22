alter table public.scans
  add column if not exists critical_count integer not null default 0,
  add column if not exists high_count integer not null default 0,
  add column if not exists medium_count integer not null default 0,
  add column if not exists low_count integer not null default 0,
  add column if not exists pass_count integer not null default 0;
