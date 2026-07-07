-- Remove duplicate editorial posts (same org + title + day), keep the most advanced.

with ranked as (
  select
    p.id,
    row_number() over (
      partition by
        p.organization_id,
        lower(trim(p.title)),
        coalesce(date_trunc('day', p.scheduled_at at time zone 'utc'), 'epoch'::timestamptz)
      order by
        case p.status
          when 'published' then 7
          when 'scheduled' then 6
          when 'approved' then 5
          when 'review' then 4
          when 'in_design' then 3
          when 'brief_ready' then 2
          else 1
        end desc,
        (select count(*) from public.post_assets a where a.post_id = p.id) desc,
        (case when p.brief is not null then 1 else 0 end) desc,
        (case when p.assigned_to is not null then 1 else 0 end) desc,
        p.updated_at desc
    ) as rn
  from public.posts p
)
delete from public.posts
where id in (select id from ranked where rn > 1);

-- Prevent duplicate posts on the same org + title + calendar day
create unique index if not exists posts_one_per_org_title_day
  on public.posts (
    organization_id,
    lower(trim(title)),
    (date_trunc('day', scheduled_at at time zone 'utc'))
  )
  where scheduled_at is not null;
