import { createClient } from "@/lib/supabase/server";
import { BrandKitEditor } from "@/components/brand-kit/brand-kit-editor";
import type { BrandKit } from "@/lib/types";

export default async function BrandKitPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  const { data: brandKit } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (!brandKit) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted">Brand kit no encontrado</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-6">Brand Kit</h1>
      <BrandKitEditor brandKit={brandKit as BrandKit} orgId={orgId} />
    </div>
  );
}
