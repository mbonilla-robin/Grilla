create policy "Members can update own extra roles"
  on public.organization_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
