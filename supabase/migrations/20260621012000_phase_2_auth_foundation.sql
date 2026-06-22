create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  subscription_status text not null default 'free',
  subscription_tier text not null default 'none',
  scan_credits integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  category text not null,
  severity text not null,
  title text not null,
  description text not null,
  evidence text,
  location text,
  fix_markdown text
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists scans_user_id_created_at_idx on public.scans (user_id, created_at desc);
create index if not exists findings_scan_id_idx on public.findings (scan_id);

alter table public.profiles enable row level security;
alter table public.scans enable row level security;
alter table public.findings enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "scans_select_own" on public.scans;
create policy "scans_select_own"
on public.scans
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "scans_insert_own" on public.scans;
create policy "scans_insert_own"
on public.scans
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "scans_update_own" on public.scans;
create policy "scans_update_own"
on public.scans
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "scans_delete_own" on public.scans;
create policy "scans_delete_own"
on public.scans
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "findings_select_via_owned_scan" on public.findings;
create policy "findings_select_via_owned_scan"
on public.findings
for select
to authenticated
using (
  exists (
    select 1
    from public.scans
    where public.scans.id = public.findings.scan_id
      and public.scans.user_id = auth.uid()
  )
);

drop policy if exists "findings_insert_via_owned_scan" on public.findings;
create policy "findings_insert_via_owned_scan"
on public.findings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.scans
    where public.scans.id = public.findings.scan_id
      and public.scans.user_id = auth.uid()
  )
);

drop policy if exists "findings_update_via_owned_scan" on public.findings;
create policy "findings_update_via_owned_scan"
on public.findings
for update
to authenticated
using (
  exists (
    select 1
    from public.scans
    where public.scans.id = public.findings.scan_id
      and public.scans.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.scans
    where public.scans.id = public.findings.scan_id
      and public.scans.user_id = auth.uid()
  )
);

drop policy if exists "findings_delete_via_owned_scan" on public.findings;
create policy "findings_delete_via_owned_scan"
on public.findings
for delete
to authenticated
using (
  exists (
    select 1
    from public.scans
    where public.scans.id = public.findings.scan_id
      and public.scans.user_id = auth.uid()
  )
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    subscription_status,
    subscription_tier,
    scan_credits
  )
  values (
    new.id,
    coalesce(new.email, ''),
    'free',
    'none',
    0
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
