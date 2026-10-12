begin;
create table if not exists public.presentation_member_overrides(user_id uuid primary key references auth.users(id) on delete cascade,display_name text not null check(length(trim(display_name)) between 1 and 100),is_admin boolean not null,updated_at timestamptz not null default now());
alter table public.presentation_member_overrides enable row level security;
revoke all on public.presentation_member_overrides from anon,authenticated;
create or replace function public.admin_list_members(presentation boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 return (select coalesce(jsonb_agg(t),'[]'::jsonb) from (select a.id,a.email,a.created_at,a.email_confirmed_at,
 case when presentation then coalesce(o.display_name,p.display_name,a.raw_user_meta_data->>'display_name','') else coalesce(p.display_name,a.raw_user_meta_data->>'display_name','') end as display_name,
 case when presentation then coalesce(o.is_admin,m.user_id is not null) else m.user_id is not null end as is_admin,
 p.gender,p.home_province,p.home_area,(a.id=auth.uid()) as is_self
 from auth.users a left join public.profiles p on p.id=a.id left join public.admin_members m on m.user_id=a.id left join public.presentation_member_overrides o on o.user_id=a.id order by a.created_at desc limit 500) t);
end; $$;
create or replace function public.admin_update_member(target_id uuid,member_name text,admin_role boolean,presentation boolean) returns void language plpgsql security definer set search_path='' as $$
declare was_admin boolean;
begin
 -- Serialize role changes and recheck authorization after acquiring the lock.
 perform pg_advisory_xact_lock(728184120);
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 if presentation is null or admin_role is null then raise exception 'Workspace and role required'; end if;
 if member_name is null or length(trim(member_name)) not between 1 and 100 then raise exception 'Name must be 1 to 100 characters'; end if;
 perform 1 from auth.users where id=target_id for update;
 if not found then raise exception 'Account not found'; end if;
 select exists(select 1 from public.admin_members where user_id=target_id) into was_admin;
 if not presentation and target_id=auth.uid() and not admin_role then raise exception 'You cannot remove your own admin access'; end if;
 if not presentation and was_admin and not admin_role and (select count(*) from public.admin_members)<=1 then raise exception 'Keep at least one administrator'; end if;
 if presentation then
  insert into public.presentation_member_overrides(user_id,display_name,is_admin) values(target_id,trim(member_name),admin_role) on conflict(user_id) do update set display_name=excluded.display_name,is_admin=excluded.is_admin,updated_at=now();
 else
  insert into public.profiles(id,display_name) values(target_id,trim(member_name)) on conflict(id) do update set display_name=excluded.display_name;
  if admin_role then insert into public.admin_members(user_id) values(target_id) on conflict do nothing;
  else delete from public.admin_members where user_id=target_id; end if;
 end if;
 insert into public.admin_audit(actor,action,target,is_presentation) values(auth.uid(),case when presentation then 'presentation_member_updated' else 'live_member_updated' end,target_id,presentation);
end; $$;
create or replace function public.admin_generate_report(presentation boolean,start_day date,end_day date,report_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare from_time timestamptz; until_time timestamptz; result_rows jsonb; total bigint;
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 if presentation is null or start_day is null or end_day is null or end_day<start_day or end_day-start_day>366 or end_day>(now() at time zone 'Africa/Johannesburg')::date then raise exception 'Choose a past/current date range of at most 367 calendar days'; end if;
 from_time=start_day::timestamp at time zone 'Africa/Johannesburg';
 until_time=(end_day+1)::timestamp at time zone 'Africa/Johannesburg';
 if report_kind='incidents' then
  select count(*) into total from public.incidents where is_presentation=presentation and occurred_at>=from_time and occurred_at<until_time;
  if total>5000 then raise exception 'More than 5000 rows. Narrow the date range'; end if;
  select coalesce(jsonb_agg(t),'[]'::jsonb) into result_rows from (select id,incident_type as category,location,severity,status,occurred_at as event_time,created_at as submitted_at,updated_at from public.incidents where is_presentation=presentation and occurred_at>=from_time and occurred_at<until_time order by occurred_at desc) t;
 elsif report_kind='support' then
  select count(*) into total from public.support_tickets where is_presentation=presentation and created_at>=from_time and created_at<until_time;
  if total>5000 then raise exception 'More than 5000 rows. Narrow the date range'; end if;
  select coalesce(jsonb_agg(t),'[]'::jsonb) into result_rows from (select id,category,subject,status,created_at as submitted_at,updated_at from public.support_tickets where is_presentation=presentation and created_at>=from_time and created_at<until_time order by created_at desc) t;
 else raise exception 'Invalid report type'; end if;
 insert into public.admin_audit(actor,action,is_presentation) values(auth.uid(),'generated_'||report_kind||'_report',presentation);
 return jsonb_build_object('workspace',case when presentation then 'presentation' else 'live' end,'kind',report_kind,'start_day',start_day,'end_day',end_day,'timezone','Africa/Johannesburg','generated_at',now(),'total',total,'rows',result_rows);
end; $$;
create or replace function public.admin_counts_for_mode(presentation boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 return jsonb_build_object('users',(select count(*) from auth.users),'incidents',(select count(*) from public.incidents where is_presentation=presentation),'pending',case when presentation then 0 else (select count(*) from public.incident_imports where status='pending_review') end,'published',case when presentation then 0 else (select count(*) from public.published_incidents where expires_at>now()) end);
end; $$;
revoke all on function public.admin_list_members(boolean),public.admin_update_member(uuid,text,boolean,boolean),public.admin_generate_report(boolean,date,date,text) from public,anon;
grant execute on function public.admin_list_members(boolean),public.admin_update_member(uuid,text,boolean,boolean),public.admin_generate_report(boolean,date,date,text) to authenticated;
commit;
