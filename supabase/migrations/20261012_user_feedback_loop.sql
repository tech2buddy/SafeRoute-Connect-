begin;
alter table public.incidents add column if not exists status text not null default 'reported' check(status in ('reported','under_review','action_taken','resolved'));
alter table public.incidents add column if not exists updated_at timestamptz not null default now();
revoke insert,update on public.incidents from authenticated;
grant insert(user_id,incident_type,location,latitude,longitude,severity,description,occurred_at) on public.incidents to authenticated;
grant update(incident_type,location,latitude,longitude,severity,description,occurred_at) on public.incidents to authenticated;
create table if not exists public.incident_updates(id uuid primary key default gen_random_uuid(),incident_id uuid not null references public.incidents(id) on delete cascade,status text not null,note text not null check(length(trim(note)) between 1 and 2000),actor uuid references auth.users(id) on delete set null,created_at timestamptz not null default now());
create table if not exists public.support_replies(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete cascade,message text not null check(length(trim(message)) between 1 and 5000),actor uuid references auth.users(id) on delete set null,created_at timestamptz not null default now());
alter table public.incident_updates enable row level security;
alter table public.support_replies enable row level security;
revoke all on public.incident_updates,public.support_replies from anon,authenticated;
grant select on public.incident_updates,public.support_replies to authenticated;
drop policy if exists own_incident_updates on public.incident_updates;
create policy own_incident_updates on public.incident_updates for select to authenticated using(exists(select 1 from public.incidents i where i.id=incident_id and i.user_id=(select auth.uid())));
drop policy if exists own_ticket_replies on public.support_replies;
create policy own_ticket_replies on public.support_replies for select to authenticated using(exists(select 1 from public.support_tickets t where t.id=ticket_id and t.user_id=(select auth.uid())));
create or replace function public.admin_incident_records() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 return (select coalesce(jsonb_agg(t),'[]'::jsonb) from (select i.*,(select coalesce(jsonb_agg(u order by u.created_at),'[]'::jsonb) from public.incident_updates u where u.incident_id=i.id) as updates from public.incidents i order by created_at desc limit 50) t);
end; $$;
create or replace function public.admin_progress_incident(report_id uuid,new_status text,action_note text,expected_status text) returns void language plpgsql security definer set search_path='' as $$
declare previous text; next_status text;
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 select status into previous from public.incidents where id=report_id for update;
 if not found then raise exception 'Report not found'; end if;
 if previous is distinct from expected_status then raise exception 'Report changed. Refresh before saving'; end if;
 next_status=case previous when 'reported' then 'under_review' when 'under_review' then 'action_taken' when 'action_taken' then 'resolved' else null end;
 if new_status is null or (new_status<>previous and new_status is distinct from next_status) then raise exception 'Follow the incident status sequence'; end if;
 if action_note is null or length(trim(action_note)) not between 1 and 2000 then raise exception 'Add a user-visible action note'; end if;
 update public.incidents set status=new_status,updated_at=now() where id=report_id;
 insert into public.incident_updates(incident_id,status,note,actor) values(report_id,new_status,trim(action_note),auth.uid());
 insert into public.admin_audit(actor,action,target) values(auth.uid(),'incident_'||previous||'_to_'||new_status,report_id);
end; $$;
create or replace function public.admin_respond_ticket(ticket_id uuid,new_status text,reply_text text,expected_status text) returns void language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 select status into previous from public.support_tickets where id=ticket_id for update;
 if not found then raise exception 'Ticket not found'; end if;
 if previous is distinct from expected_status then raise exception 'Ticket changed. Refresh before saving'; end if;
 if new_status is null or new_status not in ('open','in_progress','resolved') then raise exception 'Invalid status'; end if;
 if reply_text is null or length(trim(reply_text)) not between 1 and 5000 then raise exception 'Write a reply'; end if;
 update public.support_tickets set status=new_status,updated_at=now() where id=ticket_id;
 insert into public.support_replies(ticket_id,message,actor) values(ticket_id,trim(reply_text),auth.uid());
 insert into public.admin_audit(actor,action,target) values(auth.uid(),'ticket_reply_'||new_status,ticket_id);
end; $$;
create or replace function public.admin_support_tickets() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 return (select coalesce(jsonb_agg(t),'[]'::jsonb) from (select s.*,p.display_name,(select coalesce(jsonb_agg(r order by r.created_at),'[]'::jsonb) from public.support_replies r where r.ticket_id=s.id) as replies from public.support_tickets s left join public.profiles p on p.id=s.user_id order by s.created_at desc limit 50) t);
end; $$;
revoke all on function public.admin_incident_records(),public.admin_progress_incident(uuid,text,text,text),public.admin_respond_ticket(uuid,text,text,text) from public,anon;
grant execute on function public.admin_incident_records(),public.admin_progress_incident(uuid,text,text,text),public.admin_respond_ticket(uuid,text,text,text) to authenticated;
create index if not exists incident_updates_parent_idx on public.incident_updates(incident_id,created_at);
create index if not exists support_replies_parent_idx on public.support_replies(ticket_id,created_at);
commit;
