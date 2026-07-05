-- Fix: columnas faltantes en brand_kits (y resto del setup de org)
-- Ejecutar en Supabase Dashboard → SQL Editor

alter table public.brand_kits
  add column if not exists objective text,
  add column if not exists kit_file_url text;

alter table public.organizations
  add column if not exists post_formats text[] not null default '{image,carousel,reel,story}',
  add column if not exists client_name text,
  add column if not exists client_email text;

create table if not exists public.org_role_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.member_role not null,
  label text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_role_slots_org on public.org_role_slots(organization_id);

alter table public.org_role_slots enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'org_role_slots'
      and policyname = 'Members can view org role slots'
  ) then
    create policy "Members can view org role slots"
      on public.org_role_slots for select
      using (public.is_org_member(organization_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'org_role_slots'
      and policyname = 'Admins can manage org role slots'
  ) then
    create policy "Admins can manage org role slots"
      on public.org_role_slots for all
      using (public.get_org_role(organization_id) = 'admin');
  end if;
end $$;

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
