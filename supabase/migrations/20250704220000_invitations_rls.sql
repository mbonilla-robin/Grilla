-- Invitations via security definer RPC (bypasses RLS insert issues)

create or replace function public.create_org_invitation(
  p_org_id uuid,
  p_email text,
  p_role public.member_role
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role public.member_role;
  normalized_email text;
  existing_id uuid;
  new_inv public.invitations%rowtype;
begin
  normalized_email := lower(trim(p_email));

  if normalized_email = '' then
    raise exception 'Correo requerido';
  end if;

  select role into caller_role
  from public.organization_members
  where organization_id = p_org_id and user_id = auth.uid();

  if caller_role is null or caller_role not in ('admin', 'creator') then
    raise exception 'Sin permiso para invitar';
  end if;

  select id into existing_id
  from public.invitations
  where organization_id = p_org_id
    and email = normalized_email
    and status = 'pending';

  if existing_id is not null then
    update public.invitations
    set role = p_role, invited_by = auth.uid()
    where id = existing_id
    returning * into new_inv;
  else
    insert into public.invitations (organization_id, email, role, invited_by)
    values (p_org_id, normalized_email, p_role, auth.uid())
    returning * into new_inv;
  end if;

  return json_build_object(
    'id', new_inv.id,
    'email', new_inv.email,
    'role', new_inv.role,
    'status', new_inv.status,
    'token', new_inv.token
  );
end;
$$;

grant execute on function public.create_org_invitation(uuid, text, public.member_role) to authenticated;

-- Fix RLS: allow admin/creator to manage invitations
drop policy if exists "Admins can manage invitations" on public.invitations;

create policy "Internal can manage invitations"
  on public.invitations for all
  using (public.get_org_role(organization_id) in ('admin', 'creator'))
  with check (public.get_org_role(organization_id) in ('admin', 'creator'));
