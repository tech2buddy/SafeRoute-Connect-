begin;
create table if not exists public.presentation_stream_state(id integer primary key check(id=1),run_id uuid not null default gen_random_uuid(),next_event integer not null default 0,last_tick timestamptz);
alter table public.presentation_stream_state enable row level security;
revoke all on public.presentation_stream_state from anon,authenticated;
insert into public.presentation_stream_state(id) values(1) on conflict do nothing;
create or replace function public.tick_presentation_stream() returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.presentation_stream_state; event_id uuid; item record; new_status text; label text;
begin
 if not exists(select 1 from public.admin_members where user_id=auth.uid()) then raise exception 'Only an admin can run the presentation feed'; end if;
 select * into s from public.presentation_stream_state where id=1 for update;
 if s.next_event>=12 then return jsonb_build_object('complete',true,'sequence',s.next_event); end if;
 if s.last_tick>now()-interval '30 seconds' then return jsonb_build_object('waiting',true,'sequence',s.next_event); end if;
 event_id=md5('stream-'||s.run_id::text||'-'||s.next_event::text)::uuid;
 if s.next_event<8 or s.next_event=11 then
  select * into item from (values
   (0,'poor_lighting','Lighting outage on a pedestrian approach',-28.746,24.758,'moderate'),
   (1,'road_hazard','Obstruction on a walking path',-28.752,24.760,'moderate'),
   (2,'harassment','Student reports threatening behaviour',-28.754,24.763,'risky'),
   (3,'road_hazard','Difficult crossing near a junction',-28.758,24.765,'risky'),
   (4,'road_hazard','Damaged pavement reported',-28.744,24.756,'moderate'),
   (5,'suspicious_activity','Concern reported on a quiet path',-28.760,24.758,'moderate'),
   (6,'road_hazard','Standing water on a walkway',-28.762,24.766,'moderate'),
   (7,'robbery','Theft reported on a shopping approach',-28.765,24.764,'risky'),
   (11,'road_hazard','New obstruction reported near campus',-28.747,24.759,'moderate')
  ) as v(step,kind,title,lat,lng,severity) where step=s.next_event;
  insert into public.incidents(id,user_id,incident_type,location,latitude,longitude,severity,description,occurred_at,is_presentation)
  values(event_id,auth.uid(),item.kind,'Kimberley presentation scenario',item.lat,item.lng,item.severity,'Simulated incoming event: '||item.title,now(),true);
  label=item.title;
 else
  event_id=md5('stream-'||s.run_id::text||'-0')::uuid;
  new_status=case s.next_event when 8 then 'under_review' when 9 then 'action_taken' else 'resolved' end;
  label=case s.next_event when 8 then 'Lighting issue assigned for review' when 9 then 'Simulated maintenance action recorded' else 'Lighting issue resolved in the scenario' end;
  -- Never overwrite a report an administrator has already progressed manually.
  perform 1 from public.incidents where id=event_id and is_presentation and status=case s.next_event when 8 then 'reported' when 9 then 'under_review' else 'action_taken' end for update;
  if found then
   update public.incidents set status=new_status,updated_at=now() where id=event_id;
   insert into public.incident_updates(incident_id,status,note,actor) values(event_id,new_status,'Simulated feed update: '||label,auth.uid());
  else label='Scenario progress skipped; report was changed manually'; end if;
 end if;
 insert into public.admin_audit(actor,action,target,is_presentation) values(auth.uid(),'simulated_feed_'||s.next_event,event_id,true);
 update public.presentation_stream_state set next_event=s.next_event+1,last_tick=now() where id=1;
 return jsonb_build_object('sequence',s.next_event+1,'label',label,'complete',s.next_event+1>=12);
end; $$;
revoke all on function public.tick_presentation_stream() from public,anon;
grant execute on function public.tick_presentation_stream() to authenticated;
commit;
