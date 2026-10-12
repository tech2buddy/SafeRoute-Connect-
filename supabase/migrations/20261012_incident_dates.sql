begin;
-- Enforce the rule on inserts and updates, including direct API requests.
-- Historical invalid rows are not rewritten by this migration.
create or replace function public.check_incident_time() returns trigger language plpgsql set search_path='' as $$
begin
 if new.occurred_at > clock_timestamp() then
  raise exception 'The incident time cannot be in the future' using errcode='23514';
 end if;
 return new;
end; $$;
drop trigger if exists incident_time_guard on public.incidents;
create trigger incident_time_guard before insert or update on public.incidents
for each row execute function public.check_incident_time();
commit;
