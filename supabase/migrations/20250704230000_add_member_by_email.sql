-- Agregar miembros existentes al equipo por correo (sin invitación por email)

create or replace function public.add_org_member_by_email(
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
  target_user_id uuid;
  target_name text;
  member_id uuid;
  member_role public.member_role;
  member_extra public.member_role[];
begin
  normalized_email := lower(trim(p_email));

  if normalized_email = '' then
    raise exception 'Correo requerido';
  end if;

  select role into caller_role
  from public.organization_members
  where organization_id = p_org_id and user_id = auth.uid();

  if caller_role is null or caller_role not in ('admin', 'creator') then
    raise exception 'Sin permiso para agregar miembros';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = normalized_email;

  if target_user_id is null then
    raise exception 'No hay cuenta con ese correo. La persona debe registrarse primero en Grilla.';
  end if;

  select id, role, extra_roles
  into member_id, member_role, member_extra
  from public.organization_members
  where organization_id = p_org_id and user_id = target_user_id;

  if member_id is not null then
    if member_role = p_role or p_role = any(member_extra) then
      raise exception 'Esta persona ya tiene ese rol en el equipo';
    end if;

    update public.organization_members
    set extra_roles = member_extra || array[p_role]
    where id = member_id;
  else
    insert into public.organization_members (organization_id, user_id, role)
    values (p_org_id, target_user_id, p_role);
  end if;

  select coalesce(
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    p.full_name,
    'Sin nombre'
  )
  into target_name
  from public.profiles p
  where p.id = target_user_id;

  return json_build_object(
    'user_id', target_user_id,
    'name', target_name,
    'role', p_role
  );
end;
$$;

grant execute on function public.add_org_member_by_email(uuid, text, public.member_role) to authenticated;
