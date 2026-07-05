-- Post comments + Realtime for notifications

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_post_comments_post on public.post_comments(post_id, created_at desc);
create index idx_post_comments_org on public.post_comments(organization_id);

create trigger post_comments_updated_at before update on public.post_comments
  for each row execute function public.handle_updated_at();

alter table public.post_comments enable row level security;

create policy "Internal members can view post comments"
  on public.post_comments for select
  using (public.is_internal_member(organization_id));

create policy "Clients can view comments on visible posts"
  on public.post_comments for select
  using (
    public.get_org_role(organization_id) = 'client'
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.status in ('approved', 'scheduled', 'published', 'review')
    )
  );

create policy "Internal members can create post comments"
  on public.post_comments for insert
  with check (
    public.is_internal_member(organization_id)
    and author_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.organization_id = organization_id
    )
  );

-- Realtime: push new notifications to the bell
alter table public.notifications replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;
