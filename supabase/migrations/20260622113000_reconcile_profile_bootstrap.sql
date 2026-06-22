-- Reconcile the auth -> profiles bootstrap path and backfill any users who
-- were created without a matching public.profiles row.

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
  on conflict (id) do update
  set email = excluded.email
  where public.profiles.email is distinct from excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (
  id,
  email,
  subscription_status,
  subscription_tier,
  scan_credits
)
select
  auth_user.id,
  coalesce(auth_user.email, ''),
  'free',
  'none',
  0
from auth.users as auth_user
left join public.profiles as profile
  on profile.id = auth_user.id
where profile.id is null;
