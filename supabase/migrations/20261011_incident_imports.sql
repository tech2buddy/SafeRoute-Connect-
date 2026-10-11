begin;
create table public.incident_imports (
    id uuid primary key default gen_random_uuid(),
    source_url text not null unique check (length(source_url) <= 2000),
    source_name text not null check (length(source_name) between 1 and 100),
    published_at timestamptz not null,
    extraction jsonb not null,
    status text not null default 'pending_review' check (status in ('pending_review','rejected','approved')),
    created_at timestamptz not null default now()
);
alter table public.incident_imports enable row level security;
revoke all on public.incident_imports from anon, authenticated;
grant select, insert, update on public.incident_imports to service_role;
create index incident_imports_review_idx on public.incident_imports(status, created_at desc);
commit;
