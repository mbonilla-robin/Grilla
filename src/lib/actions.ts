"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { MAX_SLOT_WIDGETS } from "@/lib/widget-config";
import type { MemberRole } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
  first_name: string;
  last_name: string;
  phone?: string;
  job_title?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const full_name = `${data.first_name} ${data.last_name}`.trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      full_name,
      phone: data.phone || null,
      job_title: data.job_title || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function joinOrgByInviteToken(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase.rpc("join_org_by_invite_token", {
    invite: token,
  });

  if (error) return { error: error.message };

  revalidatePath("/home");
  return { data: data as string };
}

export async function createOrganization(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const slug = slugify(name) + "-" + Date.now().toString(36);

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, slug, created_by: user.id })
    .select()
    .single();

  if (orgError) return { error: orgError.message };

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "admin" as MemberRole,
    });

  if (memberError) return { error: memberError.message };

  await supabase.from("brand_kits").insert({
    organization_id: org.id,
    name: `${name} Brand Kit`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/home");
  return { data: org };
}

export async function addMemberByEmail(
  orgId: string,
  email: string,
  role: MemberRole
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) return { error: "Correo requerido" };

  const admin = createAdminClient();
  if (admin) {
    return addMemberByEmailWithAdmin(
      supabase,
      admin,
      orgId,
      normalizedEmail,
      role,
      user.id
    );
  }

  const { data, error } = await supabase.rpc("add_org_member_by_email", {
    p_org_id: orgId,
    p_email: normalizedEmail,
    p_role: role,
  });

  if (error) {
    const msg = error.message || "Error al agregar miembro";
    if (msg.includes("Sin permiso")) return { error: "Sin permiso para agregar miembros" };
    if (msg.includes("No hay cuenta")) return { error: msg };
    if (msg.includes("ya tiene") || msg.includes("ya es")) return { error: msg };
    if (error.code === "PGRST202") {
      return {
        error:
          "Falta la clave secreta de Supabase. Agrégala en .env.local como SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY) y reinicia npm run dev.",
      };
    }
    return { error: msg };
  }

  revalidatePath(`/org/${orgId}/team`);
  revalidatePath(`/org/${orgId}/home`);
  revalidatePath("/home", "layout");
  return { data };
}

async function addMemberByEmailWithAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  orgId: string,
  normalizedEmail: string,
  role: MemberRole,
  callerId: string
) {
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", callerId)
    .single();

  if (!membership || !["admin", "creator"].includes(membership.role)) {
    return { error: "Sin permiso para agregar miembros" };
  }

  let targetUserId: string | null = null;
  let page = 1;

  while (!targetUserId) {
    const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (usersError) return { error: usersError.message };

    const match = usersPage.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );
    if (match) {
      targetUserId = match.id;
      break;
    }

    if (usersPage.users.length < 200) break;
    page += 1;
  }

  if (!targetUserId) {
    return {
      error:
        "No hay cuenta con ese correo. La persona debe registrarse primero en Grilla.",
    };
  }

  const { data: existing } = await admin
    .from("organization_members")
    .select("id, role, extra_roles")
    .eq("organization_id", orgId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  let memberId: string;
  let primaryRole = role;
  let extraRoles: MemberRole[] = [];

  if (existing) {
    extraRoles = (existing.extra_roles as MemberRole[] | null) ?? [];
    if (existing.role === role || extraRoles.includes(role)) {
      return { error: "Esta persona ya tiene ese rol en el equipo" };
    }

    const nextExtraRoles = [...extraRoles, role];
    const { error: updateError } = await admin
      .from("organization_members")
      .update({ extra_roles: nextExtraRoles })
      .eq("id", existing.id);

    if (updateError) return { error: updateError.message };

    memberId = existing.id;
    primaryRole = existing.role as MemberRole;
    extraRoles = nextExtraRoles;
  } else {
    const { data: inserted, error: insertError } = await admin
      .from("organization_members")
      .insert({
        organization_id: orgId,
        user_id: targetUserId,
        role,
      })
      .select("id")
      .single();

    if (insertError) return { error: insertError.message };

    memberId = inserted.id;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, full_name")
    .eq("id", targetUserId)
    .maybeSingle();

  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    "Sin nombre";

  revalidatePath(`/org/${orgId}/team`);
  revalidatePath(`/org/${orgId}/home`);
  revalidatePath("/home", "layout");

  return {
    data: {
      id: memberId,
      user_id: targetUserId,
      name,
      role: primaryRole,
      extra_roles: extraRoles,
    },
  };
}

/** @deprecated Usar addMemberByEmail — agrega usuarios ya registrados al equipo */
export async function inviteMember(
  orgId: string,
  email: string,
  role: MemberRole
) {
  return addMemberByEmail(orgId, email, role);
}

export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: invitation, error: invError } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (invError || !invitation) return { error: "Invitación no válida" };

  if (new Date(invitation.expires_at) < new Date()) {
    return { error: "Invitación expirada" };
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: invitation.organization_id,
      user_id: user.id,
      role: invitation.role,
    });

  if (memberError) return { error: memberError.message };

  await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  revalidatePath("/dashboard");
  return { data: invitation };
}

