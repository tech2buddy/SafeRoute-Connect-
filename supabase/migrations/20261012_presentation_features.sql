begin;
create table if not exists public.presentation_features (
 id text primary key, title text not null, location text not null,
 latitude double precision not null, longitude double precision not null,
 feature_kind text not null check(feature_kind in ('hazard','support')),
 severity text not null check(severity in ('safe','moderate','risky')),
 age_hours integer not null check(age_hours>=0), description text not null
);
alter table public.presentation_features enable row level security;
revoke all on public.presentation_features from anon,authenticated;
grant select on public.presentation_features to authenticated;
drop policy if exists presentation_read on public.presentation_features;
create policy presentation_read on public.presentation_features for select to authenticated using(true);
-- Fictional scenarios, NOT claims about these real-world locations.
insert into public.presentation_features values
('lighting','Poor street lighting','Campus approach scenario',-28.7455,24.7575,'hazard','moderate',8,'Scenario: lighting failure reduces visibility after dark.'),
('harassment','Harassment report','Bishops Avenue scenario',-28.7525,24.7628,'hazard','risky',2,'Scenario: a student reports threatening behaviour.'),
('crossing','Dangerous crossing','Memorial Road scenario',-28.757,24.7655,'hazard','risky',5,'Scenario: fast traffic and a difficult pedestrian crossing.'),
('pavement','Damaged pavement','New Park scenario',-28.744,24.754,'hazard','moderate',20,'Scenario: broken paving creates a trip and accessibility hazard.'),
('blocked','Blocked walkway','Labram scenario',-28.751,24.759,'hazard','moderate',4,'Scenario: an obstruction forces pedestrians toward the roadway.'),
('isolated','Isolated path','Southern approach scenario',-28.763,24.758,'hazard','moderate',12,'Scenario: a quiet path with poor visibility and few people nearby.'),
('theft','Theft report','Shopping approach scenario',-28.765,24.764,'hazard','risky',6,'Scenario: a person reports a stolen bag.'),
('lit-path','Working pedestrian lighting','Campus path scenario',-28.746,24.758,'support','safe',0,'Scenario feature: functioning lights improve visibility. Not proof that crime cannot occur.'),
('entrance','Monitored entrance','Campus entrance scenario',-28.7465,24.7585,'support','safe',0,'Scenario feature: a staffed entrance is available nearby. Not a guarantee of assistance.'),
('designated-crossing','Designated crossing','Northern crossing scenario',-28.7445,24.760,'support','safe',0,'Scenario feature: a designated pedestrian crossing is present.'),
('maintained-path','Maintained footpath','Eastern footpath scenario',-28.758,24.768,'support','safe',0,'Scenario feature: a maintained walkway supports pedestrian access.'),
('visible-path','Clear sightlines','Central path scenario',-28.751,24.767,'support','safe',0,'Scenario feature: an open path has clearer sightlines.')
on conflict(id) do nothing;
commit;
