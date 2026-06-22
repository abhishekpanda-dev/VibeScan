alter table public.scans
  add column if not exists security_score integer not null default 0;
