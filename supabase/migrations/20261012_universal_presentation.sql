begin;
alter table public.incidents add column if not exists is_presentation boolean not null default false;
alter table public.support_tickets add column if not exists is_presentation boolean not null default false;
alter table public.saved_routes add column if not exists is_presentation boolean not null default false;
grant insert(is_presentation) on public.incidents to authenticated;
-- Preserve owner permissions and server-side submission limits in the original RPC.
create or replace function public.submit_support_ticket_mode(ticket_category text,ticket_subject text,ticket_message text,presentation boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 result=public.submit_support_ticket(ticket_category,ticket_subject,ticket_message);
 update public.support_tickets set is_presentation=presentation where id=result;
 return result;
end; $$;
revoke all on function public.submit_support_ticket_mode(text,text,text,boolean) from public,anon;
grant execute on function public.submit_support_ticket_mode(text,text,text,boolean) to authenticated;
-- Scenarios are actual editable presentation reports, attributed to the installing admin.
do $$
declare owner_id uuid;
begin
 select user_id into owner_id from public.admin_members order by user_id limit 1;
 if owner_id is null then raise exception 'Grant an admin account before installing presentation reports'; end if;
 insert into public.incidents(id,user_id,incident_type,location,latitude,longitude,severity,description,occurred_at,is_presentation)
 select md5('saferoute-presentation-'||id)::uuid,owner_id,
 case id when 'harassment' then 'harassment' when 'theft' then 'robbery' when 'lighting' then 'poor_lighting' else 'road_hazard' end,
 location,latitude,longitude,severity,title||': '||description,now()-age_hours*interval '1 hour',true
 from public.presentation_features where feature_kind='hazard' on conflict(id) do nothing;
 insert into public.support_tickets(id,user_id,category,subject,message,is_presentation) values
 ('11111111-1111-4111-8111-111111111111',owner_id,'routing','Route guidance question','Presentation ticket: How do I compare exposure scores for two routes?',true),
 ('22222222-2222-4222-8222-222222222222',owner_id,'reporting','Checking an incident position','Presentation ticket: How can I confirm the map pin before submitting?',true)
 on conflict(id) do nothing;
end $$;
create or replace function public.admin_incidents_for_mode(presentation boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 return (select coalesce(jsonb_agg(t),'[]'::jsonb) from (select i.*,coalesce(nullif(p.display_name,''),a.raw_user_meta_data->>'display_name','Unnamed member') as reporter_name,a.email as reporter_email,
 (select coalesce(jsonb_agg(u order by u.created_at),'[]'::jsonb) from public.incident_updates u where u.incident_id=i.id) as updates
 from public.incidents i left join public.profiles p on p.id=i.user_id left join auth.users a on a.id=i.user_id where i.is_presentation=presentation order by i.created_at desc limit 50) t);
end; $$;
create or replace function public.admin_tickets_for_mode(presentation boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 return (select coalesce(jsonb_agg(t),'[]'::jsonb) from (select s.*,p.display_name,(select coalesce(jsonb_agg(r order by r.created_at),'[]'::jsonb) from public.support_replies r where r.ticket_id=s.id) as replies from public.support_tickets s left join public.profiles p on p.id=s.user_id where s.is_presentation=presentation order by s.created_at desc limit 50) t);
end; $$;
alter table public.admin_audit add column if not exists is_presentation boolean not null default false;
create or replace function public.tag_audit_workspace() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.is_presentation=new.is_presentation or coalesce((select is_presentation from public.incidents where id=new.target),(select is_presentation from public.support_tickets where id=new.target),false);
 return new;
end; $$;
drop trigger if exists audit_workspace on public.admin_audit;
create trigger audit_workspace before insert on public.admin_audit for each row execute function public.tag_audit_workspace();
create or replace function public.admin_moderate(target_id uuid,operation text) returns void language plpgsql security definer set search_path='' as $$
declare affected integer; sample boolean=false;
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 if operation='delete_incident' then
  select is_presentation into sample from public.incidents where id=target_id for update;
  delete from public.incidents where id=target_id;
 elsif operation='reject_import' then update public.incident_imports set status='rejected' where id=target_id and status='pending_review';
 else raise exception 'Invalid action'; end if;
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'Report missing or already changed'; end if;
 insert into public.admin_audit(actor,action,target,is_presentation) values(auth.uid(),operation,target_id,coalesce(sample,false));
end; $$;
create or replace function public.admin_audit_for_mode(presentation boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 return (select coalesce(jsonb_agg(t),'[]'::jsonb) from (select action,target,created_at from public.admin_audit where is_presentation=presentation order by created_at desc limit 20) t);
end; $$;
revoke all on function public.tag_audit_workspace(),public.admin_audit_for_mode(boolean) from public,anon;
grant execute on function public.admin_audit_for_mode(boolean) to authenticated;
create or replace function public.admin_counts_for_mode(presentation boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 return jsonb_build_object('users',(select count(*) from public.profiles),'incidents',(select count(*) from public.incidents where is_presentation=presentation),'pending',case when presentation then 0 else (select count(*) from public.incident_imports where status='pending_review') end,'published',case when presentation then 0 else (select count(*) from public.published_incidents where expires_at>now()) end);
end; $$;
revoke all on function public.admin_incidents_for_mode(boolean),public.admin_tickets_for_mode(boolean),public.admin_counts_for_mode(boolean) from public,anon;
grant execute on function public.admin_incidents_for_mode(boolean),public.admin_tickets_for_mode(boolean),public.admin_counts_for_mode(boolean) to authenticated;
commit;
