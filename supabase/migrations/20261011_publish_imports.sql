begin;
create table public.published_incidents (
    id uuid primary key references public.incident_imports(id),
    incident_type text not null,
    location text not null check (length(location) between 3 and 300),
    latitude double precision not null check (latitude between -30 and -27),
    longitude double precision not null check (longitude between 23 and 26),
    severity text not null check (severity in ('safe','moderate','risky')),
    description text not null,
    occurred_at timestamptz not null check (occurred_at <= now()),
    expires_at timestamptz not null,
    source_url text not null,
    source_name text not null,
    location_precision text not null check (location_precision in ('exact','approximate')),
    created_at timestamptz not null default now(),
    check (expires_at > occurred_at)
);
alter table public.published_incidents enable row level security;
revoke all on public.published_incidents from anon, authenticated;
grant select on public.published_incidents to authenticated;
grant all on public.published_incidents to service_role;
create policy active_imports_read on public.published_incidents for select to authenticated using (expires_at > now());

-- Invoke only from a trusted reviewer backend or the SQL editor, never the browser.
create function public.approve_incident_import(
    import_id uuid, checked_location text, checked_lat double precision,
    checked_lng double precision, checked_time timestamptz,
    expiry timestamptz, precision_label text, checked_severity text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare report public.incident_imports;
begin
    select * into report from public.incident_imports where id = import_id for update;
    if not found or report.status <> 'pending_review' then
        raise exception 'Report is missing or no longer pending';
    end if;
    if checked_time > now() or expiry <= now() or expiry > now() + interval '7 days' then
        raise exception 'Check event time and use an expiry within seven days';
    end if;
    insert into public.published_incidents(id,incident_type,location,latitude,longitude,severity,
        description,occurred_at,expires_at,source_url,source_name,location_precision)
    values (report.id,report.extraction->>'incident_type',checked_location,checked_lat,checked_lng,
        checked_severity,report.extraction->>'summary',checked_time,expiry,report.source_url,report.source_name,precision_label);
    update public.incident_imports set status = 'approved' where id = import_id;
    return import_id;
end;
$$;
revoke all on function public.approve_incident_import(uuid,text,double precision,double precision,timestamptz,timestamptz,text,text) from public, anon, authenticated;
grant execute on function public.approve_incident_import(uuid,text,double precision,double precision,timestamptz,timestamptz,text,text) to service_role;
commit;
