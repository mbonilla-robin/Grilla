-- Optional English copy/caption for bilingual accounts (same design, second language).
alter table public.posts
  add column if not exists copy_en text,
  add column if not exists caption_en text;
