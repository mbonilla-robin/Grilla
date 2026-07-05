-- Historial de versiones del brief IA por post
alter table public.posts
  add column if not exists brief_history jsonb not null default '[]'::jsonb;
