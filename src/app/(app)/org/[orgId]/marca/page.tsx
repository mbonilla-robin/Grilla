import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubPageHeader } from "@/components/home/home-ui";
import { BrandConfigEditor } from "@/components/brand/brand-config-editor";
import { getOrgPillars } from "@/lib/pillars-data";
import type { BrandKit } from "@/lib/types";

export default async function MarcaConfigPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: membership }, { data: org }, { data: brandKit }, pillars] =
    await Promise.all([
      supabase
        .from("organization_members")
        .select("role")
        .eq("user_id", user!.id)
        .eq("organization_id", orgId)
        .single(),
      supabase.from("organizations").select("name").eq("id", orgId).single(),
      supabase.from("brand_kits").select("*").eq("organization_id", orgId).single(),
      getOrgPillars(orgId),
    ]);

  if (!membership || !org) notFound();

  if (!brandKit) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-sm text-muted">Brand kit no encontrado para esta marca.</p>
      </div>
    );
  }

  const canEdit = ["admin", "creator"].includes(membership.role);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SubPageHeader
        title="Configuración de marca"
        backHref={`/org/${orgId}/home`}
        backLabel="Inicio"
      />
      <p className="text-sm text-muted -mt-4">
        Tono, objetivo y pilares de {org.name}
      </p>
      <BrandConfigEditor
        orgId={orgId}
        orgName={org.name}
        brandKit={brandKit as BrandKit}
        pillars={pillars}
        canEdit={canEdit}
      />
    </div>
  );
}
