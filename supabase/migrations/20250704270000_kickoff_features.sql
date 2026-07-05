-- Kickoff features: pillars, hashtags, metrics, creative fields

create table public.content_pillars (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  target_pct smallint not null default 25 check (target_pct >= 0 and target_pct <= 100),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.org_hashtag_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,
  tags text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade unique,
  reach int,
  likes int,
  comments int,
  saves int,
  recorded_at timestamptz not null default now(),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.posts
  add column if not exists objective text,
  add column if not exists cta text;

create index idx_content_pillars_org on public.content_pillars(organization_id);
create index idx_hashtag_groups_org on public.org_hashtag_groups(organization_id);
create index idx_post_metrics_post on public.post_metrics(post_id);

-- Seed default pillars for existing orgs
insert into public.content_pillars (organization_id, name, color, target_pct, sort_order)
select o.id, p.name, p.color, p.target_pct, p.sort_order
from public.organizations o
cross join (
  values
    ('Valor', '#3b82f6', 30, 0),
    ('Ventas', '#ef4444', 25, 1),
    ('Información', '#8b5cf6', 25, 2),
    ('Entretenimiento', '#f59e0b', 20, 3)
) as p(name, color, target_pct, sort_order)
on conflict (organization_id, name) do nothing;

-- Seed default hashtag groups for existing orgs
insert into public.org_hashtag_groups (organization_id, category, tags, sort_order)
select o.id, h.category, h.tags, h.sort_order
from public.organizations o
cross join (
  values
    ('Marca', array['#marca', '#brand']::text[], 0),
    ('Sector', array['#industria', '#negocio']::text[], 1),
    ('Campaña', array['#promo', '#oferta']::text[], 2)
) as h(category, tags, sort_order)
where not exists (
  select 1 from public.org_hashtag_groups g where g.organization_id = o.id
);

alter table public.content_pillars enable row level security;
alter table public.org_hashtag_groups enable row level security;
alter table public.post_metrics enable row level security;

create policy "Members can view org pillars"
  on public.content_pillars for select
  using (public.is_org_member(organization_id));

create policy "Admins can manage org pillars"
  on public.content_pillars for all
  using (public.get_org_role(organization_id) = 'admin');

create policy "Members can view hashtag groups"
  on public.org_hashtag_groups for select
  using (public.is_org_member(organization_id));

create policy "Internal members can manage hashtag groups"
  on public.org_hashtag_groups for all
  using (public.is_internal_member(organization_id));

create policy "Members can view post metrics"
  on public.post_metrics for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.is_org_member(p.organization_id)
    )
  );

create policy "Internal members can manage post metrics"
  on public.post_metrics for all
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.is_internal_member(p.organization_id)
    )
  );
