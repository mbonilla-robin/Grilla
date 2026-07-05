import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserBrands } from "@/lib/home-data";
import { BrandsGrid } from "@/components/home/brands-grid";
import { SubPageHeader, SectionCard } from "@/components/home/home-ui";

export default async function MarcasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const brands = await getUserBrands(user.id);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SubPageHeader title="Marcas" />
      <SectionCard title="Marcas activas">
        <BrandsGrid brands={brands} />
      </SectionCard>
    </div>
  );
}
