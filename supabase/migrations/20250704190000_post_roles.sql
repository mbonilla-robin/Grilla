alter table public.posts
  add column if not exists community_manager_id uuid references auth.users(id) on delete set null;

create index if not exists idx_posts_community_manager on public.posts(community_manager_id);
