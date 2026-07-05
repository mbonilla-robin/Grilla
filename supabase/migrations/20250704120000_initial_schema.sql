-- Grilla: initial schema
-- Organizations, roles, editorial grid, brand kits, invitations

-- Custom types
create type public.member_role as enum ('admin', 'creator', 'designer', 'client');
create type public.post_format as enum ('feed', 'carousel', 'reel', 'story');
create type public.post_status as enum ('draft', 'brief_ready', 'in_design', 'review', 'approved', 'scheduled', 'published');
create type public.invitation_status as enum ('pending', 'accepted', 'expired');

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Organization members
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'creator',
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- Invitations
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'creator',
  invited_by uuid not null references auth.users(id) on delete restrict,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  unique (organization_id, email, status)
);

-- Brand kits
create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade unique,
  name text not null default 'Brand Kit',
  logo_url text,
  colors jsonb not null default '[]'::jsonb,
  fonts jsonb not null default '{"heading": "", "body": ""}'::jsonb,
  tone_of_voice text,
  guidelines text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Editorial grid posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null default '',
  scheduled_at timestamptz,
  format public.post_format not null default 'feed',
  copy text,
  references_text text,
  status public.post_status not null default 'draft',
  brief jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Post assets (designs, references)
create table public.post_assets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_type text not null default 'image',
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_org_members_user on public.organization_members(user_id);
create index idx_org_members_org on public.organization_members(organization_id);
create index idx_posts_org on public.posts(organization_id);
create index idx_posts_scheduled on public.posts(scheduled_at);
create index idx_posts_status on public.posts(status);
create index idx_invitations_token on public.invitations(token);
create index idx_invitations_email on public.invitations(email);

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.handle_updated_at();
create trigger brand_kits_updated_at before update on public.brand_kits
  for each row execute function public.handle_updated_at();
create trigger posts_updated_at before update on public.posts
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: check org membership
create or replace function public.is_org_member(org_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id and user_id = auth.uid()
  );
$$ language sql security definer stable set search_path = '';

-- Helper: get user role in org
create or replace function public.get_org_role(org_id uuid)
returns public.member_role as $$
  select role from public.organization_members
  where organization_id = org_id and user_id = auth.uid()
  limit 1;
$$ language sql security definer stable set search_path = '';

-- Helper: check if user is internal (not client)
create or replace function public.is_internal_member(org_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role in ('admin', 'creator', 'designer')
  );
$$ language sql security definer stable set search_path = '';

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.invitations enable row level security;
alter table public.brand_kits enable row level security;
alter table public.posts enable row level security;
alter table public.post_assets enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can view profiles of org members"
  on public.profiles for select
  using (
    exists (
      select 1 from public.organization_members om1
      join public.organization_members om2 on om1.organization_id = om2.organization_id
      where om1.user_id = auth.uid() and om2.user_id = profiles.id
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Organizations policies
create policy "Members can view their organizations"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "Creators can view organizations they created"
  on public.organizations for select
  using (created_by = auth.uid());

create policy "Authenticated users can create organizations"
  on public.organizations for insert
  with check (auth.uid() = created_by);

create policy "Admins can update organizations"
  on public.organizations for update
  using (public.get_org_role(id) = 'admin');

-- Organization members policies
create policy "Members can view org members"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

create policy "Admins can insert members"
  on public.organization_members for insert
  with check (
    public.get_org_role(organization_id) = 'admin'
    or (
      -- Allow self-insert when accepting invitation (handled via service role or edge function)
      user_id = auth.uid()
    )
  );

create policy "Admins can update members"
  on public.organization_members for update
  using (public.get_org_role(organization_id) = 'admin');

create policy "Admins can delete members"
  on public.organization_members for delete
  using (public.get_org_role(organization_id) = 'admin');

-- Invitations policies
create policy "Admins can manage invitations"
  on public.invitations for all
  using (public.get_org_role(organization_id) = 'admin');

create policy "Invitees can view their invitation by token"
  on public.invitations for select
  using (true);

-- Brand kits policies
create policy "Internal members can view brand kits"
  on public.brand_kits for select
  using (public.is_internal_member(organization_id));

create policy "Admins and designers can manage brand kits"
  on public.brand_kits for all
  using (
    public.get_org_role(organization_id) in ('admin', 'designer')
  );

create policy "Creators can insert brand kits for new orgs"
  on public.brand_kits for insert
  with check (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.created_by = auth.uid()
    )
    or public.get_org_role(organization_id) in ('admin', 'designer')
  );

-- Posts policies
create policy "Internal members can view all posts"
  on public.posts for select
  using (public.is_internal_member(organization_id));

create policy "Clients can view approved/scheduled/published posts"
  on public.posts for select
  using (
    public.get_org_role(organization_id) = 'client'
    and status in ('approved', 'scheduled', 'published', 'review')
  );

create policy "Internal members can create posts"
  on public.posts for insert
  with check (
    public.is_internal_member(organization_id)
    and created_by = auth.uid()
  );

create policy "Internal members can update posts"
  on public.posts for update
  using (public.is_internal_member(organization_id));

create policy "Admins can delete posts"
  on public.posts for delete
  using (public.get_org_role(organization_id) = 'admin');

-- Post assets policies
create policy "Internal members can view assets"
  on public.post_assets for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.is_internal_member(p.organization_id)
    )
  );

create policy "Clients can view assets of visible posts"
  on public.post_assets for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and public.get_org_role(p.organization_id) = 'client'
        and p.status in ('approved', 'scheduled', 'published', 'review')
    )
  );

create policy "Internal members can upload assets"
  on public.post_assets for insert
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.is_internal_member(p.organization_id)
    )
    and uploaded_by = auth.uid()
  );

create policy "Uploaders and admins can delete assets"
  on public.post_assets for delete
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.posts p
      where p.id = post_id and public.get_org_role(p.organization_id) = 'admin'
    )
  );
