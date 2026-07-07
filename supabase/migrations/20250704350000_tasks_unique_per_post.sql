-- One task per post: remove duplicates (keep most recently updated) and prevent new ones.

delete from public.tasks t
where t.post_id is not null
  and t.id not in (
    select distinct on (post_id) id
    from public.tasks
    where post_id is not null
    order by post_id, updated_at desc nulls last, created_at desc
  );

-- Re-sync task status from linked posts after dedupe
update public.tasks t
set status = 'aprobado'
from public.posts p
where t.post_id = p.id
  and p.status in ('approved', 'scheduled', 'published');

update public.tasks t
set status = 'en_revision'
from public.posts p
where t.post_id = p.id
  and t.status = 'contenido'
  and (
    p.status = 'review'
    or exists (select 1 from public.post_assets a where a.post_id = p.id)
  );

create unique index if not exists tasks_one_per_post
  on public.tasks (post_id)
  where post_id is not null;
