-- Quick-access asset links per organization (Drive, refs, tools, etc.)

create table public.org_asset_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null default 'General',
  label text not null,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_org_asset_links_org on public.org_asset_links(organization_id);
create index idx_org_asset_links_category on public.org_asset_links(organization_id, category);

create trigger org_asset_links_updated_at
  before update on public.org_asset_links
  for each row execute function public.handle_updated_at();

alter table public.org_asset_links enable row level security;

create policy "Internal members can view org asset links"
  on public.org_asset_links for select
  using (public.is_internal_member(organization_id));

create policy "Admins can manage org asset links"
  on public.org_asset_links for all
  using (public.get_org_role(organization_id) = 'admin');
