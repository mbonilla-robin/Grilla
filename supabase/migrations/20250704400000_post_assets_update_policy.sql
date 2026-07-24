-- Allow internal members to update post assets (e.g. sort_order when reordering).
-- Without this, UPDATE is silently blocked by RLS and reorder appears to work only in UI.

create policy "Internal members can update assets"
  on public.post_assets for update
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.is_internal_member(p.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.is_internal_member(p.organization_id)
    )
  );