export async function updateHomeWidgets(
  scope: "global" | "org",
  widgets: string[],
  orgId?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("home_widgets")
    .eq("id", user.id)
    .single();

  const current = (profile?.home_widgets as {
    global: string[];
    orgs: Record<string, string[]>;
  }) || { global: [], orgs: {} };

  const updated =
    scope === "global"
      ? { ...current, global: widgets.slice(0, MAX_SLOT_WIDGETS) }
      : {
          ...current,
          orgs: {
            ...current.orgs,
            [orgId!]: widgets.slice(0, MAX_SLOT_WIDGETS),
          },
        };

  const { error } = await supabase
    .from("profiles")
    .update({ home_widgets: updated })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/home");
  revalidatePath("/home/widgets");
  if (orgId) {
    revalidatePath(`/org/${orgId}/home`);
    revalidatePath(`/org/${orgId}/home/widgets`);
  }
  return { success: true };
}

export async function updateMemberRoles(
  orgId: string,
  userId: string,
  role: MemberRole,
  extraRoles: MemberRole[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: myMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  const isAdmin = myMembership?.role === "admin";
  const isSelf = user.id === userId;

  if (!isAdmin && !isSelf) {
    return { error: "Sin permiso para editar roles" };
  }

  const cleaned = extraRoles.filter((r) => r !== role);

  const { error } = await supabase
    .from("organization_members")
    .update({ extra_roles: cleaned })
    .eq("organization_id", orgId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/home`);
  revalidatePath(`/org/${orgId}/team`);
  revalidatePath(`/org/${orgId}/grilla`);
  return { success: true };
}

export async function removeMemberFromOrg(orgId: string, memberUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  if (user.id === memberUserId) {
    return { error: "No puedes eliminarte a ti mismo del equipo" };
  }

  const { data: myMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (myMembership?.role !== "admin") {
    return { error: "Solo el admin puede eliminar miembros" };
  }

  const client = createAdminClient() ?? supabase;
  const { error } = await client
    .from("organization_members")
    .delete()
    .eq("organization_id", orgId)
    .eq("user_id", memberUserId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/team`);
  revalidatePath(`/org/${orgId}/home`);
  revalidatePath("/home", "layout");
  return { success: true };
}

export async function createPost(
  orgId: string,
  data: {
    title: string;
    scheduled_at?: string;
    format: string;
    pillar?: string;
    copy?: string;
    caption?: string;
    plate?: string;
    in_drive?: boolean;
    references_text?: string;
    content_creator_id?: string;
    assigned_to?: string;
    community_manager_id?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const contentCreatorId = data.content_creator_id || user.id;

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      organization_id: orgId,
      title: data.title,
      scheduled_at: data.scheduled_at || null,
      format: data.format,
      pillar: data.pillar || null,
      copy: data.copy || null,
      caption: data.caption || null,
      plate: data.plate || null,
      in_drive: data.in_drive ?? false,
      references_text: data.references_text || null,
      assigned_to: data.assigned_to || null,
      community_manager_id: data.community_manager_id || null,
      created_by: contentCreatorId,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const taskDueAt = data.scheduled_at || null;
  const assignee = data.assigned_to || contentCreatorId;

  if (assignee) {
    const row = {
      organization_id: orgId,
      title: data.title,
      description: "Post creado en la grilla",
      assigned_to: assignee,
      created_by: user.id,
      post_id: post.id,
      due_at: taskDueAt,
    };

    const { error: taskError } = await supabase.from("tasks").insert({
      ...row,
      status: "contenido",
    });

    if (taskError) {
      await supabase.from("tasks").insert({
        ...row,
        status: "pending",
      });
    }
  }

  revalidatePath(`/org/${orgId}/grilla`);
  return { data: post };
}

export async function updatePost(
  orgId: string,
  postId: string,
  data: {
    title?: string;
    scheduled_at?: string | null;
    format?: string;
    pillar?: string | null;
    copy?: string | null;
    caption?: string | null;
    plate?: string | null;
    in_drive?: boolean;
    references_text?: string | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.scheduled_at !== undefined) updates.scheduled_at = data.scheduled_at;
  if (data.format !== undefined) updates.format = data.format;
  if (data.pillar !== undefined) updates.pillar = data.pillar;
  if (data.copy !== undefined) updates.copy = data.copy;
  if (data.caption !== undefined) updates.caption = data.caption;
  if (data.plate !== undefined) updates.plate = data.plate;
  if (data.in_drive !== undefined) updates.in_drive = data.in_drive;
  if (data.references_text !== undefined)
    updates.references_text = data.references_text;

  const { error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", postId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  return { success: true };
}

export async function updatePostStatus(postId: string, status: string, orgId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("posts")
    .update({ status })
    .eq("id", postId);

  if (error) return { error: error.message };

  const { syncTasksForPost } = await import("@/lib/task-sync");
  await syncTasksForPost(supabase, postId);

  revalidatePath(`/org/${orgId}/grilla`);
  return { success: true };
}

export async function registerPostAsset(
  postId: string,
  _orgId: string,
  data: {
    file_url: string;
    file_name: string;
    file_type: string;
    sort_order: number;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: asset, error } = await supabase
    .from("post_assets")
    .insert({
      post_id: postId,
      file_url: data.file_url,
      file_name: data.file_name,
      file_type: data.file_type,
      sort_order: data.sort_order,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const newStatus = await autoUpdatePostStatusFromAssets(supabase, postId);

  return { success: true, asset, newStatus };
}

async function autoUpdatePostStatusFromAssets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string
): Promise<string | null> {
  const [{ data: post }, { count }] = await Promise.all([
    supabase.from("posts").select("status").eq("id", postId).single(),
    supabase
      .from("post_assets")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId),
  ]);

  if (!post) return null;

  const assetCount = count ?? 0;
  let newStatus: string | null = null;

  if (
    assetCount > 0 &&
    ["draft", "brief_ready", "in_design"].includes(post.status)
  ) {
    newStatus = "review";
    await supabase
      .from("posts")
      .update({ status: newStatus })
      .eq("id", postId);
  } else if (assetCount === 0 && post.status === "review") {
    newStatus = "draft";
    await supabase
      .from("posts")
      .update({ status: newStatus })
      .eq("id", postId);
  }

  const { syncTasksForPost } = await import("@/lib/task-sync");
  await syncTasksForPost(supabase, postId);

  return newStatus;
}

export async function deletePostAsset(
  assetId: string,
  postId: string,
  _orgId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: asset, error: fetchError } = await supabase
    .from("post_assets")
    .select("*")
    .eq("id", assetId)
    .eq("post_id", postId)
    .single();

  if (fetchError || !asset) return { error: "Archivo no encontrado" };

  const url = new URL(asset.file_url);
  const storagePath = url.pathname.split("/post-assets/")[1];
  if (storagePath) {
    await supabase.storage.from("post-assets").remove([decodeURIComponent(storagePath)]);
  }

  const { error } = await supabase.from("post_assets").delete().eq("id", assetId);

  if (error) return { error: error.message };

  const newStatus = await autoUpdatePostStatusFromAssets(supabase, postId);

  return { success: true, newStatus };
}

export async function createOrgAssetLink(
  orgId: string,
  data: { category: string; label: string; url: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (membership?.role !== "admin") {
    return { error: "Solo admins pueden agregar links" };
  }

  const { data: maxRow } = await supabase
    .from("org_asset_links")
    .select("sort_order")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: link, error } = await supabase
    .from("org_asset_links")
    .insert({
      organization_id: orgId,
      category: data.category.trim() || "General",
      label: data.label.trim(),
      url: data.url.trim(),
      sort_order: (maxRow?.sort_order ?? -1) + 1,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  return { link };
}

export async function deleteOrgAssetLink(orgId: string, linkId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (membership?.role !== "admin") {
    return { error: "Solo admins pueden eliminar links" };
  }

  const { error } = await supabase
    .from("org_asset_links")
    .delete()
    .eq("id", linkId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  return { success: true };
}
