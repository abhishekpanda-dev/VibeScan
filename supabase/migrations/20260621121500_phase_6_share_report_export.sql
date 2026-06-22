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
      'completed_at', scans.completed_at,
      'pass_count', coalesce(scans.pass_count, 0),
      'security_score', coalesce(scans.security_score, 0)
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
