alter table public.organization_members
  add column if not exists extra_roles public.member_role[] not null default '{}';
