-- Restrict org asset link writes to admins only

drop policy if exists "Internal members can manage org asset links" on public.org_asset_links;

create policy "Admins can manage org asset links"
  on public.org_asset_links for all
  using (public.get_org_role(organization_id) = 'admin');
