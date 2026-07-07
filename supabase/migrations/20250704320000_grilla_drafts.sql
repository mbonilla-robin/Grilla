-- Shared grilla builder drafts (team-visible, not localStorage)

create table public.grilla_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period text not null check (period in ('week', 'quincena', 'month')),
  period_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period, period_key)
);

create index idx_grilla_drafts_org on public.grilla_drafts(organization_id);

alter table public.grilla_drafts enable row level security;

create policy "Internal members can view grilla drafts"
  on public.grilla_drafts for select
  using (public.is_internal_member(organization_id));

create policy "Internal members can create grilla drafts"
  on public.grilla_drafts for insert
  with check (public.is_internal_member(organization_id));

create policy "Internal members can update grilla drafts"
  on public.grilla_drafts for update
  using (public.is_internal_member(organization_id))
  with check (public.is_internal_member(organization_id));

create policy "Internal members can delete grilla drafts"
  on public.grilla_drafts for delete
  using (public.is_internal_member(organization_id));
