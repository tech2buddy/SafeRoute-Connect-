begin;
create table public.admin_members (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_members enable row level security;
revoke all on public.admin_members from anon, authenticated;
grant select on public.admin_members to authenticated;
create policy admin_self_read on public.admin_members for select to authenticated using (user_id=(select auth.uid()));
create table public.admin_audit (id bigint generated always as identity primary key, actor uuid, action text not null, target uuid, created_at timestamptz not null default now());
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;
create function public.admin_dashboard() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 return jsonb_build_object(
  'counts',jsonb_build_object('users',(select count(*) from public.profiles),'incidents',(select count(*) from public.incidents),'pending',(select count(*) from public.incident_imports where status='pending_review'),'published',(select count(*) from public.published_incidents where expires_at>now())),
  'users',(select coalesce(jsonb_agg(t),'[]'::jsonb) from (select id,display_name,created_at from public.profiles order by created_at desc limit 50) t),
  'incidents',(select coalesce(jsonb_agg(t),'[]'::jsonb) from (select id,incident_type,location,description,severity,created_at from public.incidents order by created_at desc limit 50) t),
  'imports',(select coalesce(jsonb_agg(t),'[]'::jsonb) from (select id,source_name,source_url,extraction,created_at from public.incident_imports where status='pending_review' order by created_at desc limit 50) t),
  'audit',(select coalesce(jsonb_agg(t),'[]'::jsonb) from (select action,target,created_at from public.admin_audit order by created_at desc limit 20) t));
end; $$;
create function public.admin_moderate(target_id uuid, operation text) returns void language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 if operation='delete_incident' then delete from public.incidents where id=target_id;
 elsif operation='reject_import' then update public.incident_imports set status='rejected' where id=target_id and status='pending_review';
 else raise exception 'Invalid action'; end if;
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'Report missing or already changed'; end if;
 insert into public.admin_audit(actor,action,target) values(auth.uid(),operation,target_id);
end; $$;
revoke all on function public.admin_dashboard() from public, anon;
revoke all on function public.admin_moderate(uuid,text) from public, anon;
grant execute on function public.admin_dashboard(),public.admin_moderate(uuid,text) to authenticated;
commit;

-- After running this migration, grant your own account access in the SQL editor:
-- insert into public.admin_members(user_id)
-- select id from auth.users where email = 'YOUR_SIGN_IN_EMAIL'
-- on conflict do nothing;
