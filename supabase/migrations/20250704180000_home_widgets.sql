alter table public.profiles
  add column if not exists home_widgets jsonb not null default '{
    "global": ["my_day", "my_orgs", "assigned_posts", "tasks", "mentions"],
    "orgs": {}
  }'::jsonb;
