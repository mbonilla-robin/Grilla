import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrgHomeView } from "@/components/home/org-home-view";
import { getOrgHomeData } from "@/lib/home-data";

export default async function OrgHomePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user!.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership) notFound();

  const data = await getOrgHomeData(user!.id, orgId);

  return (
    <OrgHomeView
      orgId={orgId}
      orgName={data.orgName}
      stats={data.stats}
      tasks={data.tasks}
      urgentTasks={data.urgentTasks}
      reviewPosts={data.reviewPosts}
      teamMembers={data.teamMembers}
    />
  );
}
