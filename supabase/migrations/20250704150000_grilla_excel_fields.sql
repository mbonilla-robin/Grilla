-- Grilla fields matching Excel structure

alter table public.posts
  add column if not exists pillar text,
  add column if not exists caption text,
  add column if not exists plate text,
  add column if not exists in_drive boolean not null default false,
  add column if not exists published boolean not null default false;

-- Extend format enum
alter type public.post_format add value if not exists 'image';
alter type public.post_format add value if not exists 'video_carousel';
