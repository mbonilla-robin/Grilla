-- Catalog of org identifiers (e.g. plates with car photos for Petrokeep)

create table if not exists public.org_identifiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  value text not null,
  photo_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, value)
);

create index if not exists idx_org_identifiers_org on public.org_identifiers(organization_id);

do $$ begin
  create trigger org_identifiers_updated_at
    before update on public.org_identifiers
    for each row execute function public.handle_updated_at();
exception when duplicate_object then null;
end $$;

alter table public.org_identifiers enable row level security;

do $$ begin
  create policy "Members can view org identifiers"
    on public.org_identifiers for select
    using (public.is_org_member(organization_id));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Editors can manage org identifiers"
    on public.org_identifiers for all
    using (public.get_org_role(organization_id) in ('admin', 'creator', 'designer'));
exception when duplicate_object then null;
end $$;

alter table public.posts
  add column if not exists org_identifier_id uuid references public.org_identifiers(id) on delete set null;

create index if not exists idx_posts_org_identifier on public.posts(org_identifier_id);
