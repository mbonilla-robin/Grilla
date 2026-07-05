-- Asset ordering + storage for post designs

alter table public.post_assets
  add column if not exists sort_order integer not null default 0;

create index if not exists idx_post_assets_post on public.post_assets(post_id);
create index if not exists idx_post_assets_sort on public.post_assets(post_id, sort_order);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-assets',
  'post-assets',
  true,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public read post-assets bucket"
  on storage.objects for select
  using (bucket_id = 'post-assets');

create policy "Authenticated upload post-assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-assets');

create policy "Authenticated delete post-assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-assets');
