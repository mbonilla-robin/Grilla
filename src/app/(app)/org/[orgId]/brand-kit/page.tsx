import { redirect } from "next/navigation";

export default async function BrandKitPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  redirect(`/org/${orgId}/marca?tab=visual`);
}
