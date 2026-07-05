-- Rol community manager en equipos de marca

alter type public.member_role add value if not exists 'community_manager';

create or replace function public.is_internal_member(org_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role in ('admin', 'creator', 'designer', 'community_manager')
  );
$$ language sql security definer stable set search_path = '';
