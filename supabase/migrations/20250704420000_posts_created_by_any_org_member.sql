-- Allow assigning content authorship to any org member when an internal member publishes.
-- Previously created_by had to equal auth.uid(), so whoever clicked "Publicar" stole authorship.

drop policy if exists "Internal members can create posts" on public.posts;

create policy "Internal members can create posts"
  on public.posts for insert
  with check (
    public.is_internal_member(organization_id)
    and (
      created_by = auth.uid()
      or exists (
        select 1
        from public.organization_members om
        where om.organization_id = posts.organization_id
          and om.user_id = created_by
      )
    )
  );
