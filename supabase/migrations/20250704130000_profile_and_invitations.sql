-- Profile fields + invitation visibility for join flow

alter table public.profiles
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists phone text,
  add column if not exists job_title text;

-- Backfill from full_name where possible
update public.profiles
set
  first_name = coalesce(nullif(first_name, ''), split_part(full_name, ' ', 1)),
  last_name = coalesce(
    nullif(last_name, ''),
    nullif(trim(substring(full_name from position(' ' in full_name) + 1)), ''),
    ''
  )
where full_name <> '';

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, first_name, last_name, phone, job_title)
  values (
    new.id,
    trim(concat_ws(' ',
      coalesce(new.raw_user_meta_data->>'first_name', ''),
      coalesce(new.raw_user_meta_data->>'last_name', '')
    )),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'job_title', '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- Users can see invitations sent to their email
drop policy if exists "Invitees can view their invitation by token" on public.invitations;
create policy "Users can view invitations for their email"
  on public.invitations for select
  using (
    lower(email) = lower((select email from auth.users where id = auth.uid()))
    and status = 'pending'
  );

-- Users can accept invitations sent to their email
create policy "Users can accept invitations for their email"
  on public.invitations for update
  using (
    lower(email) = lower((select email from auth.users where id = auth.uid()))
    and status = 'pending'
  )
  with check (status = 'accepted');

-- Public invite link lookup (security definer)
create or replace function public.get_invitation_by_token(invite_token text)
returns json
language sql
security definer
stable
set search_path = ''
as $$
  select json_build_object(
    'id', i.id,
    'organization_id', i.organization_id,
    'email', i.email,
    'role', i.role,
    'token', i.token,
    'status', i.status,
    'expires_at', i.expires_at,
    'org_name', o.name
  )
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token = invite_token and i.status = 'pending'
  limit 1;
$$;

grant execute on function public.get_invitation_by_token(text) to anon, authenticated;
