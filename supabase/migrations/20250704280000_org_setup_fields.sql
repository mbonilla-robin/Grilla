-- Org setup: role slots, post formats, client info, brand kit extensions

create table public.org_role_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.member_role not null,
  label text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.organizations
  add column if not exists post_formats text[] not null default '{image,carousel,reel,story}',
  add column if not exists client_name text,
  add column if not exists client_email text;

alter table public.brand_kits
  add column if not exists objective text,
  add column if not exists kit_file_url text;

create index idx_org_role_slots_org on public.org_role_slots(organization_id);

alter table public.org_role_slots enable row level security;

create policy "Members can view org role slots"
  on public.org_role_slots for select
  using (public.is_org_member(organization_id));

create policy "Admins can manage org role slots"
  on public.org_role_slots for all
  using (public.get_org_role(organization_id) = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-kits',
  'brand-kits',
  true,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public read brand-kits bucket"
  on storage.objects for select
  using (bucket_id = 'brand-kits');

create policy "Authenticated upload brand-kits"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'brand-kits');

create policy "Authenticated delete brand-kits"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'brand-kits');
