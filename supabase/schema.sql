begin;

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '' check (length(display_name) <= 100),
    created_at timestamptz not null default now()
);
create table public.incidents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    incident_type text not null check (incident_type in ('suspicious_activity','poor_lighting','robbery','harassment','road_hazard')),
    location text not null check (length(location) between 1 and 300),
    latitude double precision not null check (latitude between -90 and 90),
    longitude double precision not null check (longitude between -180 and 180),
    severity text not null check (severity in ('safe','moderate','risky')),
    description text not null check (length(description) between 1 and 5000),
    occurred_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);
create table public.saved_routes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    start_location text not null check (length(start_location) between 1 and 300),
    destination text not null check (length(destination) between 1 and 300),
    travel_mode text not null check (travel_mode in ('walk','drive','taxi')),
    preference text not null check (preference in ('safest','balanced','fastest')),
    is_favorite boolean not null default false,
    created_at timestamptz not null default now()
);
create table public.preferences (
    user_id uuid primary key references auth.users(id) on delete cascade,
    alert_radius integer not null default 5 check (alert_radius in (2,5,10)),
    route_preference text not null default 'safest' check (route_preference in ('safest','balanced','fastest'))
);

alter table public.profiles enable row level security;
alter table public.incidents enable row level security;
alter table public.saved_routes enable row level security;
alter table public.preferences enable row level security;

revoke all on public.profiles, public.incidents, public.saved_routes, public.preferences from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.incidents, public.saved_routes, public.preferences to authenticated;

create policy profiles_owner on public.profiles for all to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy routes_owner on public.saved_routes for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy preferences_owner on public.preferences for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy incidents_read on public.incidents for select to authenticated using (true);
create policy incidents_insert on public.incidents for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy incidents_update on public.incidents for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy incidents_delete on public.incidents for delete to authenticated
using ((select auth.uid()) = user_id);

create index incidents_created_at_idx on public.incidents (created_at desc);
create index saved_routes_user_idx on public.saved_routes (user_id, created_at desc);
commit;
