-- Home: tasks, notifications, org invite tokens, auto-confirm email

create type public.task_status as enum ('pending', 'in_progress', 'done');
create type public.notification_type as enum ('mention', 'assignment', 'status_change', 'comment');

alter table public.organizations
  add column if not exists invite_token text unique default encode(gen_random_bytes(16), 'hex'),
  add column if not exists default_invite_role public.member_role not null default 'creator';

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  status public.task_status not null default 'pending',
  due_at timestamptz,
  post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  related_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_tasks_org on public.tasks(organization_id);
create index idx_tasks_assigned on public.tasks(assigned_to);
create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_unread on public.notifications(user_id, read) where read = false;

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.handle_updated_at();

-- Auto-confirm email on signup (no confirmation required)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = new.id;

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

-- RLS
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;

create policy "Internal members can view org tasks"
  on public.tasks for select
  using (public.is_internal_member(organization_id));

create policy "Internal members can manage org tasks"
  on public.tasks for all
  using (public.is_internal_member(organization_id));

create policy "Users can view own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "Internal members can create notifications"
  on public.notifications for insert
  with check (
    organization_id is null
    or public.is_internal_member(organization_id)
  );

-- Join org via public invite token
create or replace function public.join_org_by_invite_token(invite text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  org record;
  member_id uuid;
begin
  select id, default_invite_role into org
  from public.organizations
  where invite_token = invite;

  if org.id is null then
    raise exception 'Invitación no válida';
  end if;

  if exists (
    select 1 from public.organization_members
    where organization_id = org.id and user_id = auth.uid()
  ) then
    return org.id;
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (org.id, auth.uid(), org.default_invite_role)
  returning id into member_id;

  return org.id;
end;
$$;

grant execute on function public.join_org_by_invite_token(text) to authenticated;

create or replace function public.get_org_by_invite_token(invite text)
returns json
language sql
security definer
stable
set search_path = ''
as $$
  select json_build_object('id', id, 'name', name, 'invite_token', invite_token)
  from public.organizations where invite_token = invite limit 1;
$$;

grant execute on function public.get_org_by_invite_token(text) to anon, authenticated;
