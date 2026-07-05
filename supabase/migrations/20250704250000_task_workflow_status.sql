-- Task workflow: contenido → en_revision (archivo) → aprobado

create type public.task_status_new as enum ('contenido', 'en_revision', 'aprobado');

alter table public.tasks
  alter column status drop default;

alter table public.tasks
  alter column status type public.task_status_new
  using (
    case status::text
      when 'pending' then 'contenido'::public.task_status_new
      when 'in_progress' then 'contenido'::public.task_status_new
      when 'done' then 'aprobado'::public.task_status_new
      else 'contenido'::public.task_status_new
    end
  );

drop type public.task_status;
alter type public.task_status_new rename to task_status;

alter table public.tasks
  alter column status set default 'contenido';

-- Sync status from linked posts
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

-- One task per post: keep oldest, drop duplicates
delete from public.tasks t
where t.post_id is not null
  and t.id not in (
    select distinct on (post_id) id
    from public.tasks
    where post_id is not null
    order by post_id, created_at asc
  );
