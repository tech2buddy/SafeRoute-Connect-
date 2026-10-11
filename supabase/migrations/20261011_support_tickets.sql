begin;
create table public.support_tickets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(category in ('account','routing','reporting','technical')),
 subject text not null check(length(trim(subject)) between 1 and 200), message text not null check(length(trim(message)) between 1 and 5000),
 status text not null default 'open' check(status in ('open','in_progress','resolved')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;
revoke all on public.support_tickets from anon,authenticated;
grant select on public.support_tickets to authenticated;
create policy ticket_owner_read on public.support_tickets for select to authenticated using(user_id=(select auth.uid()));
create index support_tickets_created_idx on public.support_tickets(created_at desc);
create function public.submit_support_ticket(ticket_category text,ticket_subject text,ticket_message text) returns uuid language plpgsql security definer set search_path='' as $$
declare ticket_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to submit a ticket'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.support_tickets where user_id=auth.uid() and created_at>now()-interval '1 hour') >= 5 then raise exception 'Please wait before sending another ticket'; end if;
 insert into public.support_tickets(user_id,category,subject,message) values(auth.uid(),ticket_category,trim(ticket_subject),trim(ticket_message)) returning id into ticket_id;
 return ticket_id;
end; $$;
create function public.admin_support_tickets() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 return (select coalesce(jsonb_agg(t),'[]'::jsonb) from (select s.*,p.display_name from public.support_tickets s left join public.profiles p on p.id=s.user_id order by s.created_at desc limit 50) t);
end; $$;
create function public.admin_update_ticket(ticket_id uuid,new_status text) returns void language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 if new_status not in ('open','in_progress','resolved') or new_status is null then raise exception 'Invalid ticket status'; end if;
 select status into previous from public.support_tickets where id=ticket_id for update;
 if not found then raise exception 'Ticket not found'; end if;
 if previous=new_status then return; end if;
 update public.support_tickets set status=new_status,updated_at=now() where id=ticket_id;
 insert into public.admin_audit(actor,action,target) values(auth.uid(),'ticket_'||previous||'_to_'||new_status,ticket_id);
end; $$;
revoke all on function public.submit_support_ticket(text,text,text),public.admin_support_tickets(),public.admin_update_ticket(uuid,text) from public,anon;
grant execute on function public.submit_support_ticket(text,text,text),public.admin_support_tickets(),public.admin_update_ticket(uuid,text) to authenticated;
commit;
