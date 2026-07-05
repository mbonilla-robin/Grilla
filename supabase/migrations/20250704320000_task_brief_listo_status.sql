-- Add brief_listo to task workflow: contenido → brief_listo → en_revision → aprobado

alter type public.task_status add value if not exists 'brief_listo';

update public.tasks t
set status = 'brief_listo'
from public.posts p
where t.post_id = p.id
  and p.status = 'brief_ready'
  and t.status = 'contenido';
