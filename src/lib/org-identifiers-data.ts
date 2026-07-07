import { createClient } from "@/lib/supabase/server";
import type { OrgIdentifier } from "@/lib/types";

export async function getOrgIdentifiers(orgId: string): Promise<OrgIdentifier[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_identifiers")
    .select("*")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true })
    .order("value", { ascending: true });

  return (data as OrgIdentifier[]) || [];
}
