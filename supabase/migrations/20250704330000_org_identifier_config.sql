-- Per-org identifier config (e.g. Placa for car rental, Plato for restaurant)
-- and optional photo on posts for visual reference in briefs

alter table public.organizations
  add column if not exists identifier_label text,
  add column if not exists identifier_allow_photo boolean not null default false,
  add column if not exists identifier_placeholder text;

alter table public.posts
  add column if not exists identifier_photo_url text;

comment on column public.organizations.identifier_label is
  'Custom label for the post identifier field (e.g. Placa, Plato). Null = disabled.';
comment on column public.organizations.identifier_allow_photo is
  'Whether posts can attach a reference photo to the identifier value.';
comment on column public.posts.identifier_photo_url is
  'Optional reference photo URL for the post identifier (e.g. car photo for a plate).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'identifier-photos',
  'identifier-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  create policy "Public read identifier-photos bucket"
    on storage.objects for select
    using (bucket_id = 'identifier-photos');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Authenticated upload identifier-photos"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'identifier-photos');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Authenticated delete identifier-photos"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'identifier-photos');
exception when duplicate_object then null;
end $$;
