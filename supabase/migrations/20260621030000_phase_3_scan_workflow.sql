create or replace function public.start_scan(scan_url text)
returns table (
  scan_id uuid,
  remaining_credits integer,
  credits_deducted boolean
)
language plpgsql
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  current_user_id uuid := auth.uid();
  inserted_scan_id uuid;
  normalized_url text := btrim(scan_url);
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if normalized_url is null or normalized_url = '' then
    raise exception 'Scan URL is required';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = current_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if lower(coalesce(current_profile.subscription_tier, 'none')) <> 'pro' then
    if coalesce(current_profile.scan_credits, 0) <= 0 then
      raise exception 'No scan credits available';
    end if;

    update public.profiles
    set scan_credits = scan_credits - 1
    where id = current_user_id
    returning scan_credits into remaining_credits;

    credits_deducted := true;
  else
    remaining_credits := coalesce(current_profile.scan_credits, 0);
    credits_deducted := false;
  end if;

  insert into public.scans (
    user_id,
    url,
    status
  )
  values (
    current_user_id,
    normalized_url,
    'pending'
  )
  returning id into inserted_scan_id;

  scan_id := inserted_scan_id;

  return next;
end;
$$;

grant execute on function public.start_scan(text) to authenticated;

create or replace function public.get_share_report(requested_scan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  report_payload jsonb;
begin
  select jsonb_build_object(
    'scan',
    jsonb_build_object(
      'id', scans.id,
      'url', scans.url,
      'status', scans.status,
      'created_at', scans.created_at,
      'completed_at', scans.completed_at
    ),
    'counts',
    jsonb_build_object(
      'critical', coalesce(sum(case when lower(findings.severity) = 'critical' then 1 else 0 end), 0),
      'high', coalesce(sum(case when lower(findings.severity) = 'high' then 1 else 0 end), 0),
      'medium', coalesce(sum(case when lower(findings.severity) = 'medium' then 1 else 0 end), 0),
      'low', coalesce(sum(case when lower(findings.severity) = 'low' then 1 else 0 end), 0),
      'info', coalesce(sum(case when lower(findings.severity) not in ('critical', 'high', 'medium', 'low') then 1 else 0 end), 0)
    ),
    'findings',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', findings.id,
          'scan_id', findings.scan_id,
          'category', findings.category,
          'severity', findings.severity,
          'title', findings.title,
          'description', findings.description,
          'evidence', findings.evidence,
          'location', findings.location
        )
        order by
          case lower(findings.severity)
            when 'critical' then 1
            when 'high' then 2
            when 'medium' then 3
            when 'low' then 4
            else 5
          end,
          findings.title
      ) filter (where findings.id is not null),
      '[]'::jsonb
    )
  )
  into report_payload
  from public.scans
  left join public.findings on findings.scan_id = scans.id
  where scans.id = requested_scan_id
  group by scans.id;

  return report_payload;
end;
$$;

grant execute on function public.get_share_report(uuid) to anon, authenticated;
