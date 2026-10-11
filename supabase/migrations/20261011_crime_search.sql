begin;
-- A discovered search result has no independently checked publication date.
alter table public.incident_imports alter column published_at drop not null;
create table public.crime_search_state (
    id integer primary key check (id = 1),
    last_started_at timestamptz,
    last_status text,
    last_error text
);
insert into public.crime_search_state(id) values(1);
alter table public.crime_search_state enable row level security;
revoke all on public.crime_search_state from anon, authenticated;
grant all on public.crime_search_state to service_role;
create function public.claim_crime_search() returns boolean
language plpgsql security definer set search_path='' as $$
declare claimed integer;
begin
    update public.crime_search_state set last_started_at=now(),last_status='running',last_error=null
    where id=1 and (last_started_at is null or last_started_at < now()-interval '1 hour');
    get diagnostics claimed = row_count;
    return claimed = 1;
end;
$$;
revoke all on function public.claim_crime_search() from public, anon, authenticated;
grant execute on function public.claim_crime_search() to service_role;
commit;
