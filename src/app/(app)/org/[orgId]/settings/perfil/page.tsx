import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/settings/profile-editor";
import type { Profile } from "@/lib/types";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-title-sub mb-6">Perfil</h1>
      <ProfileEditor
        profile={
          (profile as Profile) || {
            id: user!.id,
            first_name: "",
            last_name: "",
            full_name: "",
            phone: null,
            job_title: null,
            avatar_url: null,
            created_at: "",
            updated_at: "",
          }
        }
        email={user?.email || ""}
      />
    </div>
  );
}
