import { createClient } from "@/lib/supabase/client";
import { updatePost } from "@/lib/actions";

export async function uploadCatalogIdentifierPhoto(
  orgId: string,
  identifierId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${orgId}/catalog/${identifierId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("identifier-photos")
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("identifier-photos").getPublicUrl(path);

  return { url: publicUrl };
}

export async function uploadIdentifierPhoto(
  orgId: string,
  postId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${orgId}/${postId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("identifier-photos")
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("identifier-photos").getPublicUrl(path);

  const result = await updatePost(orgId, postId, {
    identifier_photo_url: publicUrl,
  });

  if (result.error) return { error: result.error };

  return { url: publicUrl };
}

export async function removeIdentifierPhoto(
  orgId: string,
  postId: string
): Promise<{ error?: string }> {
  const result = await updatePost(orgId, postId, {
    identifier_photo_url: null,
  });
  return result.error ? { error: result.error } : {};
}
