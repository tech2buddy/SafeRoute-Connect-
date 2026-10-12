begin;
alter table public.profiles add column if not exists gender text not null default 'prefer_not_to_say' check(gender in ('female','male','other','prefer_not_to_say'));
alter table public.profiles add column if not exists home_province text not null default '' check(length(home_province)<=50);
alter table public.profiles add column if not exists home_area text not null default '' check(length(home_area)<=100);
create or replace function public.create_registration_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name,gender,home_province,home_area)
 values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),100),
 case when new.raw_user_meta_data->>'gender' in ('female','male','other') then new.raw_user_meta_data->>'gender' else 'prefer_not_to_say' end,
 left(coalesce(new.raw_user_meta_data->>'home_province',''),50),left(coalesce(new.raw_user_meta_data->>'home_area',''),100)) on conflict(id) do nothing;
 return new;
end; $$;
revoke all on function public.create_registration_profile() from public,anon,authenticated;
drop trigger if exists registration_profile on auth.users;
create trigger registration_profile after insert on auth.users for each row execute function public.create_registration_profile();
-- Backfill missing profiles without overwriting edited names.
insert into public.profiles(id,display_name,created_at)
select id,left(coalesce(raw_user_meta_data->>'display_name',''),100),created_at from auth.users on conflict(id) do nothing;
create or replace function public.admin_incident_records() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 return (select coalesce(jsonb_agg(t),'[]'::jsonb) from (select i.*,coalesce(nullif(p.display_name,''),a.raw_user_meta_data->>'display_name','Unnamed member') as reporter_name,a.email as reporter_email,
 (select coalesce(jsonb_agg(u order by u.created_at),'[]'::jsonb) from public.incident_updates u where u.incident_id=i.id) as updates
 from public.incidents i left join public.profiles p on p.id=i.user_id left join auth.users a on a.id=i.user_id order by i.created_at desc limit 50) t);
end; $$;
revoke all on function public.admin_incident_records() from public,anon;
grant execute on function public.admin_incident_records() to authenticated;
commit;
