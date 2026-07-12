alter table public.brand_kits
  add column if not exists text_casing jsonb not null default '{
    "title": "uppercase",
    "subtitle": "uppercase",
    "body": "sentence",
    "bullet": "sentence",
    "cta": "sentence"
  }'::jsonb;
