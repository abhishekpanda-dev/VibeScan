alter table public.findings
  add column if not exists icon text,
  add column if not exists owasp text,
  add column if not exists exploitability text,
  add column if not exists data_exposed text,
  add column if not exists cvss_score text,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'evidence'
      and data_type <> 'jsonb'
  ) then
    alter table public.findings
      alter column evidence type jsonb
      using case
        when evidence is null or btrim(evidence) = '' then null
        else jsonb_build_array(
          jsonb_build_object(
            'label', 'EVIDENCE',
            'content', evidence,
            'highlight', false
          )
        )
      end;
  end if;
end $$;

create index if not exists findings_scan_id_severity_idx
  on public.findings (scan_id, severity);
