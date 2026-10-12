begin;
-- Seed owner-specific presentation searches for each approved admin/presenter.
-- Deterministic IDs make reruns safe without duplicating or changing favourites.
insert into public.saved_routes(id,user_id,start_location,destination,travel_mode,preference,is_favorite,is_presentation,created_at)
select md5('presentation-route-'||a.user_id::text||'-'||sample.key)::uuid,a.user_id,
 sample.start_location,sample.destination,sample.travel_mode,sample.preference,sample.favorite,true,
 now()-sample.age_hours*interval '1 hour'
from public.admin_members a
cross join (values
 ('campus-mall','Sol Plaatje University, Kimberley, South Africa','Diamond Pavilion Shopping Centre, Kimberley, South Africa','walk','safest',true,2),
 ('campus-museum','Sol Plaatje University, Kimberley, South Africa','McGregor Museum, Kimberley, South Africa','walk','balanced',true,18),
 ('mall-campus','Diamond Pavilion Shopping Centre, Kimberley, South Africa','Sol Plaatje University, Kimberley, South Africa','drive','fastest',false,28),
 ('museum-mall','McGregor Museum, Kimberley, South Africa','Diamond Pavilion Shopping Centre, Kimberley, South Africa','walk','safest',false,48)
) as sample(key,start_location,destination,travel_mode,preference,favorite,age_hours)
on conflict(id) do nothing;
commit;
